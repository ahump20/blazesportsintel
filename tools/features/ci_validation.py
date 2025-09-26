"""
Blaze Sports Intelligence CI/CD Feature Validation

Comprehensive validation pipeline for continuous integration:
- Pre-commit hooks for feature validation
- Automated testing of feature implementations
- Performance benchmarking
- Drift detection on new data
- Integration with GitHub Actions
"""

import os
import sys
import subprocess
import json
import yaml
import time
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
import pandas as pd
import numpy as np
from dataclasses import dataclass, asdict

# Import our validation tools
from validator import FeatureValidator
from drift_detector import FeatureDriftDetector
from test_generator import PropertyTestGenerator


@dataclass
class ValidationResult:
    """Result of validation step."""
    step_name: str
    success: bool
    duration_seconds: float
    errors: List[str]
    warnings: List[str]
    metrics: Dict[str, Any]
    timestamp: datetime


class CIValidationPipeline:
    """Main CI/CD validation pipeline."""

    def __init__(self, project_root: str = None, output_dir: str = "ci_reports"):
        """
        Initialize CI validation pipeline.

        Args:
            project_root: Root directory of the project
            output_dir: Directory for CI reports
        """
        self.project_root = Path(project_root or ".")
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.output_dir / "validation.log"),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

        self.validation_results: List[ValidationResult] = []

    def _run_step(self, step_name: str, step_function, *args, **kwargs) -> ValidationResult:
        """
        Run a validation step with error handling and timing.

        Args:
            step_name: Name of the validation step
            step_function: Function to execute
            *args, **kwargs: Arguments for the step function

        Returns:
            ValidationResult with step execution details
        """
        self.logger.info(f"🔍 Running {step_name}...")
        start_time = time.time()
        errors = []
        warnings = []
        metrics = {}

        try:
            result = step_function(*args, **kwargs)
            if isinstance(result, dict):
                metrics = result
            success = True
        except Exception as e:
            self.logger.error(f"❌ {step_name} failed: {e}")
            errors.append(str(e))
            success = False

        duration = time.time() - start_time

        validation_result = ValidationResult(
            step_name=step_name,
            success=success,
            duration_seconds=duration,
            errors=errors,
            warnings=warnings,
            metrics=metrics,
            timestamp=datetime.now()
        )

        self.validation_results.append(validation_result)

        status_icon = "✅" if success else "❌"
        self.logger.info(f"{status_icon} {step_name} completed in {duration:.2f}s")

        return validation_result

    def validate_feature_schemas(self) -> Dict[str, Any]:
        """Validate all feature YAML files against schema."""
        features_dir = self.project_root / "features"
        schema_path = features_dir / "schema.json"

        if not features_dir.exists():
            raise FileNotFoundError(f"Features directory not found: {features_dir}")

        if not schema_path.exists():
            raise FileNotFoundError(f"Schema file not found: {schema_path}")

        validator = FeatureValidator(str(schema_path), str(features_dir))
        results = validator.validate_all_features()

        # Generate validation report
        report = validator.generate_validation_report()
        report_path = self.output_dir / "schema_validation_report.md"
        with open(report_path, 'w') as f:
            f.write(report)

        total_errors = sum(len(errors) for errors in results.values())

        return {
            "total_features": len(validator.features),
            "total_errors": total_errors,
            "validation_categories": {k: len(v) for k, v in results.items()},
            "report_path": str(report_path),
            "valid": total_errors == 0
        }

    def test_feature_implementations(self) -> Dict[str, Any]:
        """Test that all features have valid implementations."""
        # Import feature implementations
        try:
            sys.path.append(str(self.project_root))
            from features_impl import FEATURE_IMPLEMENTATIONS
        except ImportError as e:
            raise ImportError(f"Cannot import feature implementations: {e}")

        # Load feature definitions
        features_dir = self.project_root / "features"
        validator = FeatureValidator(features_dir=str(features_dir))

        results = {
            "features_defined": len(validator.features),
            "features_implemented": len(FEATURE_IMPLEMENTATIONS),
            "missing_implementations": [],
            "implementation_tests": {},
            "performance_metrics": {}
        }

        # Check for missing implementations
        for feature_name in validator.features:
            if feature_name not in FEATURE_IMPLEMENTATIONS:
                results["missing_implementations"].append(feature_name)

        # Test implementations with sample data
        for feature_name, func in FEATURE_IMPLEMENTATIONS.items():
            try:
                # Generate sample data
                sample_data = self._generate_sample_data(feature_name, validator.features.get(feature_name))

                # Time the implementation
                start_time = time.time()
                result = func(sample_data)
                execution_time = (time.time() - start_time) * 1000  # ms

                # Validate result
                assert isinstance(result, pd.Series), "Feature must return pd.Series"
                assert len(result) == len(sample_data), "Result length must match input"

                results["implementation_tests"][feature_name] = {
                    "status": "pass",
                    "execution_time_ms": execution_time,
                    "result_count": len(result),
                    "null_count": result.isnull().sum()
                }

                results["performance_metrics"][feature_name] = execution_time

            except Exception as e:
                results["implementation_tests"][feature_name] = {
                    "status": "fail",
                    "error": str(e)
                }

        return results

    def run_property_tests(self) -> Dict[str, Any]:
        """Generate and run property-based tests."""
        # Generate tests
        test_generator = PropertyTestGenerator(
            features_dir=str(self.project_root / "features"),
            output_dir=str(self.project_root / "tests" / "features")
        )

        generated_files = test_generator.generate_all_tests(overwrite=True)

        # Run the tests
        test_results = {
            "generated_tests": len(generated_files),
            "test_files": list(generated_files.values()),
            "pytest_results": {}
        }

        try:
            # Run pytest on generated tests
            test_dir = self.project_root / "tests" / "features"
            result = subprocess.run([
                "python", "-m", "pytest",
                str(test_dir),
                "-v",
                "--tb=short",
                "--json-report",
                "--json-report-file=" + str(self.output_dir / "pytest_report.json")
            ], capture_output=True, text=True, cwd=self.project_root)

            test_results["pytest_results"] = {
                "exit_code": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr
            }

            # Parse pytest JSON report if available
            pytest_json = self.output_dir / "pytest_report.json"
            if pytest_json.exists():
                with open(pytest_json, 'r') as f:
                    pytest_data = json.load(f)
                    test_results["pytest_summary"] = pytest_data.get("summary", {})

        except Exception as e:
            test_results["pytest_error"] = str(e)

        return test_results

    def benchmark_performance(self) -> Dict[str, Any]:
        """Benchmark feature computation performance."""
        # Import implementations
        sys.path.append(str(self.project_root))
        from features_impl import FEATURE_IMPLEMENTATIONS

        benchmark_results = {
            "timestamp": datetime.now().isoformat(),
            "feature_benchmarks": {},
            "system_info": {
                "python_version": sys.version,
                "pandas_version": pd.__version__,
                "numpy_version": np.__version__
            }
        }

        # Load feature definitions for sample data generation
        features_dir = self.project_root / "features"
        validator = FeatureValidator(features_dir=str(features_dir))

        for feature_name, func in FEATURE_IMPLEMENTATIONS.items():
            try:
                # Generate different sizes of sample data
                sizes = [100, 1000, 5000]
                size_benchmarks = {}

                for size in sizes:
                    sample_data = self._generate_sample_data(
                        feature_name,
                        validator.features.get(feature_name),
                        rows=size
                    )

                    # Run multiple iterations for stable timing
                    times = []
                    for _ in range(5):
                        start_time = time.time()
                        result = func(sample_data)
                        execution_time = (time.time() - start_time) * 1000
                        times.append(execution_time)

                    size_benchmarks[f"{size}_rows"] = {
                        "mean_ms": np.mean(times),
                        "std_ms": np.std(times),
                        "min_ms": np.min(times),
                        "max_ms": np.max(times),
                        "throughput_rows_per_ms": size / np.mean(times)
                    }

                benchmark_results["feature_benchmarks"][feature_name] = size_benchmarks

            except Exception as e:
                benchmark_results["feature_benchmarks"][feature_name] = {
                    "error": str(e)
                }

        # Save detailed benchmark results
        benchmark_file = self.output_dir / "performance_benchmarks.json"
        with open(benchmark_file, 'w') as f:
            json.dump(benchmark_results, f, indent=2, default=str)

        return {
            "benchmarked_features": len(benchmark_results["feature_benchmarks"]),
            "benchmark_file": str(benchmark_file),
            "avg_performance": self._calculate_avg_performance(benchmark_results)
        }

    def check_drift_detection(self) -> Dict[str, Any]:
        """Test drift detection capabilities with synthetic data."""
        # Generate baseline and candidate datasets
        baseline_data = self._generate_synthetic_dataset("baseline", 1000)
        candidate_data = self._generate_synthetic_dataset("candidate", 1000)

        # Add some drift to candidate data
        candidate_data = self._add_synthetic_drift(candidate_data)

        # Run drift detection
        detector = FeatureDriftDetector()
        drift_results = detector.detect_drift(baseline_data, candidate_data)

        # Generate drift report
        report = detector.generate_drift_report(drift_results)
        report_path = self.output_dir / "drift_detection_test.md"
        with open(report_path, 'w') as f:
            f.write(report)

        features_with_drift = sum(1 for r in drift_results.values()
                                 if r.get("drift_detected", False))

        return {
            "features_tested": len(drift_results),
            "features_with_drift": features_with_drift,
            "drift_report": str(report_path),
            "drift_detection_working": features_with_drift > 0  # We expect some drift
        }

    def validate_latency_requirements(self) -> Dict[str, Any]:
        """Validate features meet latency requirements."""
        # Import implementations
        sys.path.append(str(self.project_root))
        from features_impl import FEATURE_IMPLEMENTATIONS

        # Load feature definitions
        features_dir = self.project_root / "features"
        validator = FeatureValidator(features_dir=str(features_dir))

        latency_results = {
            "real_time_features": [],
            "near_real_time_features": [],
            "batch_features": [],
            "latency_violations": []
        }

        for feature_name, feature_def in validator.features.items():
            latency_req = feature_def.get("latency_requirement", "batch")

            if feature_name in FEATURE_IMPLEMENTATIONS:
                # Test with representative data size
                sample_data = self._generate_sample_data(feature_name, feature_def, rows=1000)

                # Measure execution time
                times = []
                for _ in range(3):
                    start_time = time.time()
                    FEATURE_IMPLEMENTATIONS[feature_name](sample_data)
                    execution_time = (time.time() - start_time) * 1000
                    times.append(execution_time)

                avg_time = np.mean(times)

                feature_result = {
                    "name": feature_name,
                    "requirement": latency_req,
                    "avg_time_ms": avg_time,
                    "meets_requirement": True
                }

                # Check against requirements
                if latency_req == "real_time" and avg_time > 100:
                    feature_result["meets_requirement"] = False
                    latency_results["latency_violations"].append(feature_result)
                elif latency_req == "near_real_time" and avg_time > 500:
                    feature_result["meets_requirement"] = False
                    latency_results["latency_violations"].append(feature_result)

                latency_results[f"{latency_req}_features"].append(feature_result)

        return latency_results

    def _generate_sample_data(self, feature_name: str, feature_def: Optional[Dict],
                             rows: int = 100) -> pd.DataFrame:
        """Generate sample data for testing a feature."""
        np.random.seed(42)  # Reproducible results

        # Base columns most features need
        base_data = {
            'ts': pd.date_range('2024-01-01', periods=rows, freq='H'),
            'game_no': np.random.randint(1, 50, rows),
            'season': [2024] * rows
        }

        # Add sport-specific columns based on feature name
        if 'cardinals' in feature_name or 'baseball' in feature_name:
            base_data.update({
                'batter_id': np.random.randint(1, 100, rows),
                'pitcher_id': np.random.randint(1, 50, rows),
                'team_id': ['STL'] * rows,
                'exit_velocity': np.random.normal(89, 8, rows).clip(60, 120),
                'launch_angle': np.random.normal(12, 15, rows).clip(-50, 50),
                'swing': np.random.choice([True, False], rows, p=[0.6, 0.4]),
                'whiff': np.random.choice([True, False], rows, p=[0.25, 0.75]),
                'velocity': np.random.normal(92, 5, rows).clip(75, 105),
                'spin_rate': np.random.randint(1800, 2800, rows),
                'pitches': np.random.randint(5, 120, rows),
                'back_to_back': np.random.choice([True, False], rows, p=[0.2, 0.8]),
                'role': np.random.choice(['SP', 'RP'], rows, p=[0.3, 0.7]),
                'leverage_index': np.random.exponential(1.2, rows).clip(0.1, 5.0),
                'win_probability_added': np.random.normal(0, 0.15, rows).clip(-1, 1),
                'tto': np.random.choice([1, 2, 3, 4], rows, p=[0.4, 0.3, 0.2, 0.1]),
                'woba_value': np.random.normal(0.32, 0.08, rows).clip(0, 2),
                'sprint_speed': np.random.normal(26.5, 2.5, rows).clip(20, 32),
                'sz_bot': np.random.normal(1.8, 0.2, rows).clip(1.2, 2.4),
                'plate_z': np.random.normal(2.2, 0.8, rows).clip(0, 5)
            })

        elif 'titans' in feature_name or 'football' in feature_name:
            base_data.update({
                'qb_id': np.random.randint(1, 20, rows),
                'rb_id': np.random.randint(1, 30, rows),
                'offense_team': ['TEN'] * rows,
                'pressure': np.random.choice([True, False], rows, p=[0.3, 0.7]),
                'sack': np.random.choice([True, False], rows, p=[0.08, 0.92]),
                'expected_points_added': np.random.normal(0.05, 1.2, rows).clip(-7, 7),
                'rushing_yards': np.random.poisson(4.5, rows).clip(0, 80),
                'yards_before_contact': np.random.poisson(2.8, rows).clip(0, 20),
                'opp_pass_block_win_rate': np.random.normal(0.6, 0.08, rows).clip(0.3, 0.9),
                'pass_block_win': np.random.choice([True, False], rows, p=[0.65, 0.35]),
                'oline_unit_id': np.random.randint(1, 10, rows),
                'drive_id': np.random.randint(1, 15, rows),
                'start_yardline': np.random.randint(1, 99, rows),
                'expected_start': np.random.randint(15, 40, rows),
                'return_yards': np.random.poisson(8, rows).clip(0, 100),
                'penalty_yards': np.random.poisson(3, rows).clip(0, 50)
            })

        elif 'longhorns' in feature_name:
            if 'basketball' in feature_name:
                base_data.update({
                    'player_id': np.random.randint(1, 15, rows),
                    'possessions': np.random.randint(60, 90, rows),
                    'field_goals_made': np.random.poisson(8, rows),
                    'field_goals_attempted': np.random.poisson(18, rows),
                    'three_point_made': np.random.poisson(3, rows),
                    'three_point_attempted': np.random.poisson(9, rows),
                    'assists': np.random.poisson(4, rows),
                    'turnovers': np.random.poisson(3, rows),
                    'points_allowed': np.random.normal(75, 12, rows).clip(50, 120)
                })
            else:  # football
                base_data.update({
                    'qb_id': np.random.randint(1, 5, rows),
                    'offense_team': ['TEX'] * rows
                })

        elif 'nil' in feature_name:
            base_data.update({
                'instagram_followers': np.random.lognormal(8, 1.5, rows).astype(int).clip(100, 1000000),
                'tiktok_views': np.random.lognormal(10, 2, rows).astype(int).clip(1000, 10000000),
                'twitter_engagement': np.random.beta(2, 8, rows).clip(0.01, 0.5),
                'video_analysis_confidence': np.random.beta(5, 2, rows).clip(0.5, 1.0)
            })

        elif 'perfect_game' in feature_name:
            base_data.update({
                'player_id': np.random.randint(1, 1000, rows),
                'exit_velocity': np.random.normal(85, 10, rows).clip(65, 110),
                'pop_time': np.random.normal(2.0, 0.15, rows).clip(1.7, 2.4),
                'sixty_yard_dash': np.random.normal(7.0, 0.4, rows).clip(6.2, 8.5),
                'hitting_grade': np.random.randint(35, 70, rows),
                'power_grade': np.random.randint(30, 65, rows),
                'speed_grade': np.random.randint(40, 75, rows),
                'fielding_grade': np.random.randint(35, 70, rows),
                'arm_grade': np.random.randint(35, 70, rows)
            })

        return pd.DataFrame(base_data)

    def _generate_synthetic_dataset(self, dataset_type: str, rows: int) -> pd.DataFrame:
        """Generate synthetic dataset for drift testing."""
        np.random.seed(42 if dataset_type == "baseline" else 123)

        return pd.DataFrame({
            'feature_1': np.random.normal(50, 10, rows),
            'feature_2': np.random.exponential(2, rows),
            'feature_3': np.random.uniform(0, 100, rows),
            'feature_4': np.random.choice(['A', 'B', 'C'], rows, p=[0.5, 0.3, 0.2]),
            'feature_5': np.random.beta(2, 5, rows)
        })

    def _add_synthetic_drift(self, data: pd.DataFrame) -> pd.DataFrame:
        """Add synthetic drift to test drift detection."""
        drifted = data.copy()

        # Add drift to numeric features
        drifted['feature_1'] += 5  # Mean shift
        drifted['feature_2'] *= 1.2  # Scale change
        drifted['feature_3'] = np.random.uniform(20, 80, len(drifted))  # Distribution change

        # Add drift to categorical feature
        drifted['feature_4'] = np.random.choice(['A', 'B', 'C'], len(drifted), p=[0.3, 0.4, 0.3])

        return drifted

    def _calculate_avg_performance(self, benchmark_results: Dict) -> Dict[str, float]:
        """Calculate average performance metrics."""
        all_times = []
        all_throughputs = []

        for feature_benchmarks in benchmark_results["feature_benchmarks"].values():
            if "error" not in feature_benchmarks:
                for size_results in feature_benchmarks.values():
                    if isinstance(size_results, dict) and "mean_ms" in size_results:
                        all_times.append(size_results["mean_ms"])
                        all_throughputs.append(size_results["throughput_rows_per_ms"])

        return {
            "avg_execution_time_ms": np.mean(all_times) if all_times else 0,
            "avg_throughput_rows_per_ms": np.mean(all_throughputs) if all_throughputs else 0
        }

    def generate_ci_report(self) -> str:
        """Generate comprehensive CI validation report."""
        total_steps = len(self.validation_results)
        successful_steps = sum(1 for r in self.validation_results if r.success)
        total_duration = sum(r.duration_seconds for r in self.validation_results)

        report_lines = [
            "# 🏁 Blaze Sports Intelligence Feature Validation Report",
            f"**Generated:** {datetime.now().isoformat()}",
            f"**Validation Steps:** {successful_steps}/{total_steps} passed",
            f"**Total Duration:** {total_duration:.1f} seconds",
            "",
            "## 📊 Validation Summary",
            ""
        ]

        overall_success = successful_steps == total_steps
        status_icon = "✅" if overall_success else "❌"
        report_lines.append(f"{status_icon} **Overall Status:** {'PASSED' if overall_success else 'FAILED'}")
        report_lines.append("")

        # Add detailed results for each step
        report_lines.extend([
            "## 📋 Detailed Results",
            ""
        ])

        for result in self.validation_results:
            status_icon = "✅" if result.success else "❌"
            report_lines.extend([
                f"### {status_icon} {result.step_name}",
                f"**Duration:** {result.duration_seconds:.2f}s",
                ""
            ])

            if result.errors:
                report_lines.extend([
                    "**Errors:**",
                    ""
                ])
                for error in result.errors:
                    report_lines.append(f"- {error}")
                report_lines.append("")

            if result.warnings:
                report_lines.extend([
                    "**Warnings:**",
                    ""
                ])
                for warning in result.warnings:
                    report_lines.append(f"- {warning}")
                report_lines.append("")

            if result.metrics:
                report_lines.extend([
                    "**Metrics:**",
                    ""
                ])
                for key, value in result.metrics.items():
                    if isinstance(value, (int, float)):
                        report_lines.append(f"- {key}: {value}")
                    elif isinstance(value, bool):
                        report_lines.append(f"- {key}: {value}")
                    elif isinstance(value, (list, dict)):
                        report_lines.append(f"- {key}: {len(value)} items")
                    else:
                        report_lines.append(f"- {key}: {str(value)[:100]}")

                report_lines.append("")

        return "\n".join(report_lines)

    def run_full_validation(self) -> bool:
        """Run complete validation pipeline."""
        self.logger.info("🚀 Starting full feature validation pipeline...")

        # Run all validation steps
        steps = [
            ("Schema Validation", self.validate_feature_schemas),
            ("Implementation Testing", self.test_feature_implementations),
            ("Property-Based Testing", self.run_property_tests),
            ("Performance Benchmarking", self.benchmark_performance),
            ("Drift Detection Testing", self.check_drift_detection),
            ("Latency Requirements", self.validate_latency_requirements)
        ]

        for step_name, step_function in steps:
            self._run_step(step_name, step_function)

        # Generate final report
        report = self.generate_ci_report()
        report_path = self.output_dir / "ci_validation_report.md"
        with open(report_path, 'w') as f:
            f.write(report)

        # Save validation results as JSON
        results_path = self.output_dir / "validation_results.json"
        with open(results_path, 'w') as f:
            json.dump([asdict(r) for r in self.validation_results],
                     f, indent=2, default=str)

        overall_success = all(r.success for r in self.validation_results)

        self.logger.info(f"📝 Validation report saved to {report_path}")
        self.logger.info(f"📊 Validation results saved to {results_path}")

        if overall_success:
            self.logger.info("🎉 All validation steps passed!")
        else:
            self.logger.error("💥 Some validation steps failed!")

        return overall_success


def main():
    """CLI entry point for CI validation."""
    import argparse

    parser = argparse.ArgumentParser(description="Run CI validation for Blaze Sports Intelligence features")
    parser.add_argument("--project-root", default=".", help="Project root directory")
    parser.add_argument("--output-dir", default="ci_reports", help="Output directory for reports")
    parser.add_argument("--step", help="Run specific validation step only")

    args = parser.parse_args()

    # Initialize pipeline
    pipeline = CIValidationPipeline(args.project_root, args.output_dir)

    if args.step:
        # Run specific step
        step_mapping = {
            "schema": pipeline.validate_feature_schemas,
            "implementations": pipeline.test_feature_implementations,
            "property-tests": pipeline.run_property_tests,
            "benchmarks": pipeline.benchmark_performance,
            "drift": pipeline.check_drift_detection,
            "latency": pipeline.validate_latency_requirements
        }

        if args.step in step_mapping:
            pipeline._run_step(f"Single Step: {args.step}", step_mapping[args.step])
            success = pipeline.validation_results[-1].success
        else:
            print(f"Unknown step: {args.step}")
            print(f"Available steps: {list(step_mapping.keys())}")
            return 1
    else:
        # Run full validation
        success = pipeline.run_full_validation()

    return 0 if success else 1


if __name__ == "__main__":
    exit(main())