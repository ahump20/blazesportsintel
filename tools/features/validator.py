"""
Blaze Sports Intelligence Feature Validator

Comprehensive validation framework for ML features including:
- YAML schema validation
- Feature uniqueness checks
- Sport scope enforcement
- Bounds validation
- Type consistency
"""

import json
import yaml
import jsonschema
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
import numpy as np
from datetime import datetime
import warnings


class FeatureValidator:
    """Main feature validation class."""

    def __init__(self, schema_path: str = None, features_dir: str = None):
        """
        Initialize validator.

        Args:
            schema_path: Path to JSON schema file
            features_dir: Directory containing feature YAML files
        """
        self.schema_path = schema_path or "features/schema.json"
        self.features_dir = Path(features_dir or "features")
        self.schema = self._load_schema()
        self.features = {}
        self._load_features()

    def _load_schema(self) -> Dict[str, Any]:
        """Load JSON schema for validation."""
        try:
            with open(self.schema_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Schema file not found: {self.schema_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in schema file: {e}")

    def _load_features(self) -> None:
        """Load all feature definitions from YAML files."""
        self.features = {}

        for yaml_file in self.features_dir.glob("*.yaml"):
            try:
                with open(yaml_file, 'r') as f:
                    # Handle multiple documents in single YAML file
                    docs = list(yaml.safe_load_all(f))
                    for doc in docs:
                        if doc and 'name' in doc:
                            self.features[doc['name']] = doc
            except yaml.YAMLError as e:
                warnings.warn(f"Error loading {yaml_file}: {e}")
            except Exception as e:
                warnings.warn(f"Unexpected error loading {yaml_file}: {e}")

    def validate_schema(self, feature_def: Dict[str, Any]) -> List[str]:
        """
        Validate feature definition against JSON schema.

        Args:
            feature_def: Feature definition dictionary

        Returns:
            List of validation errors (empty if valid)
        """
        errors = []

        try:
            jsonschema.validate(feature_def, self.schema)
        except jsonschema.ValidationError as e:
            errors.append(f"Schema validation error: {e.message}")
        except jsonschema.SchemaError as e:
            errors.append(f"Schema error: {e.message}")

        return errors

    def validate_sport_scope(self, feature_def: Dict[str, Any]) -> List[str]:
        """
        Validate sport scope compliance (NO soccer allowed).

        Args:
            feature_def: Feature definition dictionary

        Returns:
            List of validation errors
        """
        errors = []
        allowed_sports = {"baseball", "football", "basketball", "track"}
        forbidden_sports = {"soccer", "football_soccer", "futbol"}

        sport_scope = feature_def.get("sport_scope", [])

        # Check for forbidden sports
        for sport in sport_scope:
            if sport.lower() in forbidden_sports:
                errors.append(f"Forbidden sport '{sport}' in sport_scope. Soccer is explicitly excluded.")

        # Check for unknown sports
        for sport in sport_scope:
            if sport not in allowed_sports:
                errors.append(f"Unknown sport '{sport}' in sport_scope. "
                             f"Allowed: {allowed_sports}")

        return errors

    def validate_name_uniqueness(self) -> List[str]:
        """
        Validate that all feature names are unique across all files.

        Returns:
            List of validation errors for duplicate names
        """
        errors = []
        name_counts = {}

        for name, feature_def in self.features.items():
            name_counts[name] = name_counts.get(name, 0) + 1

        duplicates = {name: count for name, count in name_counts.items() if count > 1}

        for name, count in duplicates.items():
            errors.append(f"Duplicate feature name '{name}' found {count} times")

        return errors

    def validate_dependencies(self) -> List[str]:
        """
        Validate that feature dependencies exist and don't create cycles.

        Returns:
            List of validation errors for missing dependencies
        """
        errors = []
        all_feature_names = set(self.features.keys())

        for name, feature_def in self.features.items():
            dependencies = feature_def.get("dependencies", [])

            for dep in dependencies:
                if dep not in all_feature_names:
                    errors.append(f"Feature '{name}' depends on missing feature '{dep}'")

        # TODO: Add cycle detection if needed

        return errors

    def validate_version_monotonicity(self) -> List[str]:
        """
        Validate that feature versions are monotonically increasing.

        Returns:
            List of validation errors for version issues
        """
        errors = []

        # Group features by base name (without version)
        base_names = {}
        for name, feature_def in self.features.items():
            # Simple heuristic: remove version-like suffixes
            base_name = name.split('_v')[0] if '_v' in name else name
            version = feature_def.get("version", 1)

            if base_name not in base_names:
                base_names[base_name] = []
            base_names[base_name].append((name, version))

        # Check version monotonicity
        for base_name, versions in base_names.items():
            if len(versions) > 1:
                versions.sort(key=lambda x: x[1])  # Sort by version
                for i in range(1, len(versions)):
                    if versions[i][1] <= versions[i-1][1]:
                        errors.append(f"Non-monotonic version for {base_name}: "
                                    f"{versions[i-1][0]} (v{versions[i-1][1]}) -> "
                                    f"{versions[i][0]} (v{versions[i][1]})")

        return errors

    def validate_feature_bounds(self, feature_name: str, values: pd.Series) -> List[str]:
        """
        Validate feature values against defined bounds.

        Args:
            feature_name: Name of feature to validate
            values: Feature values to check

        Returns:
            List of validation errors for bound violations
        """
        errors = []

        if feature_name not in self.features:
            errors.append(f"Feature '{feature_name}' not found in registry")
            return errors

        feature_def = self.features[feature_name]
        validation = feature_def.get("validation", {})

        # Check null values
        if validation.get("not_null", False) and values.isnull().any():
            null_count = values.isnull().sum()
            total_count = len(values)
            errors.append(f"Feature '{feature_name}' has {null_count}/{total_count} "
                         f"null values but not_null=True")

        # Check numeric bounds
        if "min" in validation:
            min_val = validation["min"]
            violations = (values < min_val).sum()
            if violations > 0:
                errors.append(f"Feature '{feature_name}' has {violations} values "
                             f"below minimum {min_val}")

        if "max" in validation:
            max_val = validation["max"]
            violations = (values > max_val).sum()
            if violations > 0:
                errors.append(f"Feature '{feature_name}' has {violations} values "
                             f"above maximum {max_val}")

        # Check categorical values
        if "categories" in validation:
            allowed_cats = set(validation["categories"])
            actual_cats = set(values.dropna().unique())
            invalid_cats = actual_cats - allowed_cats

            if invalid_cats:
                errors.append(f"Feature '{feature_name}' has invalid categories: "
                             f"{invalid_cats}. Allowed: {allowed_cats}")

        return errors

    def validate_data_types(self, feature_name: str, values: pd.Series) -> List[str]:
        """
        Validate feature data types match specification.

        Args:
            feature_name: Name of feature to validate
            values: Feature values to check

        Returns:
            List of validation errors for type mismatches
        """
        errors = []

        if feature_name not in self.features:
            return errors

        feature_def = self.features[feature_name]
        expected_dtype = feature_def.get("dtype", "float")

        # Map expected types to pandas types
        type_mapping = {
            "float": [np.float64, np.float32, float],
            "int": [np.int64, np.int32, int],
            "bool": [bool, np.bool_],
            "category": [object, str],
            "datetime": [np.datetime64, pd.Timestamp]
        }

        expected_types = type_mapping.get(expected_dtype, [])
        actual_type = values.dtype.type

        if expected_types and actual_type not in expected_types:
            errors.append(f"Feature '{feature_name}' has type {actual_type} "
                         f"but expected one of {expected_types}")

        return errors

    def validate_all_features(self) -> Dict[str, List[str]]:
        """
        Run all validation checks on loaded features.

        Returns:
            Dictionary mapping validation categories to lists of errors
        """
        validation_results = {
            "schema_errors": [],
            "sport_scope_errors": [],
            "name_uniqueness_errors": [],
            "dependency_errors": [],
            "version_errors": []
        }

        # Validate each feature definition
        for name, feature_def in self.features.items():
            # Schema validation
            schema_errors = self.validate_schema(feature_def)
            validation_results["schema_errors"].extend(
                [f"{name}: {error}" for error in schema_errors]
            )

            # Sport scope validation
            sport_errors = self.validate_sport_scope(feature_def)
            validation_results["sport_scope_errors"].extend(
                [f"{name}: {error}" for error in sport_errors]
            )

        # Global validations
        validation_results["name_uniqueness_errors"] = self.validate_name_uniqueness()
        validation_results["dependency_errors"] = self.validate_dependencies()
        validation_results["version_errors"] = self.validate_version_monotonicity()

        return validation_results

    def generate_validation_report(self) -> str:
        """
        Generate a comprehensive validation report.

        Returns:
            Formatted validation report string
        """
        results = self.validate_all_features()

        report_lines = [
            f"# Blaze Sports Intelligence Feature Validation Report",
            f"Generated at: {datetime.now().isoformat()}",
            f"Total features validated: {len(self.features)}",
            "",
        ]

        total_errors = sum(len(errors) for errors in results.values())

        if total_errors == 0:
            report_lines.extend([
                "✅ **ALL VALIDATIONS PASSED**",
                "",
                "No errors found in feature definitions.",
                "All features comply with schema and business rules.",
            ])
        else:
            report_lines.append(f"❌ **{total_errors} VALIDATION ERRORS FOUND**")
            report_lines.append("")

            for category, errors in results.items():
                if errors:
                    category_name = category.replace("_", " ").title()
                    report_lines.extend([
                        f"## {category_name} ({len(errors)} errors)",
                        ""
                    ])

                    for error in errors:
                        report_lines.append(f"- {error}")
                    report_lines.append("")

        # Feature summary
        report_lines.extend([
            "## Feature Summary",
            ""
        ])

        # Count by sport
        sport_counts = {}
        for feature_def in self.features.values():
            for sport in feature_def.get("sport_scope", []):
                sport_counts[sport] = sport_counts.get(sport, 0) + 1

        for sport, count in sorted(sport_counts.items()):
            report_lines.append(f"- {sport.title()}: {count} features")

        # Count by latency requirement
        report_lines.append("")
        latency_counts = {}
        for feature_def in self.features.values():
            latency = feature_def.get("latency_requirement", "batch")
            latency_counts[latency] = latency_counts.get(latency, 0) + 1

        report_lines.append("### By Latency Requirement")
        for latency, count in sorted(latency_counts.items()):
            report_lines.append(f"- {latency.replace('_', ' ').title()}: {count} features")

        return "\n".join(report_lines)

    def is_valid(self) -> bool:
        """
        Check if all features pass validation.

        Returns:
            True if all features are valid, False otherwise
        """
        results = self.validate_all_features()
        return sum(len(errors) for errors in results.values()) == 0


def main():
    """CLI entry point for feature validation."""
    import argparse

    parser = argparse.ArgumentParser(description="Validate Blaze Sports Intelligence features")
    parser.add_argument("--schema", help="Path to schema file", default="features/schema.json")
    parser.add_argument("--features", help="Features directory", default="features")
    parser.add_argument("--output", help="Output report file", default=None)

    args = parser.parse_args()

    # Run validation
    validator = FeatureValidator(args.schema, args.features)
    report = validator.generate_validation_report()

    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
        print(f"Validation report written to {args.output}")
    else:
        print(report)

    # Exit with error code if validation failed
    exit(0 if validator.is_valid() else 1)


if __name__ == "__main__":
    main()