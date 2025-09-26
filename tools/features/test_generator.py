"""
Blaze Sports Intelligence Property-Based Test Generator

Automatically generates Hypothesis-based tests from YAML feature specifications.
Verifies numeric bounds, null handling, type constraints, and edge cases.
"""

import yaml
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
import hypothesis
from hypothesis import strategies as st
from hypothesis import given, assume, settings
import textwrap
import importlib.util
import sys


class PropertyTestGenerator:
    """Generate property-based tests from feature specifications."""

    def __init__(self, features_dir: str = "features", output_dir: str = "tests/features"):
        """
        Initialize test generator.

        Args:
            features_dir: Directory containing feature YAML files
            output_dir: Directory to write generated tests
        """
        self.features_dir = Path(features_dir)
        self.output_dir = Path(output_dir)
        self.features = {}
        self._load_features()

    def _load_features(self) -> None:
        """Load all feature definitions from YAML files."""
        self.features = {}

        for yaml_file in self.features_dir.glob("*.yaml"):
            try:
                with open(yaml_file, 'r') as f:
                    docs = list(yaml.safe_load_all(f))
                    for doc in docs:
                        if doc and 'name' in doc:
                            self.features[doc['name']] = doc
            except Exception as e:
                print(f"Warning: Error loading {yaml_file}: {e}")

    def _generate_data_strategy(self, feature_def: Dict[str, Any]) -> str:
        """
        Generate Hypothesis strategy for creating test data.

        Args:
            feature_def: Feature definition dictionary

        Returns:
            Python code string for Hypothesis strategy
        """
        dtype = feature_def.get("dtype", "float")
        validation = feature_def.get("validation", {})

        if dtype == "float":
            min_val = validation.get("min", -1000.0)
            max_val = validation.get("max", 1000.0)
            allow_nan = not validation.get("not_null", False)

            strategy = f"st.floats(min_value={min_val}, max_value={max_val}, "
            strategy += f"allow_nan={allow_nan}, allow_infinity=False)"

        elif dtype == "int":
            min_val = validation.get("min", -1000)
            max_val = validation.get("max", 1000)
            strategy = f"st.integers(min_value={int(min_val)}, max_value={int(max_val)})"

        elif dtype == "bool":
            strategy = "st.booleans()"

        elif dtype == "category":
            categories = validation.get("categories", ["cat1", "cat2", "cat3"])
            strategy = f"st.sampled_from({categories!r})"

        elif dtype == "datetime":
            strategy = "st.datetimes(min_value=datetime(2020, 1, 1), max_value=datetime(2025, 12, 31))"

        else:
            # Default to strings for unknown types
            strategy = "st.text(min_size=1, max_size=20)"

        return strategy

    def _generate_dataframe_strategy(self, feature_def: Dict[str, Any],
                                   required_columns: List[str]) -> str:
        """
        Generate strategy for creating test DataFrames.

        Args:
            feature_def: Feature definition dictionary
            required_columns: List of column names needed for the feature

        Returns:
            Python code string for DataFrame strategy
        """
        strategies = []

        # Add common columns that most features need
        base_columns = {
            "ts": "st.datetimes(min_value=datetime(2024, 1, 1), max_value=datetime(2025, 12, 31))",
            "game_no": "st.integers(min_value=1, max_value=162)",  # Baseball season length
            "team_id": "st.sampled_from(['STL', 'TEN', 'TEX', 'MEM'])",  # Our focus teams
            "season": "st.integers(min_value=2020, max_value=2025)"
        }

        # Add sport-specific columns based on sport scope
        sport_scope = feature_def.get("sport_scope", [])

        if "baseball" in sport_scope:
            base_columns.update({
                "batter_id": "st.integers(min_value=1, max_value=1000)",
                "pitcher_id": "st.integers(min_value=1, max_value=500)",
                "exit_velocity": "st.floats(min_value=50.0, max_value=120.0)",
                "launch_angle": "st.floats(min_value=-50.0, max_value=50.0)",
                "spin_rate": "st.integers(min_value=1500, max_value=3500)",
                "velocity": "st.floats(min_value=70.0, max_value=105.0)",
                "swing": "st.booleans()",
                "whiff": "st.booleans()",
                "pitches": "st.integers(min_value=0, max_value=50)",
                "back_to_back": "st.booleans()",
                "role": "st.sampled_from(['SP', 'RP'])",
                "leverage_index": "st.floats(min_value=0.1, max_value=5.0)",
                "win_probability_added": "st.floats(min_value=-1.0, max_value=1.0)",
                "tto": "st.integers(min_value=1, max_value=4)",
                "woba_value": "st.floats(min_value=0.0, max_value=2.0)",
                "sprint_speed": "st.floats(min_value=20.0, max_value=32.0)",
                "sz_bot": "st.floats(min_value=1.0, max_value=2.5)",
                "plate_z": "st.floats(min_value=-1.0, max_value=5.0)"
            })

        if "football" in sport_scope:
            base_columns.update({
                "qb_id": "st.integers(min_value=1, max_value=100)",
                "rb_id": "st.integers(min_value=1, max_value=200)",
                "offense_team": "st.sampled_from(['TEN', 'TEX'])",
                "defense_team": "st.sampled_from(['TEN', 'TEX'])",
                "pressure": "st.booleans()",
                "sack": "st.booleans()",
                "expected_points_added": "st.floats(min_value=-7.0, max_value=7.0)",
                "rushing_yards": "st.integers(min_value=-10, max_value=80)",
                "yards_before_contact": "st.integers(min_value=0, max_value=20)",
                "opp_pass_block_win_rate": "st.floats(min_value=0.3, max_value=0.8)",
                "pass_block_win": "st.booleans()",
                "oline_unit_id": "st.integers(min_value=1, max_value=50)",
                "drive_id": "st.integers(min_value=1, max_value=20)",
                "start_yardline": "st.integers(min_value=1, max_value=99)",
                "expected_start": "st.integers(min_value=1, max_value=99)",
                "return_yards": "st.integers(min_value=0, max_value=100)",
                "penalty_yards": "st.integers(min_value=0, max_value=50)"
            })

        if "basketball" in sport_scope:
            base_columns.update({
                "player_id": "st.integers(min_value=1, max_value=500)",
                "possessions": "st.integers(min_value=50, max_value=120)",
                "field_goals_made": "st.integers(min_value=0, max_value=30)",
                "field_goals_attempted": "st.integers(min_value=0, max_value=40)",
                "three_point_made": "st.integers(min_value=0, max_value=15)",
                "three_point_attempted": "st.integers(min_value=0, max_value=20)",
                "assists": "st.integers(min_value=0, max_value=20)",
                "turnovers": "st.integers(min_value=0, max_value=10)",
                "points_allowed": "st.integers(min_value=60, max_value=150)"
            })

        # NIL-specific columns
        if any(tag in feature_def.get("tags", []) for tag in ["nil", "social_media"]):
            base_columns.update({
                "instagram_followers": "st.integers(min_value=100, max_value=1000000)",
                "tiktok_views": "st.integers(min_value=1000, max_value=10000000)",
                "twitter_engagement": "st.floats(min_value=0.01, max_value=0.20)",
                "video_analysis_confidence": "st.floats(min_value=0.5, max_value=1.0)",
                "leadership_events": "st.integers(min_value=0, max_value=20)",
                "teammate_interactions": "st.integers(min_value=0, max_value=100)"
            })

        # Perfect Game specific columns
        if "perfect_game" in feature_def.get("tags", []):
            base_columns.update({
                "player_id": "st.integers(min_value=1, max_value=10000)",
                "exit_velocity": "st.floats(min_value=60.0, max_value=110.0)",
                "pop_time": "st.floats(min_value=1.8, max_value=2.4)",
                "sixty_yard_dash": "st.floats(min_value=6.2, max_value=8.0)",
                "hitting_grade": "st.integers(min_value=20, max_value=80)",
                "power_grade": "st.integers(min_value=20, max_value=80)",
                "speed_grade": "st.integers(min_value=20, max_value=80)",
                "fielding_grade": "st.integers(min_value=20, max_value=80)",
                "arm_grade": "st.integers(min_value=20, max_value=80)"
            })

        # Build strategy code
        strategy_lines = []
        for col in required_columns:
            if col in base_columns:
                strategy_lines.append(f"        '{col}': {base_columns[col]},")
            else:
                # Default strategy for unknown columns
                strategy_lines.append(f"        '{col}': st.integers(min_value=0, max_value=100),")

        strategy_code = f"""st.fixed_dictionaries({{
{chr(10).join(strategy_lines)}
    }}).map(lambda d: pd.DataFrame([d] * st.integers(min_value=10, max_value=100).example()))"""

        return strategy_code

    def _infer_required_columns(self, feature_name: str, feature_def: Dict[str, Any]) -> List[str]:
        """
        Infer required columns for a feature based on its name and definition.

        Args:
            feature_name: Name of the feature
            feature_def: Feature definition dictionary

        Returns:
            List of required column names
        """
        columns = ["ts"]  # Almost all features need timestamp

        # Infer from feature name patterns
        if "batter" in feature_name:
            columns.extend(["batter_id", "game_no"])
        if "pitcher" in feature_name:
            columns.extend(["pitcher_id", "game_no"])
        if "qb" in feature_name:
            columns.extend(["qb_id", "game_no"])
        if "rb" in feature_name:
            columns.extend(["rb_id", "game_no"])

        # Infer from feature description and tags
        description = feature_def.get("description", "").lower()
        tags = [tag.lower() for tag in feature_def.get("tags", [])]

        if any(keyword in description for keyword in ["exit velocity", "barrel"]):
            columns.extend(["exit_velocity", "launch_angle"])
        if any(keyword in description for keyword in ["pressure", "sack"]):
            columns.extend(["pressure", "sack"])
        if "fatigue" in description:
            columns.extend(["pitches", "back_to_back", "role"])
        if "leverage" in description:
            columns.extend(["leverage_index", "win_probability_added"])
        if "sprint speed" in description:
            columns.extend(["sprint_speed"])
        if "chase rate" in description:
            columns.extend(["swing", "sz_bot", "plate_z"])

        # Sport-specific columns
        sport_scope = feature_def.get("sport_scope", [])
        if "baseball" in sport_scope:
            if not any(col in columns for col in ["batter_id", "pitcher_id"]):
                columns.append("batter_id")  # Default to batter if unclear
        if "football" in sport_scope:
            if not any(col in columns for col in ["qb_id", "rb_id"]):
                columns.append("qb_id")  # Default to QB if unclear

        # NIL features
        if "nil" in tags:
            columns.extend(["instagram_followers", "tiktok_views", "twitter_engagement"])

        return list(set(columns))  # Remove duplicates

    def generate_test_file(self, feature_name: str, feature_def: Dict[str, Any]) -> str:
        """
        Generate complete test file for a feature.

        Args:
            feature_name: Name of the feature
            feature_def: Feature definition dictionary

        Returns:
            Complete Python test file content
        """
        dtype = feature_def.get("dtype", "float")
        validation = feature_def.get("validation", {})
        required_cols = self._infer_required_columns(feature_name, feature_def)

        # Generate test class
        class_name = "".join(word.capitalize() for word in feature_name.split("_")) + "Test"

        test_content = f'''"""
Auto-generated property-based tests for {feature_name}

Generated from YAML specification:
{yaml.dump(feature_def, default_flow_style=False, indent=2)}

DO NOT EDIT MANUALLY - Run test_generator.py to regenerate
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import hypothesis
from hypothesis import given, strategies as st, assume, settings
import sys
from pathlib import Path

# Add features module to path
sys.path.append(str(Path(__file__).parent.parent.parent))
from features_impl import compute_feature, validate_feature_output


class {class_name}:
    """Property-based tests for {feature_name} feature."""

    @given(df=st.fixed_dictionaries({{
        'batter_id': st.integers(min_value=1, max_value=1000),
        'pitcher_id': st.integers(min_value=1, max_value=500),
        'qb_id': st.integers(min_value=1, max_value=100),
        'rb_id': st.integers(min_value=1, max_value=200),
        'player_id': st.integers(min_value=1, max_value=10000),
        'team_id': st.sampled_from(['STL', 'TEN', 'TEX', 'MEM']),
        'offense_team': st.sampled_from(['TEN', 'TEX']),
        'ts': st.datetimes(min_value=datetime(2024, 1, 1), max_value=datetime(2025, 12, 31)),
        'game_no': st.integers(min_value=1, max_value=162),
        'season': st.integers(min_value=2020, max_value=2025),
        'exit_velocity': st.floats(min_value=50.0, max_value=120.0, allow_nan=False),
        'launch_angle': st.floats(min_value=-50.0, max_value=50.0, allow_nan=False),
        'spin_rate': st.integers(min_value=1500, max_value=3500),
        'velocity': st.floats(min_value=70.0, max_value=105.0, allow_nan=False),
        'swing': st.booleans(),
        'whiff': st.booleans(),
        'pitches': st.integers(min_value=0, max_value=50),
        'back_to_back': st.booleans(),
        'role': st.sampled_from(['SP', 'RP']),
        'leverage_index': st.floats(min_value=0.1, max_value=5.0, allow_nan=False),
        'win_probability_added': st.floats(min_value=-1.0, max_value=1.0, allow_nan=False),
        'tto': st.integers(min_value=1, max_value=4),
        'woba_value': st.floats(min_value=0.0, max_value=2.0, allow_nan=False),
        'sprint_speed': st.floats(min_value=20.0, max_value=32.0, allow_nan=False),
        'sz_bot': st.floats(min_value=1.0, max_value=2.5, allow_nan=False),
        'plate_z': st.floats(min_value=-1.0, max_value=5.0, allow_nan=False),
        'pressure': st.booleans(),
        'sack': st.booleans(),
        'expected_points_added': st.floats(min_value=-7.0, max_value=7.0, allow_nan=False),
        'rushing_yards': st.integers(min_value=-10, max_value=80),
        'yards_before_contact': st.integers(min_value=0, max_value=20),
        'opp_pass_block_win_rate': st.floats(min_value=0.3, max_value=0.8, allow_nan=False),
        'pass_block_win': st.booleans(),
        'oline_unit_id': st.integers(min_value=1, max_value=50),
        'drive_id': st.integers(min_value=1, max_value=20),
        'start_yardline': st.integers(min_value=1, max_value=99),
        'expected_start': st.integers(min_value=1, max_value=99),
        'return_yards': st.integers(min_value=0, max_value=100),
        'penalty_yards': st.integers(min_value=0, max_value=50),
        'instagram_followers': st.integers(min_value=100, max_value=1000000),
        'tiktok_views': st.integers(min_value=1000, max_value=10000000),
        'twitter_engagement': st.floats(min_value=0.01, max_value=0.20, allow_nan=False),
        'video_analysis_confidence': st.floats(min_value=0.5, max_value=1.0, allow_nan=False),
    }}).map(lambda d: pd.DataFrame([{{k: v for k, v in d.items()}}] * np.random.randint(10, 100))))
    @settings(max_examples=50, deadline=5000)
    def test_feature_bounds(self, df):
        """Test that feature output respects defined bounds."""
        assume(len(df) > 0)

        try:
            result = compute_feature("{feature_name}", df)
            assert isinstance(result, pd.Series), "Feature must return pd.Series"
            assert len(result) == len(df), "Result length must match input length"

            # Test bounds based on validation rules
'''

        # Add specific bound tests
        if "min" in validation:
            min_val = validation["min"]
            test_content += f'''
            # Minimum bound check
            if not result.isnull().all():
                assert result.min() >= {min_val}, f"Feature values below minimum {min_val}: {{result.min()}}"'''

        if "max" in validation:
            max_val = validation["max"]
            test_content += f'''
            # Maximum bound check
            if not result.isnull().all():
                assert result.max() <= {max_val}, f"Feature values above maximum {max_val}: {{result.max()}}"'''

        if validation.get("not_null", False):
            test_content += '''
            # Null check
            assert not result.isnull().any(), "Feature should not contain null values"'''

        test_content += '''

        except Exception as e:
            # Allow features to fail gracefully with insufficient data
            if "Insufficient data" in str(e) or len(df) < 5:
                assume(False)  # Skip this test case
            else:
                raise

    @given(df=st.fixed_dictionaries({
        'batter_id': st.integers(min_value=1, max_value=10),
        'pitcher_id': st.integers(min_value=1, max_value=10),
        'qb_id': st.integers(min_value=1, max_value=10),
        'ts': st.datetimes(min_value=datetime(2024, 1, 1), max_value=datetime(2024, 1, 10)),
        'game_no': st.integers(min_value=1, max_value=5),
    }).map(lambda d: pd.DataFrame([{k: v for k, v in d.items()}] * 5)))
    @settings(max_examples=10)
    def test_feature_edge_cases(self, df):
        """Test feature behavior with edge cases."""
        try:
            # Test with minimal data
            result = compute_feature("''' + feature_name + '''", df)

            # Basic sanity checks
            if not result.empty:
                assert result.dtype != object or result.dtype.name == 'category', "Unexpected object dtype"

        except (ValueError, RuntimeError):
            # Expected behavior for insufficient data
            pass

    def test_feature_empty_dataframe(self):
        """Test feature behavior with empty DataFrame."""
        empty_df = pd.DataFrame()

        with pytest.raises((ValueError, KeyError, RuntimeError)):
            compute_feature("''' + feature_name + '''", empty_df)

    def test_feature_single_row(self):
        """Test feature with single row of data."""
        single_row = pd.DataFrame({
            'batter_id': [1],
            'pitcher_id': [1],
            'qb_id': [1],
            'ts': [datetime(2024, 1, 1)],
            'game_no': [1],
            'exit_velocity': [95.0],
            'launch_angle': [15.0],
            'swing': [True],
            'whiff': [False],
        })

        try:
            result = compute_feature("''' + feature_name + '''", single_row)
            assert len(result) == 1, "Single row should produce single result"
        except (ValueError, RuntimeError) as e:
            # Some features may require minimum data
            if "Insufficient data" in str(e):
                pytest.skip("Feature requires minimum data size")
            else:
                raise

    @given(df=st.fixed_dictionaries({
        'batter_id': st.integers(min_value=1, max_value=1000),
        'ts': st.datetimes(min_value=datetime(2024, 1, 1), max_value=datetime(2025, 1, 1)),
        'exit_velocity': st.one_of(st.none(), st.floats(min_value=50, max_value=120, allow_nan=False)),
        'launch_angle': st.one_of(st.none(), st.floats(min_value=-50, max_value=50, allow_nan=False)),
    }).map(lambda d: pd.DataFrame([d] * np.random.randint(5, 20))))
    @settings(max_examples=20)
    def test_feature_missing_data(self, df):
        """Test feature robustness with missing data."""
        try:
            result = compute_feature("''' + feature_name + '''", df)

            # Check that function handles missing data gracefully
            if result is not None:
                assert isinstance(result, pd.Series), "Must return Series even with missing data"

        except (ValueError, RuntimeError, KeyError):
            # Expected for features that require specific columns
            pass'''

        # Add categorical tests if applicable
        if dtype == "category" and "categories" in validation:
            categories = validation["categories"]
            test_content += f'''

    def test_categorical_values(self):
        """Test that categorical feature returns only allowed values."""
        # Create test data that should produce all categories
        test_df = pd.DataFrame({{
            'batter_id': range(1, 21),
            'ts': [datetime(2024, 1, 1)] * 20,
            'game_no': [1] * 20,
        }})

        result = compute_feature("{feature_name}", test_df)
        allowed_categories = {categories!r}

        # Check that all non-null values are in allowed categories
        if not result.isnull().all():
            unique_values = set(result.dropna().unique())
            invalid_values = unique_values - set(allowed_categories)
            assert not invalid_values, f"Invalid categories found: {{invalid_values}}"'''

        test_content += '''


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
'''

        return textwrap.dedent(test_content)

    def generate_all_tests(self, overwrite: bool = False) -> Dict[str, str]:
        """
        Generate test files for all features.

        Args:
            overwrite: Whether to overwrite existing test files

        Returns:
            Dictionary mapping feature names to generated file paths
        """
        self.output_dir.mkdir(parents=True, exist_ok=True)

        generated_files = {}

        for feature_name, feature_def in self.features.items():
            test_filename = f"test_{feature_name}.py"
            test_filepath = self.output_dir / test_filename

            if test_filepath.exists() and not overwrite:
                print(f"Skipping {test_filename} (already exists)")
                continue

            test_content = self.generate_test_file(feature_name, feature_def)

            with open(test_filepath, 'w') as f:
                f.write(test_content)

            generated_files[feature_name] = str(test_filepath)
            print(f"Generated {test_filename}")

        # Generate test runner
        self._generate_test_runner()

        return generated_files

    def _generate_test_runner(self) -> None:
        """Generate a test runner script for all feature tests."""
        runner_content = '''#!/usr/bin/env python3
"""
Blaze Sports Intelligence Feature Test Runner

Runs all generated property-based tests for features.
"""

import pytest
import sys
from pathlib import Path
import importlib

def run_all_feature_tests():
    """Run all generated feature tests."""
    test_dir = Path(__file__).parent

    # Collect all test files
    test_files = list(test_dir.glob("test_*.py"))

    if not test_files:
        print("No test files found!")
        return 1

    print(f"Running tests for {len(test_files)} features...")

    # Run pytest with our test files
    args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "-x",  # Stop on first failure
        "--hypothesis-show-statistics",
    ]

    return pytest.main(args)

if __name__ == "__main__":
    exit(run_all_feature_tests())
'''

        runner_path = self.output_dir / "run_all_tests.py"
        with open(runner_path, 'w') as f:
            f.write(runner_content)

        runner_path.chmod(0o755)  # Make executable
        print(f"Generated test runner: {runner_path}")


def main():
    """CLI entry point for test generation."""
    import argparse

    parser = argparse.ArgumentParser(description="Generate property-based tests for features")
    parser.add_argument("--features-dir", default="features", help="Features directory")
    parser.add_argument("--output-dir", default="tests/features", help="Output directory")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing tests")
    parser.add_argument("--feature", help="Generate test for specific feature only")

    args = parser.parse_args()

    generator = PropertyTestGenerator(args.features_dir, args.output_dir)

    if args.feature:
        if args.feature not in generator.features:
            print(f"Feature '{args.feature}' not found!")
            return 1

        feature_def = generator.features[args.feature]
        test_content = generator.generate_test_file(args.feature, feature_def)

        output_file = Path(args.output_dir) / f"test_{args.feature}.py"
        output_file.parent.mkdir(parents=True, exist_ok=True)

        with open(output_file, 'w') as f:
            f.write(test_content)

        print(f"Generated test for {args.feature}: {output_file}")
    else:
        generated = generator.generate_all_tests(args.overwrite)
        print(f"\nGenerated {len(generated)} test files")

    return 0


if __name__ == "__main__":
    exit(main())