"""
Blaze Sports Intelligence Feature Implementations

This module contains all feature engineering implementations for the Blaze platform.
Each function transforms raw DataFrames into feature Series with proper validation.

Architecture:
- Functions match YAML feature names exactly
- All functions return pd.Series indexed like input DataFrame
- Handle edge cases and missing data gracefully
- Support rolling windows (30d, 7g formats)
- Implement sport-specific aggregations
"""

import pandas as pd
import numpy as np
from typing import Optional, Dict, Any
import warnings
from datetime import datetime, timedelta


# ==================== CARDINALS BASEBALL FEATURES ====================

def cardinals_batter_xwoba_30d(df: pd.DataFrame) -> pd.Series:
    """
    Expected weighted on-base average for Cardinals batters over 30 days.

    Input columns: batter_id, ts, exit_velocity, launch_angle, sprint_speed
    Output: xwOBA values (0.200-0.600)
    """
    d = df.copy().sort_values(["batter_id", "ts"])

    # Simple xwOBA approximation based on exit velocity and launch angle
    ev = d.get("exit_velocity", pd.Series(0, index=d.index))
    la = d.get("launch_angle", pd.Series(0, index=d.index))

    # Simplified xwOBA calculation (real implementation would use Statcast model)
    xwoba_base = 0.300  # League average baseline
    ev_factor = (ev - 85.0) / 100.0  # Normalize around 85 mph
    la_factor = np.where((la >= 8) & (la <= 32), 0.1, -0.05)  # Sweet spot bonus

    d["xwoba_single"] = (xwoba_base + ev_factor * 0.15 + la_factor).clip(0.150, 0.650)

    # Rolling 30-day average per batter
    d = d.set_index("ts")
    rolling_xwoba = (d.groupby("batter_id")["xwoba_single"]
                     .rolling("30D", min_periods=10)
                     .mean()
                     .reset_index(level=0, drop=True))

    return rolling_xwoba.reindex(df.index).fillna(0.300).clip(0.200, 0.600)


def cardinals_batter_barrel_rate_7g(df: pd.DataFrame) -> pd.Series:
    """
    Percentage of plate appearances resulting in barreled balls over 7 games.

    Input columns: batter_id, game_no, exit_velocity, launch_angle
    Output: Barrel rate percentage (0.0-50.0)
    """
    d = df.copy().sort_values(["batter_id", "game_no"])

    ev = d.get("exit_velocity", pd.Series(0, index=d.index))
    la = d.get("launch_angle", pd.Series(0, index=d.index))

    # Barrel definition: EV >= 98 mph and LA between 26-30 degrees
    d["is_barrel"] = (ev >= 98.0) & (la >= 26.0) & (la <= 30.0)

    # Calculate barrel rate by game
    game_stats = (d.groupby(["batter_id", "game_no"])
                  .agg(barrels=("is_barrel", "sum"),
                       total_pa=("is_barrel", "count"))
                  .reset_index())

    game_stats["barrel_rate"] = (game_stats["barrels"] / game_stats["total_pa"] * 100.0).fillna(0)

    # Rolling 7-game average
    game_stats = game_stats.sort_values(["batter_id", "game_no"])
    game_stats["barrel_rate_7g"] = (game_stats.groupby("batter_id")["barrel_rate"]
                                    .rolling(7, min_periods=3)
                                    .mean()
                                    .reset_index(level=0, drop=True))

    # Broadcast back to original DataFrame
    result = d.merge(game_stats[["batter_id", "game_no", "barrel_rate_7g"]],
                     on=["batter_id", "game_no"], how="left")["barrel_rate_7g"]

    return result.reindex(df.index).fillna(0.0).clip(0.0, 50.0)


def cardinals_batter_chase_rate_below_zone_30d(df: pd.DataFrame) -> pd.Series:
    """
    Rate at which Cardinals batters swing at pitches below strike zone over 30 days.

    Input columns: batter_id, ts, swing, sz_bot, plate_z
    Output: Chase rate percentage (0.0-100.0)
    """
    d = df.copy().sort_values(["batter_id", "ts"])

    plate_z = d.get("plate_z", pd.Series(0, index=d.index))
    sz_bot = d.get("sz_bot", pd.Series(1.5, index=d.index))
    swing = d.get("swing", pd.Series(False, index=d.index)).astype(bool)

    # Define below zone (2 inches below bottom of strike zone)
    below_zone = plate_z < (sz_bot - 2.0/12.0)  # Convert inches to feet
    chase = below_zone & swing

    # Rolling 30-day statistics per batcher
    d = d.set_index("ts")
    d["below_zone"] = below_zone
    d["chase"] = chase

    g = d.groupby("batter_id")
    pitches_below = g["below_zone"].rolling("30D", min_periods=20).sum().reset_index(level=0, drop=True)
    chases = g["chase"].rolling("30D", min_periods=5).sum().reset_index(level=0, drop=True)

    chase_rate = (chases / pitches_below * 100.0).fillna(0.0)

    return chase_rate.reindex(df.index).clip(0.0, 100.0)


def cardinals_batter_clutch_performance_season(df: pd.DataFrame) -> pd.Series:
    """
    Cardinals batter performance in high-leverage situations during season.

    Input columns: batter_id, leverage_index, win_probability_added
    Output: Clutch performance score (-2.0 to 2.0)
    """
    d = df.copy()

    leverage = d.get("leverage_index", pd.Series(1.0, index=d.index))
    wpa = d.get("win_probability_added", pd.Series(0.0, index=d.index))

    # Define high-leverage situations (LI > 1.5)
    high_leverage = leverage > 1.5
    clutch_wpa = wpa.where(high_leverage, np.nan)

    # Season average clutch performance per batter
    clutch_performance = (d.groupby("batter_id")
                         .apply(lambda g: g.loc[g.index, "win_probability_added"]
                               .where(g["leverage_index"] > 1.5).mean())
                         .reindex(d["batter_id"]))

    return clutch_performance.reindex(df.index).fillna(0.0).clip(-2.0, 2.0)


def cardinals_batter_sprint_speed_percentile(df: pd.DataFrame) -> pd.Series:
    """
    Cardinals batter sprint speed percentile ranking for season.

    Input columns: batter_id, sprint_speed
    Output: Percentile ranking (0.0-100.0)
    """
    d = df.copy()
    sprint_speed = d.get("sprint_speed", pd.Series(25.0, index=d.index))

    # Season best sprint speed per batter
    season_speed = d.groupby("batter_id")["sprint_speed"].max()

    # Calculate percentiles within league
    percentiles = season_speed.rank(pct=True) * 100.0

    # Broadcast to all rows
    result = d["batter_id"].map(percentiles)

    return result.reindex(df.index).fillna(50.0).clip(0.0, 100.0)


# ==================== CARDINALS PITCHING FEATURES ====================

def cardinals_pitcher_whiff_rate_15d(df: pd.DataFrame) -> pd.Series:
    """
    Cardinals pitcher swing-and-miss rate over 15 days.

    Input columns: pitcher_id, ts, swing, whiff
    Output: Whiff rate percentage (0.0-60.0)
    """
    d = df.copy().sort_values(["pitcher_id", "ts"])

    swing = d.get("swing", pd.Series(False, index=d.index)).astype(bool)
    whiff = d.get("whiff", pd.Series(False, index=d.index)).astype(bool)

    # Rolling 15-day statistics
    d = d.set_index("ts")
    d["swing"] = swing
    d["whiff"] = whiff

    g = d.groupby("pitcher_id")
    swings = g["swing"].rolling("15D", min_periods=10).sum().reset_index(level=0, drop=True)
    whiffs = g["whiff"].rolling("15D", min_periods=3).sum().reset_index(level=0, drop=True)

    whiff_rate = (whiffs / swings * 100.0).fillna(0.0)

    return whiff_rate.reindex(df.index).clip(0.0, 60.0)


def cardinals_pitcher_command_plus_30d(df: pd.DataFrame) -> pd.Series:
    """
    Cardinals pitcher command+ metric over 30 days (100 = league average).

    Input columns: pitcher_id, ts, location_score, called_strike_rate
    Output: Command+ score (50.0-200.0)
    """
    d = df.copy().sort_values(["pitcher_id", "ts"])

    location_score = d.get("location_score", pd.Series(0.5, index=d.index))
    called_strike_rate = d.get("called_strike_rate", pd.Series(0.15, index=d.index))

    # Simplified command calculation
    d["command_raw"] = location_score * 0.6 + called_strike_rate * 0.4

    # Rolling 30-day average
    d = d.set_index("ts")
    command_30d = (d.groupby("pitcher_id")["command_raw"]
                   .rolling("30D", min_periods=15)
                   .mean()
                   .reset_index(level=0, drop=True))

    # Convert to plus metric (normalize to 100)
    command_plus = (command_30d / 0.325) * 100.0  # Assuming 0.325 is league average

    return command_plus.reindex(df.index).fillna(100.0).clip(50.0, 200.0)


def cardinals_bullpen_fatigue_index_3d(df: pd.DataFrame) -> pd.Series:
    """
    Cardinals bullpen fatigue index over 3 days (0=fresh, 1=overworked).

    Input columns: team_id, pitcher_id, ts, role, pitches, back_to_back
    Output: Fatigue index (0.0-1.0)
    """
    d = df.copy()
    d["is_rp"] = (d.get("role", "RP") == "RP")
    d = d.sort_values(["team_id", "pitcher_id", "ts"])

    # Rolling 3-day pitch count for relievers
    r = (d.set_index("ts")
         .groupby(["team_id", "pitcher_id"])
         .apply(lambda g: g["pitches"].rolling("3D", min_periods=1).sum())
         .reset_index(level=[0,1], drop=True))

    # Normalize by capacity (150 pitches over 3 days)
    capacity = 150.0
    load = (r.fillna(0) / capacity).clip(0, 1.0)

    # Back-to-back penalty
    b2b_penalty = (d.get("back_to_back", pd.Series(False, index=d.index))
                   .astype(bool).map({True: 0.15, False: 0.0}))

    fatigue_score = (load + b2b_penalty).clip(0, 1.0)

    # Only apply to relievers
    fatigue_score = fatigue_score.where(d["is_rp"], 0.0)

    return fatigue_score.reindex(df.index)


def cardinals_pitcher_tto_penalty_delta_2to3(df: pd.DataFrame) -> pd.Series:
    """
    Cardinals pitcher performance degradation from 2nd to 3rd time through order.

    Input columns: pitcher_id, season, tto, woba_value
    Output: wOBA delta (-0.200 to 0.300)
    """
    d = df.copy()

    if "season" not in d.columns:
        d["season"] = pd.to_datetime(d["ts"]).dt.year

    # Calculate mean wOBA by pitcher, season, and times through order
    woba_by_tto = (d.groupby(["pitcher_id", "season", "tto"])["woba_value"]
                   .mean().unstack("tto", fill_value=np.nan))

    # Calculate delta from 2nd to 3rd time through
    if 2 in woba_by_tto.columns and 3 in woba_by_tto.columns:
        tto_delta = (woba_by_tto[3] - woba_by_tto[2]).rename("tto_delta")
    else:
        tto_delta = pd.Series(0.0, index=woba_by_tto.index, name="tto_delta")

    # Broadcast back to original DataFrame
    result = (d.set_index(["pitcher_id", "season"])
              .join(tto_delta)
              .reset_index(drop=True)["tto_delta"])

    return result.reindex(df.index).fillna(0.0).clip(-0.200, 0.300)


def cardinals_pitcher_stuff_plus_rolling_7g(df: pd.DataFrame) -> pd.Series:
    """
    Cardinals pitcher Stuff+ rating over last 7 games (100 = average).

    Input columns: pitcher_id, game_no, velocity, spin_rate, movement
    Output: Stuff+ score (60.0-180.0)
    """
    d = df.copy().sort_values(["pitcher_id", "game_no"])

    velocity = d.get("velocity", pd.Series(92.0, index=d.index))
    spin_rate = d.get("spin_rate", pd.Series(2200, index=d.index))
    movement = d.get("movement", pd.Series(10.0, index=d.index))

    # Simplified Stuff+ calculation
    vel_component = (velocity - 92.0) / 5.0  # Normalize around 92 mph
    spin_component = (spin_rate - 2200) / 300.0  # Normalize around 2200 rpm
    movement_component = (movement - 10.0) / 5.0  # Normalize around 10 inches

    d["stuff_raw"] = 100.0 + (vel_component + spin_component + movement_component) * 20.0

    # Rolling 7-game average
    stuff_7g = (d.groupby("pitcher_id")["stuff_raw"]
                .rolling(7, min_periods=3)
                .mean()
                .reset_index(level=0, drop=True))

    return stuff_7g.reindex(df.index).fillna(100.0).clip(60.0, 180.0)


# ==================== TITANS FOOTBALL FEATURES ====================

def titans_qb_pressure_to_sack_rate_adj_4g(df: pd.DataFrame) -> pd.Series:
    """
    Titans QB pressure-to-sack rate over 4 games, adjusted for opponent strength.

    Input columns: qb_id, game_no, pressure, sack, opp_pass_block_win_rate
    Output: Adjusted sack rate (0.0-1.0)
    """
    d = df.copy().sort_values(["qb_id", "game_no"])

    # Aggregate by game
    per_game = (d.groupby(["qb_id", "game_no"])
                .agg(pressures=("pressure", "sum"),
                     sacks=("sack", "sum"),
                     opp_pbwr=("opp_pass_block_win_rate", "mean"))
                .reset_index())

    per_game["raw_sack_rate"] = (per_game["sacks"] /
                                per_game["pressures"].replace(0, np.nan)).clip(0, 1)

    # Rolling 4-game averages
    per_game = per_game.sort_values(["qb_id", "game_no"])
    per_game["raw_4g"] = (per_game.groupby("qb_id")["raw_sack_rate"]
                          .rolling(4, min_periods=2).mean()
                          .reset_index(level=0, drop=True))
    per_game["opp_4g"] = (per_game.groupby("qb_id")["opp_pbwr"]
                          .rolling(4, min_periods=2).mean()
                          .reset_index(level=0, drop=True))

    # Adjust for opponent strength
    per_game["adj_sack_rate"] = (per_game["raw_4g"] / per_game["opp_4g"]).clip(0, 1)

    # Broadcast back to play level
    result = d.merge(per_game[["qb_id", "game_no", "adj_sack_rate"]],
                     on=["qb_id", "game_no"], how="left")["adj_sack_rate"]

    return result.reindex(df.index).fillna(0.0)


def titans_qb_epa_per_play_clean_pocket_5g(df: pd.DataFrame) -> pd.Series:
    """
    Titans QB EPA per play when pocket is clean over 5 games.

    Input columns: qb_id, game_no, pressure, expected_points_added
    Output: Clean pocket EPA (-1.0 to 1.5)
    """
    d = df.copy().sort_values(["qb_id", "game_no"])

    pressure = d.get("pressure", pd.Series(False, index=d.index)).astype(bool)
    epa = d.get("expected_points_added", pd.Series(0.0, index=d.index))

    # Filter to clean pocket plays only
    clean_pocket_epa = epa.where(~pressure, np.nan)
    d["clean_pocket_epa"] = clean_pocket_epa

    # Game-level averages
    per_game = (d.groupby(["qb_id", "game_no"])["clean_pocket_epa"]
                .mean().reset_index())

    # Rolling 5-game average
    per_game = per_game.sort_values(["qb_id", "game_no"])
    per_game["clean_epa_5g"] = (per_game.groupby("qb_id")["clean_pocket_epa"]
                                .rolling(5, min_periods=2).mean()
                                .reset_index(level=0, drop=True))

    # Broadcast back
    result = d.merge(per_game[["qb_id", "game_no", "clean_epa_5g"]],
                     on=["qb_id", "game_no"], how="left")["clean_epa_5g"]

    return result.reindex(df.index).fillna(0.0).clip(-1.0, 1.5)


def titans_rb_yards_after_contact_per_attempt_3g(df: pd.DataFrame) -> pd.Series:
    """
    Titans RB yards after contact per attempt over 3 games.

    Input columns: rb_id, game_no, rushing_yards, yards_before_contact
    Output: YAC per attempt (0.0-8.0)
    """
    d = df.copy().sort_values(["rb_id", "game_no"])

    rushing_yards = d.get("rushing_yards", pd.Series(0, index=d.index))
    yards_before_contact = d.get("yards_before_contact", pd.Series(0, index=d.index))

    # Calculate yards after contact
    d["yac"] = (rushing_yards - yards_before_contact).clip(lower=0)

    # Game-level averages
    per_game = (d.groupby(["rb_id", "game_no"])["yac"]
                .mean().reset_index())

    # Rolling 3-game average
    per_game = per_game.sort_values(["rb_id", "game_no"])
    per_game["yac_3g"] = (per_game.groupby("rb_id")["yac"]
                          .rolling(3, min_periods=1).mean()
                          .reset_index(level=0, drop=True))

    result = d.merge(per_game[["rb_id", "game_no", "yac_3g"]],
                     on=["rb_id", "game_no"], how="left")["yac_3g"]

    return result.reindex(df.index).fillna(0.0).clip(0.0, 8.0)


def titans_oline_pass_block_win_rate_season(df: pd.DataFrame) -> pd.Series:
    """
    Titans offensive line pass blocking win rate for season.

    Input columns: oline_unit_id, pass_block_win
    Output: Pass block win rate percentage (30.0-85.0)
    """
    d = df.copy()

    pass_block_win = d.get("pass_block_win", pd.Series(False, index=d.index)).astype(bool)

    # Season-long win rate by O-line unit
    win_rate = (d.groupby("oline_unit_id")["pass_block_win"]
                .mean() * 100.0)

    # Broadcast to all plays
    result = d["oline_unit_id"].map(win_rate)

    return result.reindex(df.index).fillna(50.0).clip(30.0, 85.0)


def titans_hidden_yardage_per_drive_5g(df: pd.DataFrame) -> pd.Series:
    """
    Titans hidden yardage per drive over 5 games.

    Input columns: offense_team, game_no, drive_id, start_yardline, expected_start,
                   return_yards, penalty_yards
    Output: Hidden yardage per drive (-30.0 to 30.0)
    """
    d = df.copy().sort_values(["offense_team", "game_no", "drive_id"])

    start_yl = d.get("start_yardline", pd.Series(25, index=d.index))
    expected_start = d.get("expected_start", pd.Series(25, index=d.index))
    return_yards = d.get("return_yards", pd.Series(0, index=d.index)).fillna(0)
    penalty_yards = d.get("penalty_yards", pd.Series(0, index=d.index)).fillna(0)

    # Calculate hidden yardage per drive
    d["hidden_yardage"] = ((start_yl - expected_start) +
                          return_yards - penalty_yards)

    # Game-level averages
    per_game = (d.groupby(["offense_team", "game_no"])["hidden_yardage"]
                .mean().reset_index())

    # Rolling 5-game average
    per_game = per_game.sort_values(["offense_team", "game_no"])
    per_game["hidden_5g"] = (per_game.groupby("offense_team")["hidden_yardage"]
                             .rolling(5, min_periods=2).mean()
                             .reset_index(level=0, drop=True))

    result = d.merge(per_game[["offense_team", "game_no", "hidden_5g"]],
                     on=["offense_team", "game_no"], how="left")["hidden_5g"]

    return result.reindex(df.index).fillna(0.0).clip(-30.0, 30.0)


# ==================== GRIZZLIES BASKETBALL FEATURES ====================

def grizzlies_player_defensive_rating_10g(df: pd.DataFrame) -> pd.Series:
    """
    Grizzlies player defensive rating over 10 games (points allowed per 100 possessions).

    Input columns: player_id, game_no, def_possessions, points_allowed
    Output: Defensive rating (80.0-130.0)
    """
    d = df.copy().sort_values(["player_id", "game_no"])

    # Game-level defensive rating
    per_game = (d.groupby(["player_id", "game_no"])
                .agg(poss=("def_possessions", "sum"),
                     pts=("points_allowed", "sum"))
                .reset_index())

    per_game["def_rating"] = (per_game["pts"] / per_game["poss"] * 100.0).fillna(100.0)

    # Rolling 10-game average
    per_game = per_game.sort_values(["player_id", "game_no"])
    per_game["def_rating_10g"] = (per_game.groupby("player_id")["def_rating"]
                                   .rolling(10, min_periods=5)
                                   .mean()
                                   .reset_index(level=0, drop=True))

    result = d.merge(per_game[["player_id", "game_no", "def_rating_10g"]],
                     on=["player_id", "game_no"], how="left")["def_rating_10g"]

    return result.reindex(df.index).fillna(100.0).clip(80.0, 130.0)


def grizzlies_player_grit_grind_score_season(df: pd.DataFrame) -> pd.Series:
    """
    Grizzlies-specific Grit and Grind defensive intensity score.

    Input columns: player_id, charges_drawn, contested_shots, deflections, hustle_plays
    Output: Grit-Grind score (0.0-100.0)
    """
    d = df.copy()

    # Components of Grit and Grind
    charges = d.get("charges_drawn", pd.Series(0, index=d.index))
    contested = d.get("contested_shots", pd.Series(0, index=d.index))
    deflections = d.get("deflections", pd.Series(0, index=d.index))
    hustle = d.get("hustle_plays", pd.Series(0, index=d.index))

    # Weighted score per possession
    d["grit_score"] = (
        charges * 3.0 +         # Charges are high-effort plays
        contested * 0.5 +       # Contesting shots
        deflections * 1.5 +     # Active hands
        hustle * 2.0            # Hustle plays (loose balls, etc)
    )

    # Season average per player
    season_grit = (d.groupby("player_id")["grit_score"]
                   .mean()
                   .rank(pct=True) * 100.0)

    result = d["player_id"].map(season_grit)

    return result.reindex(df.index).fillna(50.0).clip(0.0, 100.0)


def grizzlies_lineup_net_rating_5g(df: pd.DataFrame) -> pd.Series:
    """
    Grizzlies lineup net rating over 5 games.

    Input columns: lineup_id, game_no, off_rating, def_rating
    Output: Net rating (-50.0 to 50.0)
    """
    d = df.copy().sort_values(["lineup_id", "game_no"])

    off_rating = d.get("off_rating", pd.Series(100.0, index=d.index))
    def_rating = d.get("def_rating", pd.Series(100.0, index=d.index))

    d["net_rating"] = off_rating - def_rating

    # Game-level averages
    per_game = (d.groupby(["lineup_id", "game_no"])["net_rating"]
                .mean().reset_index())

    # Rolling 5-game average
    per_game = per_game.sort_values(["lineup_id", "game_no"])
    per_game["net_rating_5g"] = (per_game.groupby("lineup_id")["net_rating"]
                                  .rolling(5, min_periods=2)
                                  .mean()
                                  .reset_index(level=0, drop=True))

    result = d.merge(per_game[["lineup_id", "game_no", "net_rating_5g"]],
                     on=["lineup_id", "game_no"], how="left")["net_rating_5g"]

    return result.reindex(df.index).fillna(0.0).clip(-50.0, 50.0)


def grizzlies_player_clutch_shooting_season(df: pd.DataFrame) -> pd.Series:
    """
    Grizzlies player shooting efficiency in clutch situations.

    Input columns: player_id, clutch_situation, fg_attempt, fg_made, shot_value
    Output: Clutch eFG% (20.0-80.0)
    """
    d = df.copy()

    clutch = d.get("clutch_situation", pd.Series(False, index=d.index)).astype(bool)
    fg_made = d.get("fg_made", pd.Series(False, index=d.index)).astype(bool)
    shot_value = d.get("shot_value", pd.Series(2, index=d.index))  # 2 or 3 pointer

    # Filter to clutch situations only
    d["clutch_points"] = fg_made.where(clutch, 0) * shot_value
    d["clutch_attempts"] = clutch.astype(int)

    # Season clutch eFG% per player
    clutch_stats = (d.groupby("player_id")
                    .agg(points=("clutch_points", "sum"),
                         attempts=("clutch_attempts", "sum"))
                    .query("attempts > 10"))

    # Effective FG% = (FG + 0.5 * 3P) / FGA
    # Simplified as points / (attempts * 2) for eFG%
    clutch_stats["clutch_efg"] = (clutch_stats["points"] /
                                  (clutch_stats["attempts"] * 2) * 100.0)

    result = d["player_id"].map(clutch_stats["clutch_efg"])

    return result.reindex(df.index).fillna(45.0).clip(20.0, 80.0)


def grizzlies_player_load_management_index(df: pd.DataFrame) -> pd.Series:
    """
    Grizzlies player fatigue and load management index.

    Input columns: player_id, ts, minutes_played, distance_covered, accelerations
    Output: Load index (0.0-1.0, higher = more fatigued)
    """
    d = df.copy().sort_values(["player_id", "ts"])

    minutes = d.get("minutes_played", pd.Series(0, index=d.index))
    distance = d.get("distance_covered", pd.Series(0, index=d.index))
    accels = d.get("accelerations", pd.Series(0, index=d.index))

    # Compute load score
    d["load_score"] = (
        minutes / 48.0 * 0.4 +          # Minutes as % of full game
        distance / 5000.0 * 0.3 +       # Distance in meters
        accels / 100.0 * 0.3            # High-intensity accelerations
    )

    # 7-day rolling load
    d = d.set_index("ts")
    load_7d = (d.groupby("player_id")["load_score"]
               .rolling("7D", min_periods=3)
               .mean()
               .reset_index(level=0, drop=True))

    return load_7d.reindex(df.index).fillna(0.3).clip(0.0, 1.0)


# ==================== LONGHORNS COLLEGE FEATURES ====================

def longhorns_qb_passing_efficiency_rating_3g(df: pd.DataFrame) -> pd.Series:
    """
    Longhorns QB passing efficiency rating over 3 games (NCAA formula).

    Input columns: qb_id, game_no, completions, attempts, yards, touchdowns, interceptions
    Output: Passer rating (0.0-200.0)
    """
    d = df.copy().sort_values(["qb_id", "game_no"])

    # Game-level stats
    per_game = (d.groupby(["qb_id", "game_no"])
                .agg(comp=("completions", "sum"),
                     att=("attempts", "sum"),
                     yds=("yards", "sum"),
                     td=("touchdowns", "sum"),
                     int=("interceptions", "sum"))
                .reset_index())

    # NCAA passer rating formula
    per_game["comp_pct"] = (per_game["comp"] / per_game["att"].replace(0, np.nan) * 100.0)
    per_game["ypa"] = per_game["yds"] / per_game["att"].replace(0, np.nan)
    per_game["td_pct"] = per_game["td"] / per_game["att"].replace(0, np.nan) * 100.0
    per_game["int_pct"] = per_game["int"] / per_game["att"].replace(0, np.nan) * 100.0

    # Passer rating = ((8.4 * YDS) + (330 * TD) - (200 * INT) + (100 * COMP)) / ATT
    per_game["passer_rating"] = (
        ((8.4 * per_game["yds"]) +
         (330 * per_game["td"]) -
         (200 * per_game["int"]) +
         (100 * per_game["comp"])) / per_game["att"]
    ).fillna(0.0)

    # Rolling 3-game average
    per_game = per_game.sort_values(["qb_id", "game_no"])
    per_game["rating_3g"] = (per_game.groupby("qb_id")["passer_rating"]
                             .rolling(3, min_periods=1)
                             .mean()
                             .reset_index(level=0, drop=True))

    result = d.merge(per_game[["qb_id", "game_no", "rating_3g"]],
                     on=["qb_id", "game_no"], how="left")["rating_3g"]

    return result.reindex(df.index).fillna(100.0).clip(0.0, 200.0)


def longhorns_rb_breakaway_run_rate_5g(df: pd.DataFrame) -> pd.Series:
    """
    Longhorns RB breakaway run rate (15+ yard runs) over 5 games.

    Input columns: rb_id, game_no, rushing_yards, is_breakaway
    Output: Breakaway rate percentage (0.0-50.0)
    """
    d = df.copy().sort_values(["rb_id", "game_no"])

    is_breakaway = d.get("is_breakaway",
                        d.get("rushing_yards", pd.Series(0, index=d.index)) >= 15)

    # Game-level breakaway rate
    per_game = (d.groupby(["rb_id", "game_no"])
                .agg(breakaways=("is_breakaway", "sum"),
                     total_runs=("is_breakaway", "count"))
                .reset_index())

    per_game["breakaway_rate"] = (per_game["breakaways"] /
                                  per_game["total_runs"].replace(0, np.nan) * 100.0)

    # Rolling 5-game average
    per_game = per_game.sort_values(["rb_id", "game_no"])
    per_game["breakaway_5g"] = (per_game.groupby("rb_id")["breakaway_rate"]
                                .rolling(5, min_periods=2)
                                .mean()
                                .reset_index(level=0, drop=True))

    result = d.merge(per_game[["rb_id", "game_no", "breakaway_5g"]],
                     on=["rb_id", "game_no"], how="left")["breakaway_5g"]

    return result.reindex(df.index).fillna(5.0).clip(0.0, 50.0)


def longhorns_nil_valuation_index(df: pd.DataFrame) -> pd.Series:
    """
    Longhorns player NIL valuation index based on performance and social metrics.

    Input columns: player_id, touchdowns, all_purpose_yards, social_followers,
                   media_mentions, game_impact_score
    Output: NIL index (0.0-100.0)
    """
    d = df.copy()

    # Performance metrics
    touchdowns = d.get("touchdowns", pd.Series(0, index=d.index))
    yards = d.get("all_purpose_yards", pd.Series(0, index=d.index))
    impact = d.get("game_impact_score", pd.Series(0.5, index=d.index))

    # Social metrics
    followers = d.get("social_followers", pd.Series(1000, index=d.index))
    mentions = d.get("media_mentions", pd.Series(0, index=d.index))

    # NIL valuation formula
    d["nil_score"] = (
        (touchdowns * 10000) +                    # TD value
        (yards * 50) +                            # Yards value
        (impact * 20000) +                        # Game impact
        (np.log10(followers + 1) * 5000) +       # Social reach (log scale)
        (mentions * 1000)                        # Media presence
    )

    # Convert to percentile ranking
    nil_percentile = d.groupby("player_id")["nil_score"].mean().rank(pct=True) * 100.0

    result = d["player_id"].map(nil_percentile)

    return result.reindex(df.index).fillna(50.0).clip(0.0, 100.0)


# ==================== ADVANCED SABERMETRICS ====================

def calculate_woba(df: pd.DataFrame) -> pd.Series:
    """
    Calculate weighted on-base average (wOBA) using linear weights.

    Input columns: bb, hbp, single, double, triple, hr, ab, sf
    Output: wOBA (0.000-1.000)
    """
    d = df.copy()

    # 2024 linear weights (approximate)
    wBB = 0.690
    wHBP = 0.720
    w1B = 0.880
    w2B = 1.240
    w3B = 1.560
    wHR = 2.000

    bb = d.get("bb", pd.Series(0, index=d.index))
    hbp = d.get("hbp", pd.Series(0, index=d.index))
    single = d.get("single", pd.Series(0, index=d.index))
    double = d.get("double", pd.Series(0, index=d.index))
    triple = d.get("triple", pd.Series(0, index=d.index))
    hr = d.get("hr", pd.Series(0, index=d.index))
    ab = d.get("ab", pd.Series(0, index=d.index))
    sf = d.get("sf", pd.Series(0, index=d.index))

    numerator = (wBB * bb + wHBP * hbp + w1B * single +
                w2B * double + w3B * triple + wHR * hr)
    denominator = ab + bb - hbp + sf

    woba = (numerator / denominator.replace(0, np.nan)).fillna(0.320)

    return woba.clip(0.000, 1.000)


def calculate_fip(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Fielding Independent Pitching (FIP).

    Input columns: hr, bb, hbp, k, ip
    Output: FIP (1.00-7.00)
    """
    d = df.copy()

    hr = d.get("hr", pd.Series(0, index=d.index))
    bb = d.get("bb", pd.Series(0, index=d.index))
    hbp = d.get("hbp", pd.Series(0, index=d.index))
    k = d.get("k", pd.Series(0, index=d.index))
    ip = d.get("ip", pd.Series(1, index=d.index))

    # FIP constant (league average ERA - league average FIP)
    cFIP = 3.10

    fip = ((13 * hr + 3 * (bb + hbp) - 2 * k) / ip.replace(0, np.nan) + cFIP).fillna(4.50)

    return fip.clip(1.00, 7.00)


def calculate_xfip(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Expected Fielding Independent Pitching (xFIP).

    Input columns: fly_balls, bb, hbp, k, ip
    Output: xFIP (1.00-7.00)
    """
    d = df.copy()

    fb = d.get("fly_balls", pd.Series(0, index=d.index))
    bb = d.get("bb", pd.Series(0, index=d.index))
    hbp = d.get("hbp", pd.Series(0, index=d.index))
    k = d.get("k", pd.Series(0, index=d.index))
    ip = d.get("ip", pd.Series(1, index=d.index))

    # League average HR/FB rate
    league_hr_fb = 0.105

    # Expected home runs
    xHR = fb * league_hr_fb

    # xFIP constant
    cFIP = 3.10

    xfip = ((13 * xHR + 3 * (bb + hbp) - 2 * k) / ip.replace(0, np.nan) + cFIP).fillna(4.50)

    return xfip.clip(1.00, 7.00)


# ==================== FOOTBALL ADVANCED METRICS ====================

def calculate_epa(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Expected Points Added (EPA) per play.

    Input columns: down, distance, yard_line, play_result, next_down,
                   next_distance, next_yard_line
    Output: EPA (-7.0 to 7.0)
    """
    d = df.copy()

    # Simplified EP model (would use full model in production)
    def expected_points(down, distance, yard_line):
        if pd.isna(down) or pd.isna(yard_line):
            return 0.0

        # Field position value (simplified)
        fp_value = (yard_line - 50) / 50.0 * 3.0

        # Down and distance value
        if down == 1:
            dd_value = 0.5
        elif down == 2:
            dd_value = 0.3 if distance < 7 else 0.1
        elif down == 3:
            dd_value = 0.1 if distance < 4 else -0.2
        else:  # 4th down
            dd_value = -0.5 if distance > 1 else 0.3

        return fp_value + dd_value

    # Calculate EP before and after play
    ep_before = d.apply(lambda r: expected_points(r.get("down"),
                                                 r.get("distance"),
                                                 r.get("yard_line")), axis=1)

    ep_after = d.apply(lambda r: expected_points(r.get("next_down"),
                                                r.get("next_distance"),
                                                r.get("next_yard_line")), axis=1)

    # EPA = EP after - EP before
    epa = ep_after - ep_before

    return epa.clip(-7.0, 7.0)


def calculate_dvoa(df: pd.DataFrame) -> pd.Series:
    """
    Calculate Defense-adjusted Value Over Average (DVOA).

    Input columns: yards_gained, play_type, down, distance, opponent_def_rank
    Output: DVOA percentage (-100.0 to 100.0)
    """
    d = df.copy()

    yards = d.get("yards_gained", pd.Series(0, index=d.index))
    play_type = d.get("play_type", pd.Series("run", index=d.index))
    down = d.get("down", pd.Series(1, index=d.index))
    distance = d.get("distance", pd.Series(10, index=d.index))
    def_rank = d.get("opponent_def_rank", pd.Series(16, index=d.index))

    # Expected yards based on down and distance
    expected_yards = np.where(down == 1, distance * 0.45,
                             np.where(down == 2, distance * 0.60,
                                    np.where(down == 3, distance * 0.85,
                                           distance * 1.0)))

    # Success value
    success_value = (yards - expected_yards) / expected_yards

    # Adjust for opponent defense (1-32 ranking)
    def_adjustment = (def_rank - 16.5) / 16.5 * 0.2  # +/- 20% adjustment

    dvoa = (success_value * (1 + def_adjustment)) * 100.0

    return dvoa.clip(-100.0, 100.0)


# ==================== ADDITIONAL FEATURE IMPLEMENTATIONS ====================

def validate_feature_output(feature_name: str, output: pd.Series,
                           expected_min: float, expected_max: float,
                           allow_null: bool = True) -> pd.Series:
    """
    Validate feature output against expected bounds and constraints.

    Args:
        feature_name: Name of the feature for error reporting
        output: Feature values to validate
        expected_min: Minimum allowed value
        expected_max: Maximum allowed value
        allow_null: Whether null values are permitted

    Returns:
        Validated and clipped feature series
    """
    if not allow_null and output.isnull().any():
        warnings.warn(f"Feature {feature_name} contains null values when none allowed")
        output = output.fillna(output.median())

    # Clip to expected bounds
    clipped = output.clip(expected_min, expected_max)

    if not clipped.equals(output):
        n_clipped = (output != clipped).sum()
        warnings.warn(f"Feature {feature_name}: {n_clipped} values clipped to bounds "
                     f"[{expected_min}, {expected_max}]")

    return clipped


# ==================== CROSS-SPORT ANALYTICS ====================

def cross_sport_athlete_versatility_index(df: pd.DataFrame) -> pd.Series:
    """
    Calculate athlete versatility across multiple sports/positions.

    Input columns: athlete_id, sport, position, performance_score,
                   games_played, skill_diversity
    Output: Versatility index (0.0-100.0)
    """
    d = df.copy()

    # Count unique sports and positions per athlete
    athlete_diversity = (d.groupby("athlete_id")
                        .agg(sports_count=("sport", "nunique"),
                             positions_count=("position", "nunique"),
                             total_games=("games_played", "sum"),
                             avg_performance=("performance_score", "mean"),
                             skill_div=("skill_diversity", "mean")))

    # Versatility scoring
    versatility = (
        athlete_diversity["sports_count"] * 20 +
        athlete_diversity["positions_count"] * 10 +
        athlete_diversity["avg_performance"] * 50 +
        athlete_diversity["skill_div"] * 20
    ).clip(0, 100)

    result = d["athlete_id"].map(versatility)

    return result.reindex(df.index).fillna(50.0).clip(0.0, 100.0)


def injury_risk_prediction_score(df: pd.DataFrame) -> pd.Series:
    """
    Multi-sport injury risk prediction based on workload and biomechanics.

    Input columns: player_id, acute_workload, chronic_workload,
                   biomechanical_stress, previous_injuries, age
    Output: Risk score (0.0-1.0)
    """
    d = df.copy()

    # ACWR (Acute:Chronic Workload Ratio)
    acute = d.get("acute_workload", pd.Series(100, index=d.index))
    chronic = d.get("chronic_workload", pd.Series(100, index=d.index))
    acwr = (acute / chronic.replace(0, np.nan)).fillna(1.0)

    # Risk factors
    bio_stress = d.get("biomechanical_stress", pd.Series(0.5, index=d.index))
    prev_injuries = d.get("previous_injuries", pd.Series(0, index=d.index))
    age = d.get("age", pd.Series(25, index=d.index))

    # Injury risk calculation
    risk = (
        np.where((acwr < 0.8) | (acwr > 1.3), 0.3, 0.0) +  # ACWR danger zones
        bio_stress * 0.3 +                                   # Biomechanical load
        (prev_injuries / 10.0) * 0.2 +                      # Injury history
        np.where(age > 30, 0.2, 0.0)                        # Age factor
    ).clip(0, 1)

    return pd.Series(risk, index=df.index)


def performance_trajectory_slope(df: pd.DataFrame) -> pd.Series:
    """
    Calculate performance trajectory using regression slope.

    Input columns: player_id, ts, performance_metric, games_played
    Output: Trajectory slope (-1.0 to 1.0)
    """
    d = df.copy().sort_values(["player_id", "ts"])

    # Convert timestamp to numeric for regression
    d["days_since_start"] = (pd.to_datetime(d["ts"]) -
                            pd.to_datetime(d["ts"]).min()).dt.days

    def calculate_slope(group):
        if len(group) < 5:
            return 0.0

        x = group["days_since_start"].values
        y = group["performance_metric"].values

        # Simple linear regression
        x_mean = x.mean()
        y_mean = y.mean()

        numerator = ((x - x_mean) * (y - y_mean)).sum()
        denominator = ((x - x_mean) ** 2).sum()

        if denominator == 0:
            return 0.0

        slope = numerator / denominator

        # Normalize slope to [-1, 1]
        return np.tanh(slope / 100.0)

    trajectories = d.groupby("player_id").apply(calculate_slope)

    result = d["player_id"].map(trajectories)

    return result.reindex(df.index).fillna(0.0).clip(-1.0, 1.0)


def draft_value_projection(df: pd.DataFrame) -> pd.Series:
    """
    Project draft value across sports using performance and potential.

    Input columns: player_id, age, performance_percentile,
                   ceiling_projection, floor_projection, injury_risk
    Output: Draft value score (0.0-100.0)
    """
    d = df.copy()

    age = d.get("age", pd.Series(21, index=d.index))
    performance = d.get("performance_percentile", pd.Series(50, index=d.index))
    ceiling = d.get("ceiling_projection", pd.Series(75, index=d.index))
    floor = d.get("floor_projection", pd.Series(25, index=d.index))
    injury_risk = d.get("injury_risk", pd.Series(0.2, index=d.index))

    # Age adjustment (younger players have more upside)
    age_factor = np.where(age <= 20, 1.2,
                         np.where(age <= 22, 1.0,
                                np.where(age <= 24, 0.9, 0.8)))

    # Draft value calculation
    value = (
        performance * 0.4 +                           # Current performance
        ceiling * 0.3 * age_factor +                 # Upside potential
        floor * 0.2 +                                # Safety/floor
        (1 - injury_risk) * 10                      # Health bonus
    ).clip(0, 100)

    return pd.Series(value, index=df.index)


# ==================== REAL-TIME PROCESSING OPTIMIZATIONS ====================

def optimized_rolling_calculation(df: pd.DataFrame,
                                 groupby_col: str,
                                 value_col: str,
                                 window: str,
                                 min_periods: int = 1,
                                 agg_func: str = 'mean') -> pd.Series:
    """
    Optimized rolling window calculation with caching.

    Args:
        df: Input DataFrame
        groupby_col: Column to group by
        value_col: Column to calculate on
        window: Window specification (e.g., '30D', '7G')
        min_periods: Minimum periods for calculation
        agg_func: Aggregation function ('mean', 'sum', 'std')

    Returns:
        Calculated rolling values
    """
    # Sort for temporal consistency
    d = df.copy().sort_values([groupby_col, 'ts'] if 'ts' in df.columns else [groupby_col])

    # Set index for rolling
    if 'ts' in d.columns and 'D' in window:
        d = d.set_index('ts')

    # Apply rolling calculation
    grouped = d.groupby(groupby_col)[value_col]

    if agg_func == 'mean':
        result = grouped.rolling(window, min_periods=min_periods).mean()
    elif agg_func == 'sum':
        result = grouped.rolling(window, min_periods=min_periods).sum()
    elif agg_func == 'std':
        result = grouped.rolling(window, min_periods=min_periods).std()
    else:
        raise ValueError(f"Unsupported aggregation function: {agg_func}")

    # Reset index if needed
    if isinstance(result.index, pd.MultiIndex):
        result = result.reset_index(level=0, drop=True)

    return result.reindex(df.index)


def parallel_feature_computation(df: pd.DataFrame,
                               features: list,
                               n_jobs: int = -1) -> pd.DataFrame:
    """
    Compute multiple features in parallel using joblib.

    Args:
        df: Input DataFrame
        features: List of feature names to compute
        n_jobs: Number of parallel jobs (-1 for all cores)

    Returns:
        DataFrame with computed features
    """
    from joblib import Parallel, delayed

    def compute_single_feature(feature_name, data):
        try:
            if feature_name in FEATURE_IMPLEMENTATIONS:
                return feature_name, FEATURE_IMPLEMENTATIONS[feature_name](data)
            else:
                return feature_name, pd.Series(np.nan, index=data.index)
        except Exception as e:
            warnings.warn(f"Failed to compute {feature_name}: {str(e)}")
            return feature_name, pd.Series(np.nan, index=data.index)

    # Parallel computation
    results = Parallel(n_jobs=n_jobs)(
        delayed(compute_single_feature)(feat, df) for feat in features
    )

    # Combine results
    feature_df = pd.DataFrame(index=df.index)
    for feature_name, feature_values in results:
        feature_df[feature_name] = feature_values

    return feature_df


def incremental_update(existing_features: pd.DataFrame,
                      new_data: pd.DataFrame,
                      feature_list: list,
                      lookback_days: int = 30) -> pd.DataFrame:
    """
    Incrementally update features with new data.

    Args:
        existing_features: Previously computed features
        new_data: New incoming data
        feature_list: Features to update
        lookback_days: Days of historical context needed

    Returns:
        Updated feature DataFrame
    """
    # Get relevant historical data for context
    if 'ts' in new_data.columns:
        min_date = pd.to_datetime(new_data['ts']).min() - pd.Timedelta(days=lookback_days)

        if 'ts' in existing_features.columns:
            historical = existing_features[
                pd.to_datetime(existing_features['ts']) >= min_date
            ]
        else:
            historical = existing_features.tail(lookback_days * 100)  # Approximate
    else:
        historical = existing_features.tail(lookback_days * 100)

    # Combine historical and new data
    combined = pd.concat([historical, new_data], ignore_index=True)

    # Compute features on combined data
    updated_features = parallel_feature_computation(combined, feature_list)

    # Return only the new rows
    n_new = len(new_data)
    return updated_features.tail(n_new)


# ==================== PITCH SEQUENCING & TUNNELING ====================

def pitch_tunneling_score(df: pd.DataFrame) -> pd.Series:
    """
    Calculate pitch tunneling effectiveness based on release point consistency.

    Input columns: pitcher_id, pitch_type, release_x, release_y, release_z,
                   pfx_x, pfx_z, start_speed
    Output: Tunneling score (0.0-100.0)
    """
    d = df.copy().sort_values(["pitcher_id", "ts"])

    # Group consecutive pitches
    d["pitch_pair"] = d.groupby("pitcher_id").cumcount() // 2

    def calculate_tunnel(group):
        if len(group) < 2:
            return pd.Series(50.0, index=group.index)

        scores = []
        for i in range(len(group) - 1):
            # Release point similarity
            release_diff = np.sqrt(
                (group.iloc[i]["release_x"] - group.iloc[i+1]["release_x"])**2 +
                (group.iloc[i]["release_y"] - group.iloc[i+1]["release_y"])**2 +
                (group.iloc[i]["release_z"] - group.iloc[i+1]["release_z"])**2
            )

            # Movement difference (want this to be large)
            movement_diff = np.sqrt(
                (group.iloc[i]["pfx_x"] - group.iloc[i+1]["pfx_x"])**2 +
                (group.iloc[i]["pfx_z"] - group.iloc[i+1]["pfx_z"])**2
            )

            # Velocity difference
            velo_diff = abs(group.iloc[i]["start_speed"] - group.iloc[i+1]["start_speed"])

            # Tunneling score (similar release, different movement)
            tunnel_score = (
                (1 - min(release_diff / 0.5, 1)) * 40 +      # Release similarity
                min(movement_diff / 2.0, 1) * 40 +            # Movement difference
                (1 - min(velo_diff / 10.0, 1)) * 20          # Speed similarity
            )

            scores.append(tunnel_score)
            scores.append(tunnel_score)  # Apply to both pitches in pair

        if len(group) % 2 == 1:
            scores.append(50.0)  # Default for unpaired pitch

        return pd.Series(scores[:len(group)], index=group.index)

    tunnel_scores = d.groupby("pitcher_id").apply(calculate_tunnel)

    # Flatten if MultiIndex
    if isinstance(tunnel_scores.index, pd.MultiIndex):
        tunnel_scores = tunnel_scores.reset_index(level=0, drop=True)

    return tunnel_scores.reindex(df.index).fillna(50.0).clip(0.0, 100.0)


def pitch_sequence_effectiveness(df: pd.DataFrame) -> pd.Series:
    """
    Evaluate pitch sequencing strategy effectiveness.

    Input columns: pitcher_id, pitch_type, count, result, previous_pitch_type
    Output: Sequence effectiveness score (0.0-100.0)
    """
    d = df.copy().sort_values(["pitcher_id", "ts"])

    # Define effective sequences
    effective_sequences = {
        ('FB', 'CB'): 1.2,  # Fastball to curveball
        ('FB', 'CH'): 1.15, # Fastball to changeup
        ('SL', 'FB'): 1.1,  # Slider to fastball
        ('CB', 'FB'): 1.05, # Curveball to fastball
        ('CH', 'FB'): 1.1,  # Changeup to fastball
    }

    # Count-based adjustments
    count_leverage = {
        '0-2': 1.3,  # Pitcher's count
        '1-2': 1.2,
        '0-0': 1.0,  # Neutral
        '2-0': 0.8,  # Hitter's count
        '3-0': 0.7,
        '3-1': 0.75,
    }

    d["prev_pitch"] = d.groupby("pitcher_id")["pitch_type"].shift(1)
    d["sequence"] = list(zip(d["prev_pitch"].fillna('FB'), d["pitch_type"]))

    # Calculate effectiveness
    base_effectiveness = d["sequence"].map(effective_sequences).fillna(1.0)
    count_modifier = d["count"].map(count_leverage).fillna(1.0)

    # Result-based scoring
    result_score = d["result"].map({
        'strike': 1.0,
        'ball': 0.3,
        'foul': 0.6,
        'in_play_out': 0.9,
        'hit': 0.1
    }).fillna(0.5)

    effectiveness = (base_effectiveness * count_modifier * result_score * 100).clip(0, 100)

    return effectiveness.reindex(df.index).fillna(50.0)


# ==================== STATCAST DATA PROCESSING ====================

def process_statcast_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Process raw Statcast data with derived metrics.

    Input: Raw Statcast DataFrame
    Output: Enhanced DataFrame with computed metrics
    """
    d = df.copy()

    # Exit velocity and launch angle optimizations
    d["barrel"] = ((d["launch_speed"] >= 98) &
                  (d["launch_angle"] >= 26) &
                  (d["launch_angle"] <= 30))

    # Expected batting average based on EV and LA
    d["xBA"] = calculate_xba(d["launch_speed"], d["launch_angle"])

    # Sprint speed percentiles
    if "sprint_speed" in d.columns:
        d["sprint_speed_percentile"] = d["sprint_speed"].rank(pct=True) * 100

    # Pitch quality metrics
    if all(col in d.columns for col in ["release_spin_rate", "release_speed"]):
        d["bauer_units"] = d["release_spin_rate"] / d["release_speed"]

    # Hit probability
    d["hit_distance"] = calculate_hit_distance(
        d.get("launch_speed", 90),
        d.get("launch_angle", 15)
    )

    return d


def calculate_xba(exit_velocity: pd.Series, launch_angle: pd.Series) -> pd.Series:
    """
    Calculate expected batting average from exit velocity and launch angle.

    Simplified model based on Statcast data.
    """
    # Sweet spot indicators
    sweet_spot_la = (launch_angle >= 8) & (launch_angle <= 32)
    high_ev = exit_velocity >= 95

    # Base xBA calculation
    xba = pd.Series(0.200, index=exit_velocity.index)

    # Adjustments
    xba = np.where(sweet_spot_la & high_ev, 0.500, xba)
    xba = np.where(sweet_spot_la & (exit_velocity >= 100), 0.700, xba)
    xba = np.where((launch_angle < -20) | (launch_angle > 50), 0.000, xba)

    return pd.Series(xba, index=exit_velocity.index).clip(0.000, 1.000)


def calculate_hit_distance(exit_velocity: pd.Series, launch_angle: pd.Series) -> pd.Series:
    """
    Estimate hit distance using physics-based model.
    """
    # Convert to radians
    angle_rad = np.deg2rad(launch_angle)

    # Simplified projectile motion (ignoring air resistance)
    g = 32.2  # ft/s^2
    v0 = exit_velocity * 1.47  # Convert mph to ft/s

    # Distance = v0^2 * sin(2*angle) / g
    distance = (v0**2 * np.sin(2 * angle_rad) / g).clip(0, 500)

    return distance


# ==================== FEATURE REGISTRY ====================

FEATURE_IMPLEMENTATIONS = {
    # Cardinals Baseball
    "cardinals_batter_xwoba_30d": cardinals_batter_xwoba_30d,
    "cardinals_batter_barrel_rate_7g": cardinals_batter_barrel_rate_7g,
    "cardinals_batter_chase_rate_below_zone_30d": cardinals_batter_chase_rate_below_zone_30d,
    "cardinals_batter_clutch_performance_season": cardinals_batter_clutch_performance_season,
    "cardinals_batter_sprint_speed_percentile": cardinals_batter_sprint_speed_percentile,

    # Cardinals Pitching
    "cardinals_pitcher_whiff_rate_15d": cardinals_pitcher_whiff_rate_15d,
    "cardinals_pitcher_command_plus_30d": cardinals_pitcher_command_plus_30d,
    "cardinals_bullpen_fatigue_index_3d": cardinals_bullpen_fatigue_index_3d,
    "cardinals_pitcher_tto_penalty_delta_2to3": cardinals_pitcher_tto_penalty_delta_2to3,
    "cardinals_pitcher_stuff_plus_rolling_7g": cardinals_pitcher_stuff_plus_rolling_7g,

    # Titans Football
    "titans_qb_pressure_to_sack_rate_adj_4g": titans_qb_pressure_to_sack_rate_adj_4g,
    "titans_qb_epa_per_play_clean_pocket_5g": titans_qb_epa_per_play_clean_pocket_5g,
    "titans_rb_yards_after_contact_per_attempt_3g": titans_rb_yards_after_contact_per_attempt_3g,
    "titans_oline_pass_block_win_rate_season": titans_oline_pass_block_win_rate_season,
    "titans_hidden_yardage_per_drive_5g": titans_hidden_yardage_per_drive_5g,

    # Grizzlies Basketball
    "grizzlies_player_defensive_rating_10g": grizzlies_player_defensive_rating_10g,
    "grizzlies_player_grit_grind_score_season": grizzlies_player_grit_grind_score_season,
    "grizzlies_lineup_net_rating_5g": grizzlies_lineup_net_rating_5g,
    "grizzlies_player_clutch_shooting_season": grizzlies_player_clutch_shooting_season,
    "grizzlies_player_load_management_index": grizzlies_player_load_management_index,

    # Longhorns College
    "longhorns_qb_passing_efficiency_rating_3g": longhorns_qb_passing_efficiency_rating_3g,
    "longhorns_rb_breakaway_run_rate_5g": longhorns_rb_breakaway_run_rate_5g,
    "longhorns_nil_valuation_index": longhorns_nil_valuation_index,

    # Advanced Sabermetrics
    "calculate_woba": calculate_woba,
    "calculate_fip": calculate_fip,
    "calculate_xfip": calculate_xfip,

    # Football Advanced
    "calculate_epa": calculate_epa,
    "calculate_dvoa": calculate_dvoa,

    # Cross-Sport Analytics
    "cross_sport_athlete_versatility_index": cross_sport_athlete_versatility_index,
    "injury_risk_prediction_score": injury_risk_prediction_score,
    "performance_trajectory_slope": performance_trajectory_slope,
    "draft_value_projection": draft_value_projection,

    # Pitch Analytics
    "pitch_tunneling_score": pitch_tunneling_score,
    "pitch_sequence_effectiveness": pitch_sequence_effectiveness,
}


def compute_feature(feature_name: str, df: pd.DataFrame) -> pd.Series:
    """
    Compute a feature by name with proper error handling.

    Args:
        feature_name: Name of feature to compute
        df: Input DataFrame with required columns

    Returns:
        Computed feature series

    Raises:
        ValueError: If feature name not found in registry
    """
    if feature_name not in FEATURE_IMPLEMENTATIONS:
        raise ValueError(f"Feature '{feature_name}' not found in implementation registry")

    try:
        func = FEATURE_IMPLEMENTATIONS[feature_name]
        result = func(df)
        return result
    except Exception as e:
        raise RuntimeError(f"Failed to compute feature '{feature_name}': {str(e)}")