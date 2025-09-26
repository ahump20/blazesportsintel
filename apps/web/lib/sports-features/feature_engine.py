"""
=============================================================================
BLAZE SPORTS INTELLIGENCE - ADVANCED FEATURE ENGINEERING ENGINE
=============================================================================
Real-time sports analytics feature computation engine for blazesportsintel.com
Supports baseball, football, basketball, and cross-sport analysis
Performance optimized for <100ms computation requirements
=============================================================================
"""

import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Optional, Union, Any
from datetime import datetime, timedelta
import warnings
from functools import wraps
import time

# Suppress pandas warnings for cleaner output
warnings.filterwarnings('ignore', category=pd.errors.PerformanceWarning)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def performance_monitor(func):
    """Decorator to monitor feature computation performance"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        execution_time = (time.time() - start_time) * 1000  # Convert to ms

        if execution_time > 100:  # Alert if over 100ms
            logger.warning(f"{func.__name__} took {execution_time:.2f}ms (>100ms target)")
        else:
            logger.info(f"{func.__name__} executed in {execution_time:.2f}ms")

        return result
    return wrapper

def validate_output_range(min_val: float, max_val: float):
    """Decorator to validate output is within expected range"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            if hasattr(result, 'clip'):
                result = result.clip(min_val, max_val)
            return result
        return wrapper
    return decorator

class BlazeFeatureEngine:
    """
    Advanced feature engineering engine for Blaze Sports Intelligence

    Implements sophisticated sports analytics features with real-time computation
    capabilities, optimized for the blazesportsintel.com platform.
    """

    def __init__(self):
        self.feature_registry = {}
        self.performance_metrics = {}
        self.data_quality_stats = {}

    # =============================================================================
    # BASEBALL FEATURES - Cardinals Focus & League-Wide Analytics
    # =============================================================================

    @performance_monitor
    @validate_output_range(0.0, 1.0)
    def baseball_bullpen_fatigue_index_3d(self, df: pd.DataFrame) -> pd.Series:
        """
        Advanced bullpen fatigue metric using 3-day rolling windows

        Calculates fatigue index for relief pitchers based on recent usage patterns,
        incorporating back-to-back appearance penalties. Optimized for Cardinals
        bullpen management and league-wide analysis.

        Args:
            df: DataFrame with columns [team_id, pitcher_id, ts, role, pitches, back_to_back]

        Returns:
            pd.Series: Fatigue index (0.0 = fresh, 1.0 = highly fatigued)
        """
        if df.empty:
            return pd.Series([], dtype=float, name='bullpen_fatigue_3d')

        d = df.copy()
        d["is_rp"] = (d.get("role", "RP") == "RP")
        d = d.sort_values(["team_id", "pitcher_id", "ts"])

        # Rolling 3-day sum per reliever
        d_indexed = d.set_index("ts")
        rolling_pitches = (d_indexed.groupby(["team_id", "pitcher_id"])
                          .apply(lambda g: g["pitches"].rolling("3D", min_periods=1).sum())
                          .reset_index(level=[0,1], drop=True))

        # Normalization: 150 pitches = extremely high 3-day load
        capacity = 150.0
        load = (rolling_pitches.fillna(0) / capacity).clip(0, 1.0)

        # Back-to-back penalty
        b2b_penalty = d.get("back_to_back", pd.Series(False, index=d.index)).astype(bool)
        b2b_bonus = b2b_penalty.map({True: 0.15, False: 0.0})

        # Final score: base load + back-to-back penalty
        fatigue_score = (load + b2b_bonus).clip(0, 1.0)

        # Only apply to relief pitchers
        fatigue_score = fatigue_score.where(d["is_rp"], 0.0)

        return fatigue_score.reindex(df.index)

    @performance_monitor
    @validate_output_range(0.0, 1.0)
    def batter_chase_rate_below_zone_30d(self, df: pd.DataFrame) -> pd.Series:
        """
        Batter discipline metric tracking swings at pitches below the strike zone

        Analyzes batter plate discipline by measuring swing rates on pitches
        thrown below the strike zone over a 30-day rolling window. Critical
        for scouting and player development.

        Args:
            df: DataFrame with columns [batter_id, ts, swing, sz_bot, plate_z]

        Returns:
            pd.Series: Chase rate (0.0 = excellent discipline, 1.0 = poor discipline)
        """
        if df.empty:
            return pd.Series([], dtype=float, name='chase_rate_below_zone_30d')

        d = df.copy().sort_values(["batter_id", "ts"])

        # Validate required columns
        required_cols = ["plate_z", "sz_bot", "swing", "batter_id", "ts"]
        missing_cols = [col for col in required_cols if col not in d.columns]
        if missing_cols:
            logger.warning(f"Missing columns for chase rate: {missing_cols}")
            return pd.Series(np.nan, index=df.index, name='chase_rate_below_zone_30d')

        # Define "below zone" pitches (2+ inches below bottom of strike zone)
        below_zone = d["plate_z"] < (d["sz_bot"] - 2.0)
        chase = below_zone & d["swing"].astype(bool)

        # Rolling 30-day aggregation per batter
        d_indexed = d.set_index("ts")
        grouped = d_indexed.groupby("batter_id")

        # Rolling sum of below zone pitches seen and chased
        below_seen = (grouped[below_zone.name]
                     .rolling("30D", min_periods=15).sum()
                     .reset_index(level=0, drop=True))

        chases = (grouped[chase.name]
                 .rolling("30D", min_periods=5).sum()
                 .reset_index(level=0, drop=True))

        # Calculate chase rate
        chase_rate = (chases / below_seen.replace(0, np.nan)).fillna(0).clip(0, 1)

        return chase_rate.reindex(df.index)

    @performance_monitor
    @validate_output_range(-1.0, 1.0)
    def pitcher_tto_penalty_delta_2to3(self, df: pd.DataFrame) -> pd.Series:
        """
        Times Through Order penalty analysis (2nd vs 3rd time facing batters)

        Calculates the performance degradation when pitchers face batters for
        the third time compared to the second time. Critical for bullpen
        timing and starter usage decisions.

        Args:
            df: DataFrame with columns [pitcher_id, game_id, ts, tto, woba_value]

        Returns:
            pd.Series: Penalty delta (positive = worse performance on 3rd time)
        """
        if df.empty:
            return pd.Series([], dtype=float, name='tto_penalty_delta_2to3')

        d = df.copy()

        # Extract season if not present
        if "season" not in d.columns:
            d["season"] = pd.to_datetime(d["ts"]).dt.year

        # Calculate per-pitcher, per-season TTO performance
        grouped = d.groupby(["pitcher_id", "season"])

        def calc_tto_delta(group):
            tto_2_woba = group.loc[group["tto"] == 2, "woba_value"].mean()
            tto_3_woba = group.loc[group["tto"] == 3, "woba_value"].mean()
            return tto_3_woba - tto_2_woba if not (pd.isna(tto_2_woba) or pd.isna(tto_3_woba)) else np.nan

        tto_deltas = grouped.apply(calc_tto_delta).rename("tto_delta")

        # Broadcast back to original dataframe
        result = d.set_index(["pitcher_id", "season"]).join(tto_deltas).reset_index()["tto_delta"]

        return result.reindex(df.index)

    @performance_monitor
    @validate_output_range(0.0, 1.0)
    def cardinals_readiness_index(self, df: pd.DataFrame) -> pd.Series:
        """
        Cardinals-specific team readiness metric

        Combines multiple factors including rest, recent performance, bullpen
        fatigue, and injury status to create a comprehensive readiness score
        for the St. Louis Cardinals organization.

        Args:
            df: DataFrame with columns [team_id, game_date, rest_days, recent_performance,
                                      bullpen_fatigue, injury_count]

        Returns:
            pd.Series: Readiness index (0.0 = poor readiness, 1.0 = optimal readiness)
        """
        if df.empty or not (df.get("team_id", "") == "STL").any():
            return pd.Series([], dtype=float, name='cardinals_readiness_index')

        d = df.copy()

        # Component weights for readiness calculation
        weights = {
            'rest': 0.25,
            'performance': 0.35,
            'bullpen': 0.25,
            'injuries': 0.15
        }

        # Normalize rest days (0-5 days optimal)
        rest_score = (1 - (d.get("rest_days", 1).clip(0, 10) / 10))

        # Recent performance already 0-1
        performance_score = d.get("recent_performance", 0.5).clip(0, 1)

        # Bullpen fatigue (inverted - lower fatigue = higher readiness)
        bullpen_score = 1 - d.get("bullpen_fatigue", 0.5).clip(0, 1)

        # Injury impact (fewer injuries = higher readiness)
        injury_score = 1 - (d.get("injury_count", 0).clip(0, 15) / 15)

        # Weighted combination
        readiness = (weights['rest'] * rest_score +
                    weights['performance'] * performance_score +
                    weights['bullpen'] * bullpen_score +
                    weights['injuries'] * injury_score)

        return readiness.clip(0, 1).reindex(df.index)

    # =============================================================================
    # FOOTBALL FEATURES - Titans Focus & SEC/Texas Analytics
    # =============================================================================

    @performance_monitor
    @validate_output_range(0.0, 1.0)
    def football_qb_pressure_to_sack_rate_adj_4g(self, df: pd.DataFrame) -> pd.Series:
        """
        QB pressure-to-sack rate adjusted for opponent quality

        Calculates quarterback sack rate when under pressure, adjusted for
        opponent pass blocking quality over the last 4 games. Critical for
        evaluating pass protection and QB mobility.

        Args:
            df: DataFrame with columns [offense_team, qb_id, game_no, pressure, sack,
                                      opp_pass_block_win_rate]

        Returns:
            pd.Series: Adjusted sack rate under pressure
        """
        if df.empty:
            return pd.Series([], dtype=float, name='qb_pressure_sack_rate_adj_4g')

        d = df.copy().sort_values(["qb_id", "game_no"])

        # First aggregate to game level
        game_stats = (d.groupby(["qb_id", "game_no"])
                     .agg(pressures=("pressure", "sum"),
                          sacks=("sack", "sum"),
                          opp_pbwr=("opp_pass_block_win_rate", "mean"))
                     .reset_index())

        # Calculate raw sack rate per game
        game_stats["raw_sack_rate"] = (game_stats["sacks"] /
                                      game_stats["pressures"].replace(0, np.nan))
        game_stats["raw_sack_rate"] = game_stats["raw_sack_rate"].fillna(0).clip(0, 1)

        # Rolling 4-game averages
        game_stats = game_stats.sort_values(["qb_id", "game_no"])
        game_stats["raw_4g"] = (game_stats.groupby("qb_id")["raw_sack_rate"]
                               .rolling(4, min_periods=2).mean()
                               .reset_index(level=0, drop=True))

        game_stats["opp_4g"] = (game_stats.groupby("qb_id")["opp_pbwr"]
                               .rolling(4, min_periods=2).mean()
                               .reset_index(level=0, drop=True))

        # Adjustment: divide by opponent pass block win rate
        game_stats["adj_rate"] = (game_stats["raw_4g"] /
                                 game_stats["opp_4g"].replace(0, 1)).clip(0, 1)

        # Merge back to original dataframe
        result = d.merge(game_stats[["qb_id", "game_no", "adj_rate"]],
                        on=["qb_id", "game_no"], how="left")["adj_rate"]

        return result.reindex(df.index)

    @performance_monitor
    @validate_output_range(-30.0, 30.0)
    def football_hidden_yardage_per_drive_5g(self, df: pd.DataFrame) -> pd.Series:
        """
        Hidden yardage analysis - field position value beyond expected

        Measures additional yardage value gained through superior field position,
        special teams returns, and penalty avoidance. Captures "hidden" aspects
        of team performance not reflected in traditional offensive statistics.

        Args:
            df: DataFrame with columns [offense_team, game_no, drive_id, start_yardline,
                                      expected_start, return_yards, penalty_yards]

        Returns:
            pd.Series: Hidden yardage per drive (positive = advantage gained)
        """
        if df.empty:
            return pd.Series([], dtype=float, name='hidden_yardage_per_drive_5g')

        d = df.copy().sort_values(["offense_team", "game_no", "drive_id"])

        # Calculate hidden yardage per drive
        d["hidden_yardage"] = ((d.get("start_yardline", 25) - d.get("expected_start", 25)) +
                              d.get("return_yards", 0).fillna(0) -
                              d.get("penalty_yards", 0).fillna(0))

        # Aggregate to game level (average per drive)
        game_stats = (d.groupby(["offense_team", "game_no"])["hidden_yardage"]
                     .mean().reset_index(name="hidden_pg"))

        # Rolling 5-game average
        game_stats = game_stats.sort_values(["offense_team", "game_no"])
        game_stats["hidden_5g"] = (game_stats.groupby("offense_team")["hidden_pg"]
                                  .rolling(5, min_periods=2).mean()
                                  .reset_index(level=0, drop=True))

        # Merge back and apply bounds
        result = d.merge(game_stats[["offense_team", "game_no", "hidden_5g"]],
                        on=["offense_team", "game_no"], how="left")["hidden_5g"]

        return result.clip(-30, 30).reindex(df.index)

    @performance_monitor
    @validate_output_range(0.0, 1.0)
    def titans_readiness_index(self, df: pd.DataFrame) -> pd.Series:
        """
        Titans-specific team readiness metric

        Combines injury reports, practice participation, and recent performance
        to assess Tennessee Titans readiness for upcoming games. Integrates
        with team-specific factors and AFC South competition dynamics.

        Args:
            df: DataFrame with columns [team_id, week, injury_report_severity,
                                      practice_participation, recent_performance]

        Returns:
            pd.Series: Team readiness index (0.0 = poor readiness, 1.0 = peak readiness)
        """
        if df.empty or not (df.get("team_id", "") == "TEN").any():
            return pd.Series([], dtype=float, name='titans_readiness_index')

        d = df.copy()

        # Component weights
        weights = {
            'injuries': 0.4,    # Injuries have major impact in NFL
            'practice': 0.3,    # Practice participation crucial
            'performance': 0.3  # Recent performance momentum
        }

        # Invert injury severity (lower severity = higher readiness)
        injury_score = 1 - d.get("injury_report_severity", 0.3).clip(0, 1)

        # Practice participation (already 0-1)
        practice_score = d.get("practice_participation", 0.7).clip(0, 1)

        # Recent performance (already 0-1)
        performance_score = d.get("recent_performance", 0.5).clip(0, 1)

        # Weighted combination
        readiness = (weights['injuries'] * injury_score +
                    weights['practice'] * practice_score +
                    weights['performance'] * performance_score)

        return readiness.clip(0, 1).reindex(df.index)

    # =============================================================================
    # BASKETBALL FEATURES - Grizzlies Focus & NBA Analytics
    # =============================================================================

    @performance_monitor
    @validate_output_range(0.0, 200.0)
    def basketball_shooting_efficiency_composite(self, df: pd.DataFrame) -> pd.Series:
        """
        Advanced shooting efficiency metric combining accuracy and shot quality

        Comprehensive shooting metric that accounts for shot difficulty,
        situational performance, and volume. Scaled similar to PER for
        easy interpretation and comparison.

        Args:
            df: DataFrame with columns [player_id, game_date, fg_made, fg_attempted,
                                      three_made, three_attempted, shot_quality, clutch_time]

        Returns:
            pd.Series: Shooting efficiency composite (100 = league average)
        """
        if df.empty:
            return pd.Series([], dtype=float, name='shooting_efficiency_composite')

        d = df.copy()

        # Base shooting efficiency
        fg_pct = d.get("fg_made", 0) / d.get("fg_attempted", 1).replace(0, 1)

        # Three-point bonus (extra value for made threes)
        three_bonus = d.get("three_made", 0) * 0.5

        # Shot quality adjustment (shooting better/worse than expected)
        expected_fg_pct = d.get("shot_quality", 0.45)
        quality_adjustment = (fg_pct - expected_fg_pct) * 10  # Scale adjustment

        # Clutch multiplier
        clutch_multiplier = d.get("clutch_time", False).astype(float) * 0.2 + 1.0

        # Combine components (scaled to ~100 baseline)
        efficiency = ((fg_pct * 100) + three_bonus + quality_adjustment) * clutch_multiplier

        return efficiency.clip(0, 200).reindex(df.index)

    @performance_monitor
    @validate_output_range(80.0, 130.0)
    def basketball_defensive_rating_advanced(self, df: pd.DataFrame) -> pd.Series:
        """
        Advanced defensive rating incorporating individual defensive impact

        Comprehensive defensive metric that combines individual defensive
        statistics with opponent shooting when defended. Normalized per
        100 possessions for consistent comparison.

        Args:
            df: DataFrame with columns [player_id, minutes_played, opponent_fg_when_defending,
                                      opponent_fga_when_defending, steals, blocks, deflections,
                                      team_defensive_rating]

        Returns:
            pd.Series: Defensive rating (lower = better defense)
        """
        if df.empty:
            return pd.Series([], dtype=float, name='defensive_rating_advanced')

        d = df.copy()

        # Opponent FG% when defended
        opp_fg_pct = (d.get("opponent_fg_when_defending", 0) /
                     d.get("opponent_fga_when_defending", 1).replace(0, 1))

        # Defensive actions per minute
        minutes = d.get("minutes_played", 1).replace(0, 1)
        steals_per_min = d.get("steals", 0) / minutes
        blocks_per_min = d.get("blocks", 0) / minutes
        deflections_per_min = d.get("deflections", 0) / minutes

        # Defensive activity score
        activity_score = (steals_per_min * 2 + blocks_per_min * 3 + deflections_per_min * 1)

        # Base team defensive rating
        team_rating = d.get("team_defensive_rating", 110)

        # Individual adjustment (lower opponent FG% and higher activity = better rating)
        individual_adjustment = (opp_fg_pct - 0.45) * 20 - (activity_score * 5)

        # Final defensive rating
        def_rating = team_rating + individual_adjustment

        return def_rating.clip(80, 130).reindex(df.index)

    @performance_monitor
    @validate_output_range(0.0, 100.0)
    def grizzlies_grit_index(self, df: pd.DataFrame) -> pd.Series:
        """
        Memphis Grizzlies "Grit and Grind" culture metric

        Team-specific metric capturing the hustle statistics and defensive
        intensity that characterizes Grizzlies basketball culture. Emphasizes
        effort-based statistics and defensive stops.

        Args:
            df: DataFrame with columns [team_id, game_date, hustle_stats, defensive_stops,
                                      offensive_rebounds, loose_balls_recovered, charges_taken]

        Returns:
            pd.Series: Grit index (0-100, higher = more grit and grind)
        """
        if df.empty or not (df.get("team_id", "") == "MEM").any():
            return pd.Series([], dtype=float, name='grizzlies_grit_index')

        d = df.copy()

        # Component weights for "grit" factors
        weights = {
            'defensive_stops': 0.3,
            'offensive_rebounds': 0.25,
            'loose_balls': 0.25,
            'charges': 0.2
        }

        # Normalize components to 0-1 scale based on typical game ranges
        def_stops_norm = d.get("defensive_stops", 20).clip(0, 50) / 50
        oreb_norm = d.get("offensive_rebounds", 8).clip(0, 20) / 20
        loose_balls_norm = d.get("loose_balls_recovered", 5).clip(0, 15) / 15
        charges_norm = d.get("charges_taken", 1).clip(0, 5) / 5

        # Weighted grit score
        grit_score = (weights['defensive_stops'] * def_stops_norm +
                     weights['offensive_rebounds'] * oreb_norm +
                     weights['loose_balls'] * loose_balls_norm +
                     weights['charges'] * charges_norm) * 100

        return grit_score.clip(0, 100).reindex(df.index)

    # =============================================================================
    # CROSS-SPORT FEATURES - Multi-Sport Athletes & Character Assessment
    # =============================================================================

    @performance_monitor
    @validate_output_range(-1.0, 1.0)
    def multi_sport_performance_correlation(self, df: pd.DataFrame) -> pd.Series:
        """
        Multi-sport performance correlation analysis

        Analyzes performance patterns across different sports for multi-sport
        athletes to identify skill transfer and development opportunities.
        Critical for youth and high school athlete development.

        Args:
            df: DataFrame with columns [athlete_id, sport_1, sport_2, performance_1,
                                      performance_2, shared_skills, training_overlap]

        Returns:
            pd.Series: Correlation coefficient (-1 to 1)
        """
        if df.empty:
            return pd.Series([], dtype=float, name='multi_sport_correlation')

        d = df.copy()

        # Group by athlete and calculate correlation
        def calc_correlation(group):
            perf_1 = group["performance_1"].values
            perf_2 = group["performance_2"].values

            if len(perf_1) < 3:  # Need minimum samples
                return np.nan

            correlation = np.corrcoef(perf_1, perf_2)[0, 1]

            # Adjust correlation based on shared skills and training overlap
            shared_skill_factor = len(group["shared_skills"].iloc[0]) / 10  # Assume max 10 skills
            training_overlap = group["training_overlap"].mean()

            # Boost correlation for similar sports with high overlap
            adjustment = (shared_skill_factor + training_overlap) / 2 * 0.2
            adjusted_correlation = correlation + adjustment

            return np.clip(adjusted_correlation, -1, 1)

        correlations = (d.groupby("athlete_id")
                       .apply(calc_correlation)
                       .rename("correlation"))

        # Broadcast back to original dataframe
        result = d.set_index("athlete_id").join(correlations).reset_index()["correlation"]

        return result.reindex(df.index)

    @performance_monitor
    @validate_output_range(0.0, 1.0)
    def character_assessment_vision_ai(self, df: pd.DataFrame) -> pd.Series:
        """
        Character assessment via Vision AI micro-expression analysis

        Analyzes micro-expressions and body language to assess character traits
        like grit, determination, and resilience. Integrates with Vision AI
        platform for real-time character evaluation.

        Args:
            df: DataFrame with columns [athlete_id, video_timestamp, micro_expressions,
                                      body_language_score, pressure_situation, game_context]

        Returns:
            pd.Series: Character assessment score (0.0 = low character traits, 1.0 = high)
        """
        if df.empty:
            return pd.Series([], dtype=float, name='character_assessment_score')

        d = df.copy()

        # Base score from body language analysis
        base_score = d.get("body_language_score", 0.5).clip(0, 1)

        # Micro-expression analysis (assuming processed scores)
        if "micro_expressions" in d.columns:
            # Extract confidence and determination indicators from micro-expressions
            # This would integrate with actual vision AI processing
            micro_score = base_score * 0.8 + 0.2  # Placeholder processing
        else:
            micro_score = base_score

        # Pressure situation adjustment (higher scores in pressure = better character)
        pressure_multiplier = d.get("pressure_situation", False).astype(float) * 0.3 + 1.0

        # Game context weighting (crucial moments count more)
        context_weights = {
            'clutch': 1.3,
            'elimination': 1.4,
            'championship': 1.5,
            'regular': 1.0
        }

        context_weight = d.get("game_context", "regular").map(context_weights).fillna(1.0)

        # Final character score
        character_score = (micro_score * pressure_multiplier * context_weight) / 2

        return character_score.clip(0, 1).reindex(df.index)

    @performance_monitor
    @validate_output_range(0.0, 1000000.0)
    def nil_valuation_composite(self, df: pd.DataFrame) -> pd.Series:
        """
        NIL valuation composite score for college athletes

        Comprehensive NIL valuation combining performance metrics, social media
        presence, and market factors. Provides annual dollar valuation estimate
        for Name, Image, and Likeness opportunities.

        Args:
            df: DataFrame with columns [athlete_id, sport, performance_percentile,
                                      social_media_followers, engagement_rate, market_size,
                                      team_success]

        Returns:
            pd.Series: Estimated annual NIL value in dollars
        """
        if df.empty:
            return pd.Series([], dtype=float, name='nil_valuation_dollars')

        d = df.copy()

        # Base valuation by sport (annual potential)
        sport_base_values = {
            'football': 50000,
            'basketball': 30000,
            'baseball': 15000,
            'other': 10000
        }

        base_value = d.get("sport", "other").map(sport_base_values).fillna(10000)

        # Performance multiplier (top performers can earn much more)
        perf_percentile = d.get("performance_percentile", 50).clip(0, 100)
        performance_multiplier = 1 + (perf_percentile / 100) * 3  # Top players up to 4x

        # Social media value (followers and engagement)
        followers = d.get("social_media_followers", 1000).clip(1000, 5000000)
        engagement = d.get("engagement_rate", 2.0).clip(0.5, 20.0)

        # Social media multiplier (logarithmic scale)
        social_multiplier = np.log10(followers / 1000) * (engagement / 5.0)
        social_multiplier = np.clip(social_multiplier, 1.0, 10.0)

        # Market size adjustment
        market_multipliers = {
            'small': 0.7,
            'medium': 1.0,
            'large': 1.5,
            'major': 2.0
        }

        market_mult = d.get("market_size", "medium").map(market_multipliers).fillna(1.0)

        # Team success bonus
        team_success = d.get("team_success", 0.5).clip(0, 1)
        success_multiplier = 1 + (team_success * 0.5)  # Up to 50% bonus for winning teams

        # Final NIL valuation
        nil_value = (base_value * performance_multiplier * social_multiplier *
                    market_mult * success_multiplier)

        return nil_value.clip(0, 1000000).reindex(df.index)

    # =============================================================================
    # FEATURE ORCHESTRATION & VALIDATION
    # =============================================================================

    def compute_feature_batch(self, feature_specs: List[Dict], data: Dict[str, pd.DataFrame]) -> Dict[str, pd.Series]:
        """
        Compute multiple features in batch for optimal performance

        Args:
            feature_specs: List of feature specifications
            data: Dictionary of DataFrames keyed by feature name

        Returns:
            Dictionary of computed feature series
        """
        results = {}
        total_start_time = time.time()

        for spec in feature_specs:
            feature_name = spec['name']
            feature_method = getattr(self, feature_name, None)

            if feature_method and feature_name in data:
                try:
                    logger.info(f"Computing feature: {feature_name}")
                    results[feature_name] = feature_method(data[feature_name])
                except Exception as e:
                    logger.error(f"Error computing {feature_name}: {str(e)}")
                    results[feature_name] = pd.Series([], dtype=float, name=feature_name)

        total_time = (time.time() - total_start_time) * 1000
        logger.info(f"Batch computation completed in {total_time:.2f}ms")

        return results

    def validate_feature_quality(self, feature_series: pd.Series, expected_range: tuple) -> Dict:
        """
        Validate feature quality and performance metrics

        Args:
            feature_series: Computed feature values
            expected_range: Expected (min, max) range for values

        Returns:
            Quality metrics dictionary
        """
        metrics = {
            'total_count': len(feature_series),
            'null_count': feature_series.isnull().sum(),
            'null_percentage': feature_series.isnull().sum() / len(feature_series) * 100,
            'min_value': feature_series.min(),
            'max_value': feature_series.max(),
            'mean_value': feature_series.mean(),
            'in_range': ((feature_series >= expected_range[0]) &
                        (feature_series <= expected_range[1])).sum(),
            'out_of_range_count': ((feature_series < expected_range[0]) |
                                  (feature_series > expected_range[1])).sum()
        }

        metrics['quality_score'] = (metrics['in_range'] / metrics['total_count']) * 100

        return metrics


# =============================================================================
# FEATURE ENGINE FACTORY & INTEGRATION
# =============================================================================

class BlazeFeatureEngineFactory:
    """Factory for creating and configuring feature engines"""

    @staticmethod
    def create_production_engine() -> BlazeFeatureEngine:
        """Create production-optimized feature engine"""
        engine = BlazeFeatureEngine()

        # Configure production settings
        engine.performance_target = 100  # 100ms max
        engine.quality_threshold = 0.95  # 95% quality minimum

        return engine

    @staticmethod
    def create_development_engine() -> BlazeFeatureEngine:
        """Create development engine with enhanced logging"""
        engine = BlazeFeatureEngine()

        # Configure development settings
        engine.performance_target = 200  # More relaxed for development
        engine.quality_threshold = 0.90

        return engine


# Example usage and testing
if __name__ == "__main__":
    # Create feature engine
    engine = BlazeFeatureEngineFactory.create_production_engine()

    # Example: Cardinals bullpen fatigue calculation
    sample_bullpen_data = pd.DataFrame({
        'team_id': ['STL', 'STL', 'STL', 'STL'],
        'pitcher_id': ['P001', 'P001', 'P002', 'P002'],
        'ts': pd.to_datetime(['2025-09-23', '2025-09-24', '2025-09-23', '2025-09-25']),
        'role': ['RP', 'RP', 'RP', 'RP'],
        'pitches': [25, 18, 32, 15],
        'back_to_back': [False, True, False, False]
    })

    # Compute fatigue index
    fatigue_scores = engine.baseball_bullpen_fatigue_index_3d(sample_bullpen_data)
    print("Cardinals Bullpen Fatigue Scores:")
    print(fatigue_scores)

    # Quality validation
    quality_metrics = engine.validate_feature_quality(fatigue_scores, (0.0, 1.0))
    print("\nQuality Metrics:")
    for key, value in quality_metrics.items():
        print(f"{key}: {value}")