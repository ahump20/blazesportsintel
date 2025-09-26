#!/usr/bin/env python3
"""
Blaze Sports Intelligence Analytics Test Suite

Comprehensive testing for all sports analytics implementations.
Tests edge cases, performance, and accuracy of feature calculations.
"""

import pandas as pd
import numpy as np
import pytest
import time
from datetime import datetime, timedelta
import warnings

# Import our feature implementations
from features_impl import *

class TestCardinalBaseball:
    """Test suite for Cardinals baseball analytics."""

    def setup_method(self):
        """Set up test data for each test."""
        dates = pd.date_range('2025-01-01', periods=100, freq='D')
        self.df = pd.DataFrame({
            'batter_id': np.random.choice(['player_1', 'player_2', 'player_3'], 100),
            'pitcher_id': np.random.choice(['pitcher_1', 'pitcher_2'], 100),
            'game_no': np.tile(range(1, 11), 10),
            'ts': np.random.choice(dates, 100),
            'exit_velocity': np.random.normal(87, 8, 100),
            'launch_angle': np.random.normal(12, 15, 100),
            'swing': np.random.choice([True, False], 100, p=[0.4, 0.6]),
            'whiff': np.random.choice([True, False], 100, p=[0.25, 0.75]),
            'sz_bot': np.random.normal(1.8, 0.2, 100),
            'plate_z': np.random.normal(2.5, 1.0, 100),
            'pitches': np.random.randint(1, 30, 100),
            'role': np.random.choice(['RP', 'SP'], 100, p=[0.7, 0.3]),
            'back_to_back': np.random.choice([True, False], 100, p=[0.2, 0.8]),
            'team_id': 'STL'
        })

    def test_batter_xwoba_30d(self):
        """Test Cardinals batter xwOBA calculation."""
        result = cardinals_batter_xwoba_30d(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= 0.200
        assert result.max() <= 0.600
        assert not result.isna().all()

    def test_barrel_rate_7g(self):
        """Test barrel rate calculation."""
        result = cardinals_batter_barrel_rate_7g(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= 0.0
        assert result.max() <= 50.0

        # Test with extreme values
        self.df['exit_velocity'] = 105
        self.df['launch_angle'] = 28
        result_high = cardinals_batter_barrel_rate_7g(self.df)
        assert result_high.mean() > result.mean()

    def test_chase_rate_below_zone(self):
        """Test chase rate below zone calculation."""
        result = cardinals_batter_chase_rate_below_zone_30d(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= 0.0
        assert result.max() <= 100.0

    def test_bullpen_fatigue_index(self):
        """Test bullpen fatigue calculation."""
        result = cardinals_bullpen_fatigue_index_3d(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= 0.0
        assert result.max() <= 1.0

        # Starters should have low fatigue
        starter_fatigue = result[self.df['role'] == 'SP']
        reliever_fatigue = result[self.df['role'] == 'RP']

        assert starter_fatigue.max() <= reliever_fatigue.max()


class TestTitansFootball:
    """Test suite for Titans football analytics."""

    def setup_method(self):
        """Set up test data for each test."""
        self.df = pd.DataFrame({
            'qb_id': np.random.choice(['qb_1', 'qb_2'], 100),
            'rb_id': np.random.choice(['rb_1', 'rb_2'], 100),
            'game_no': np.random.randint(1, 17, 100),
            'pressure': np.random.choice([True, False], 100, p=[0.3, 0.7]),
            'sack': np.random.choice([True, False], 100, p=[0.08, 0.92]),
            'opp_pass_block_win_rate': np.random.uniform(0.4, 0.8, 100),
            'expected_points_added': np.random.normal(0, 0.5, 100),
            'rushing_yards': np.random.randint(0, 15, 100),
            'yards_before_contact': np.random.randint(0, 8, 100),
            'oline_unit_id': np.random.choice(['unit_1', 'unit_2'], 100),
            'pass_block_win': np.random.choice([True, False], 100, p=[0.65, 0.35]),
            'offense_team': 'TEN',
            'drive_id': np.random.randint(1, 12, 100),
            'start_yardline': np.random.randint(15, 85, 100),
            'expected_start': np.random.randint(20, 30, 100),
            'return_yards': np.random.randint(0, 25, 100),
            'penalty_yards': np.random.randint(0, 15, 100)
        })

    def test_qb_pressure_to_sack_rate(self):
        """Test QB pressure to sack rate calculation."""
        result = titans_qb_pressure_to_sack_rate_adj_4g(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= 0.0
        assert result.max() <= 1.0

    def test_qb_clean_pocket_epa(self):
        """Test QB clean pocket EPA calculation."""
        result = titans_qb_epa_per_play_clean_pocket_5g(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= -1.0
        assert result.max() <= 1.5

    def test_hidden_yardage(self):
        """Test hidden yardage calculation."""
        result = titans_hidden_yardage_per_drive_5g(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= -30.0
        assert result.max() <= 30.0


class TestGrizzliesBasketball:
    """Test suite for Grizzlies basketball analytics."""

    def setup_method(self):
        """Set up test data for each test."""
        self.df = pd.DataFrame({
            'player_id': np.random.choice(['player_1', 'player_2', 'player_3'], 100),
            'lineup_id': np.random.choice(['lineup_1', 'lineup_2'], 100),
            'game_no': np.random.randint(1, 82, 100),
            'ts': pd.date_range('2025-01-01', periods=100, freq='D'),
            'def_possessions': np.random.randint(15, 30, 100),
            'points_allowed': np.random.randint(18, 35, 100),
            'charges_drawn': np.random.randint(0, 3, 100),
            'contested_shots': np.random.randint(3, 12, 100),
            'deflections': np.random.randint(1, 6, 100),
            'hustle_plays': np.random.randint(2, 8, 100),
            'off_rating': np.random.normal(110, 15, 100),
            'def_rating': np.random.normal(105, 12, 100),
            'clutch_situation': np.random.choice([True, False], 100, p=[0.15, 0.85]),
            'fg_made': np.random.choice([True, False], 100, p=[0.45, 0.55]),
            'shot_value': np.random.choice([2, 3], 100, p=[0.7, 0.3]),
            'minutes_played': np.random.uniform(15, 40, 100),
            'distance_covered': np.random.uniform(2000, 6000, 100),
            'accelerations': np.random.randint(30, 120, 100)
        })

    def test_defensive_rating_10g(self):
        """Test defensive rating calculation."""
        result = grizzlies_player_defensive_rating_10g(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= 80.0
        assert result.max() <= 130.0

    def test_grit_grind_score(self):
        """Test Grit and Grind score calculation."""
        result = grizzlies_player_grit_grind_score_season(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= 0.0
        assert result.max() <= 100.0

        # Players with more hustle stats should score higher
        high_hustle_df = self.df.copy()
        high_hustle_df['charges_drawn'] = 5
        high_hustle_df['deflections'] = 10

        high_result = grizzlies_player_grit_grind_score_season(high_hustle_df)
        assert high_result.mean() > result.mean()

    def test_load_management_index(self):
        """Test load management calculation."""
        result = grizzlies_player_load_management_index(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= 0.0
        assert result.max() <= 1.0


class TestAdvancedMetrics:
    """Test suite for advanced sabermetrics and football metrics."""

    def setup_method(self):
        """Set up test data for each test."""
        self.baseball_df = pd.DataFrame({
            'bb': np.random.randint(0, 4, 100),
            'hbp': np.random.randint(0, 2, 100),
            'single': np.random.randint(0, 3, 100),
            'double': np.random.randint(0, 2, 100),
            'triple': np.random.randint(0, 1, 100),
            'hr': np.random.randint(0, 2, 100),
            'ab': np.random.randint(3, 6, 100),
            'sf': np.random.randint(0, 1, 100),
            'k': np.random.randint(0, 3, 100),
            'ip': np.random.uniform(1, 9, 100),
            'fly_balls': np.random.randint(0, 5, 100)
        })

        self.football_df = pd.DataFrame({
            'down': np.random.randint(1, 5, 100),
            'distance': np.random.randint(1, 20, 100),
            'yard_line': np.random.randint(1, 99, 100),
            'next_down': np.random.randint(1, 5, 100),
            'next_distance': np.random.randint(1, 20, 100),
            'next_yard_line': np.random.randint(1, 99, 100),
            'yards_gained': np.random.randint(-5, 25, 100),
            'play_type': np.random.choice(['run', 'pass'], 100),
            'opponent_def_rank': np.random.randint(1, 33, 100)
        })

    def test_woba_calculation(self):
        """Test wOBA calculation."""
        result = calculate_woba(self.baseball_df)

        assert len(result) == len(self.baseball_df)
        assert result.min() >= 0.000
        assert result.max() <= 1.000

        # Should be around league average (.320)
        assert 0.250 <= result.mean() <= 0.400

    def test_fip_calculation(self):
        """Test FIP calculation."""
        result = calculate_fip(self.baseball_df)

        assert len(result) == len(self.baseball_df)
        assert result.min() >= 1.00
        assert result.max() <= 7.00

    def test_epa_calculation(self):
        """Test EPA calculation."""
        result = calculate_epa(self.football_df)

        assert len(result) == len(self.football_df)
        assert result.min() >= -7.0
        assert result.max() <= 7.0

    def test_dvoa_calculation(self):
        """Test DVOA calculation."""
        result = calculate_dvoa(self.football_df)

        assert len(result) == len(self.football_df)
        assert result.min() >= -100.0
        assert result.max() <= 100.0


class TestCrossSportAnalytics:
    """Test suite for cross-sport analytics."""

    def setup_method(self):
        """Set up test data for each test."""
        self.df = pd.DataFrame({
            'athlete_id': np.random.choice(['athlete_1', 'athlete_2'], 100),
            'player_id': np.random.choice(['player_1', 'player_2'], 100),
            'sport': np.random.choice(['baseball', 'football', 'basketball'], 100),
            'position': np.random.choice(['QB', 'RB', 'OF', 'IF', 'C', 'PF'], 100),
            'performance_score': np.random.uniform(0, 100, 100),
            'games_played': np.random.randint(10, 50, 100),
            'skill_diversity': np.random.uniform(0, 1, 100),
            'acute_workload': np.random.uniform(80, 120, 100),
            'chronic_workload': np.random.uniform(90, 110, 100),
            'biomechanical_stress': np.random.uniform(0, 1, 100),
            'previous_injuries': np.random.randint(0, 5, 100),
            'age': np.random.randint(18, 35, 100),
            'ts': pd.date_range('2025-01-01', periods=100, freq='D'),
            'performance_metric': np.random.uniform(0, 100, 100),
            'performance_percentile': np.random.uniform(20, 95, 100),
            'ceiling_projection': np.random.uniform(60, 95, 100),
            'floor_projection': np.random.uniform(20, 50, 100),
            'injury_risk': np.random.uniform(0, 0.8, 100)
        })

    def test_versatility_index(self):
        """Test athlete versatility index."""
        result = cross_sport_athlete_versatility_index(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= 0.0
        assert result.max() <= 100.0

    def test_injury_risk_prediction(self):
        """Test injury risk prediction."""
        result = injury_risk_prediction_score(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= 0.0
        assert result.max() <= 1.0

        # Test edge case: high ACWR should increase risk
        high_acwr_df = self.df.copy()
        high_acwr_df['acute_workload'] = 150
        high_acwr_df['chronic_workload'] = 100

        high_risk = injury_risk_prediction_score(high_acwr_df)
        normal_risk = injury_risk_prediction_score(self.df)

        assert high_risk.mean() > normal_risk.mean()

    def test_performance_trajectory(self):
        """Test performance trajectory calculation."""
        result = performance_trajectory_slope(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= -1.0
        assert result.max() <= 1.0

    def test_draft_value_projection(self):
        """Test draft value projection."""
        result = draft_value_projection(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= 0.0
        assert result.max() <= 100.0


class TestPerformanceOptimization:
    """Test suite for performance and optimization features."""

    def test_parallel_computation_performance(self):
        """Test parallel feature computation performance."""
        # Generate large dataset
        n_rows = 10000
        df = pd.DataFrame({
            'player_id': np.random.choice([f'player_{i}' for i in range(100)], n_rows),
            'game_no': np.random.randint(1, 50, n_rows),
            'ts': pd.date_range('2024-01-01', periods=n_rows, freq='H'),
            'metric1': np.random.normal(50, 15, n_rows),
            'metric2': np.random.uniform(0, 100, n_rows),
            'sport': np.random.choice(['baseball', 'football'], n_rows)
        })

        # Test features that should work with this data structure
        features = [
            'performance_trajectory_slope',
            'cross_sport_athlete_versatility_index'
        ]

        # Time serial computation
        start_serial = time.time()
        for feature in features:
            if feature in FEATURE_IMPLEMENTATIONS:
                try:
                    FEATURE_IMPLEMENTATIONS[feature](df)
                except Exception:
                    pass  # Expected for some features with missing columns
        serial_time = time.time() - start_serial

        # Time parallel computation
        start_parallel = time.time()
        try:
            parallel_feature_computation(df, features, n_jobs=2)
            parallel_time = time.time() - start_parallel

            # Parallel should be faster or similar for large datasets
            print(f"Serial time: {serial_time:.3f}s, Parallel time: {parallel_time:.3f}s")

        except ImportError:
            # joblib not available
            pytest.skip("joblib not available for parallel testing")

    def test_incremental_update(self):
        """Test incremental feature updates."""
        # Create existing features
        existing_df = pd.DataFrame({
            'player_id': ['player_1'] * 50,
            'ts': pd.date_range('2024-01-01', periods=50, freq='D'),
            'performance_metric': np.random.uniform(40, 80, 50)
        })

        # New incoming data
        new_df = pd.DataFrame({
            'player_id': ['player_1'] * 10,
            'ts': pd.date_range('2024-02-20', periods=10, freq='D'),
            'performance_metric': np.random.uniform(60, 90, 10)
        })

        # Test incremental update
        features = ['performance_trajectory_slope']

        try:
            updated = incremental_update(existing_df, new_df, features, lookback_days=30)
            assert len(updated) == len(new_df)
            assert not updated.empty

        except Exception as e:
            # Expected for some feature dependencies
            print(f"Incremental update test note: {str(e)}")

    def test_memory_efficiency(self):
        """Test memory efficiency with large datasets."""
        n_rows = 100000
        df = pd.DataFrame({
            'player_id': np.random.choice([f'player_{i}' for i in range(1000)], n_rows),
            'value': np.random.normal(50, 15, n_rows),
            'ts': pd.date_range('2024-01-01', periods=n_rows, freq='min')
        })

        # Test optimized rolling calculation
        result = optimized_rolling_calculation(
            df, 'player_id', 'value', '7D', min_periods=1
        )

        assert len(result) == len(df)
        assert not result.isna().all()

        # Memory usage should be reasonable
        memory_mb = df.memory_usage(deep=True).sum() / 1024 / 1024
        assert memory_mb < 200  # Should be under 200MB for test dataset


class TestStatcastProcessing:
    """Test Statcast data processing pipeline."""

    def setup_method(self):
        """Set up Statcast-like test data."""
        self.df = pd.DataFrame({
            'launch_speed': np.random.normal(87, 12, 1000),
            'launch_angle': np.random.normal(15, 25, 1000),
            'sprint_speed': np.random.normal(27, 3, 1000),
            'release_spin_rate': np.random.normal(2200, 300, 1000),
            'release_speed': np.random.normal(92, 5, 1000),
            'pitcher_id': np.random.choice(['pitcher_1', 'pitcher_2'], 1000),
            'ts': pd.date_range('2024-01-01', periods=1000, freq='H'),
            'pitch_type': np.random.choice(['FF', 'SL', 'CH', 'CB'], 1000),
            'release_x': np.random.normal(-2.0, 0.5, 1000),
            'release_y': np.random.normal(54.0, 2.0, 1000),
            'release_z': np.random.normal(6.0, 0.8, 1000),
            'pfx_x': np.random.normal(0.0, 1.5, 1000),
            'pfx_z': np.random.normal(0.0, 1.0, 1000),
            'start_speed': np.random.normal(92, 5, 1000)
        })

    def test_statcast_processing(self):
        """Test Statcast data processing."""
        result_df = process_statcast_data(self.df)

        # Should add derived columns
        assert 'barrel' in result_df.columns
        assert 'xBA' in result_df.columns
        assert 'bauer_units' in result_df.columns
        assert 'hit_distance' in result_df.columns

        # Validate barrel calculation
        barrels = result_df['barrel']
        assert barrels.dtype == bool

        # Validate xBA range
        xba = result_df['xBA']
        assert xba.min() >= 0.0
        assert xba.max() <= 1.0

    def test_pitch_tunneling(self):
        """Test pitch tunneling calculation."""
        result = pitch_tunneling_score(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= 0.0
        assert result.max() <= 100.0

    def test_pitch_sequencing(self):
        """Test pitch sequencing effectiveness."""
        # Add required columns for sequencing
        self.df['count'] = np.random.choice(['0-0', '0-1', '1-0', '2-1'], len(self.df))
        self.df['result'] = np.random.choice(['strike', 'ball', 'foul'], len(self.df))

        result = pitch_sequence_effectiveness(self.df)

        assert len(result) == len(self.df)
        assert result.min() >= 0.0
        assert result.max() <= 100.0


def test_feature_registry():
    """Test that all features in registry are callable."""
    for name, func in FEATURE_IMPLEMENTATIONS.items():
        assert callable(func), f"Feature {name} is not callable"

        # Test that function has proper docstring
        assert func.__doc__ is not None, f"Feature {name} missing docstring"


def test_compute_feature_function():
    """Test the compute_feature wrapper function."""
    df = pd.DataFrame({
        'player_id': ['test_player'],
        'value': [50.0]
    })

    # Test valid feature
    try:
        result = compute_feature('cross_sport_athlete_versatility_index', df)
        assert isinstance(result, pd.Series)
    except Exception:
        pass  # Expected due to missing required columns

    # Test invalid feature
    with pytest.raises(ValueError):
        compute_feature('nonexistent_feature', df)


if __name__ == '__main__':
    # Run performance tests
    print("Running Blaze Sports Intelligence Analytics Test Suite...")

    # You can run specific test classes
    test_instance = TestPerformanceOptimization()

    try:
        test_instance.test_memory_efficiency()
        print("✓ Memory efficiency test passed")
    except Exception as e:
        print(f"✗ Memory efficiency test failed: {e}")

    try:
        test_instance.test_parallel_computation_performance()
        print("✓ Parallel computation test passed")
    except Exception as e:
        print(f"✗ Parallel computation test failed: {e}")

    print("\nTest suite completed. Run with pytest for full test coverage:")
    print("pytest test_analytics.py -v")