"""
Blaze Sports Intelligence Feature Drift Detection

Advanced drift detection system using:
- Kolmogorov-Smirnov (KS) statistic for distribution comparison
- Population Stability Index (PSI) for categorical drift
- Statistical significance testing
- Configurable thresholds per feature
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Union
from scipy import stats
from datetime import datetime, timedelta
import warnings
import json
from pathlib import Path


class FeatureDriftDetector:
    """Comprehensive feature drift detection system."""

    def __init__(self, drift_thresholds: Dict[str, float] = None):
        """
        Initialize drift detector.

        Args:
            drift_thresholds: Custom drift thresholds per feature
        """
        self.drift_thresholds = drift_thresholds or {}
        self.default_ks_threshold = 0.1
        self.default_psi_threshold = 0.1
        self.drift_history = []

    def kolmogorov_smirnov_test(self, baseline: pd.Series, candidate: pd.Series,
                               feature_name: str = None) -> Dict[str, float]:
        """
        Perform KS test to detect distribution drift.

        Args:
            baseline: Historical/reference feature values
            candidate: Current feature values to compare
            feature_name: Name of feature (for threshold lookup)

        Returns:
            Dictionary with KS statistic, p-value, and drift detected flag
        """
        # Remove null values
        baseline_clean = baseline.dropna()
        candidate_clean = candidate.dropna()

        if len(baseline_clean) == 0 or len(candidate_clean) == 0:
            return {
                "ks_statistic": np.nan,
                "p_value": np.nan,
                "drift_detected": False,
                "error": "Insufficient data after removing nulls"
            }

        # Perform KS test
        ks_stat, p_value = stats.ks_2samp(baseline_clean, candidate_clean)

        # Determine drift threshold
        threshold = self.drift_thresholds.get(feature_name, self.default_ks_threshold)
        drift_detected = ks_stat > threshold

        return {
            "ks_statistic": float(ks_stat),
            "p_value": float(p_value),
            "drift_detected": drift_detected,
            "threshold": threshold,
            "sample_sizes": {
                "baseline": len(baseline_clean),
                "candidate": len(candidate_clean)
            }
        }

    def population_stability_index(self, baseline: pd.Series, candidate: pd.Series,
                                 bins: Union[int, List] = 10,
                                 feature_name: str = None) -> Dict[str, float]:
        """
        Calculate Population Stability Index (PSI) for drift detection.

        PSI measures the shift in population between two samples:
        PSI = Σ (candidate_pct - baseline_pct) * ln(candidate_pct / baseline_pct)

        Args:
            baseline: Historical feature values
            candidate: Current feature values
            bins: Number of bins or bin edges for bucketing
            feature_name: Feature name for threshold lookup

        Returns:
            Dictionary with PSI value and drift detection results
        """
        # Remove nulls and handle edge cases
        baseline_clean = baseline.dropna()
        candidate_clean = candidate.dropna()

        if len(baseline_clean) == 0 or len(candidate_clean) == 0:
            return {
                "psi": np.nan,
                "drift_detected": False,
                "error": "Insufficient data"
            }

        try:
            # Create bins based on baseline distribution
            if isinstance(bins, int):
                # For numeric data, use quantile-based binning
                if pd.api.types.is_numeric_dtype(baseline_clean):
                    bin_edges = np.percentile(baseline_clean, np.linspace(0, 100, bins + 1))
                    bin_edges[0] = -np.inf  # Ensure all values are captured
                    bin_edges[-1] = np.inf
                else:
                    # For categorical data, use unique values as bins
                    bin_edges = baseline_clean.unique()
            else:
                bin_edges = bins

            # Bin both distributions
            if pd.api.types.is_numeric_dtype(baseline_clean):
                baseline_binned = pd.cut(baseline_clean, bins=bin_edges, duplicates='drop')
                candidate_binned = pd.cut(candidate_clean, bins=bin_edges, duplicates='drop')
            else:
                baseline_binned = baseline_clean
                candidate_binned = candidate_clean

            # Calculate proportions
            baseline_props = baseline_binned.value_counts(normalize=True, sort=False)
            candidate_props = candidate_binned.value_counts(normalize=True, sort=False)

            # Align indices and fill missing bins with small value
            all_bins = baseline_props.index.union(candidate_props.index)
            baseline_props = baseline_props.reindex(all_bins, fill_value=0.001)
            candidate_props = candidate_props.reindex(all_bins, fill_value=0.001)

            # Calculate PSI
            psi_components = (candidate_props - baseline_props) * np.log(candidate_props / baseline_props)
            psi = psi_components.sum()

            # Determine drift
            threshold = self.drift_thresholds.get(feature_name, self.default_psi_threshold)
            drift_detected = abs(psi) > threshold

            return {
                "psi": float(psi),
                "drift_detected": drift_detected,
                "threshold": threshold,
                "bin_count": len(all_bins),
                "baseline_entropy": float(stats.entropy(baseline_props)),
                "candidate_entropy": float(stats.entropy(candidate_props))
            }

        except Exception as e:
            return {
                "psi": np.nan,
                "drift_detected": False,
                "error": f"PSI calculation failed: {str(e)}"
            }

    def detect_drift(self, baseline: pd.DataFrame, candidate: pd.DataFrame,
                    feature_columns: List[str] = None) -> Dict[str, Dict]:
        """
        Detect drift across multiple features using both KS and PSI tests.

        Args:
            baseline: Historical/reference dataset
            candidate: Current dataset to compare
            feature_columns: List of columns to check (default: all numeric columns)

        Returns:
            Dictionary mapping feature names to drift detection results
        """
        if feature_columns is None:
            # Default to all numeric columns present in both datasets
            baseline_numeric = baseline.select_dtypes(include=[np.number]).columns
            candidate_numeric = candidate.select_dtypes(include=[np.number]).columns
            feature_columns = list(set(baseline_numeric) & set(candidate_numeric))

        drift_results = {}

        for feature in feature_columns:
            if feature not in baseline.columns or feature not in candidate.columns:
                drift_results[feature] = {
                    "error": f"Feature '{feature}' missing from one or both datasets"
                }
                continue

            baseline_values = baseline[feature]
            candidate_values = candidate[feature]

            # Perform both KS and PSI tests
            ks_result = self.kolmogorov_smirnov_test(
                baseline_values, candidate_values, feature
            )

            psi_result = self.population_stability_index(
                baseline_values, candidate_values, feature_name=feature
            )

            # Combine results
            drift_results[feature] = {
                "ks_test": ks_result,
                "psi_test": psi_result,
                "drift_detected": ks_result.get("drift_detected", False) or
                                 psi_result.get("drift_detected", False),
                "baseline_stats": self._calculate_stats(baseline_values),
                "candidate_stats": self._calculate_stats(candidate_values)
            }

        # Store in history
        self.drift_history.append({
            "timestamp": datetime.now().isoformat(),
            "results": drift_results,
            "features_checked": len(feature_columns),
            "features_with_drift": sum(1 for r in drift_results.values()
                                     if r.get("drift_detected", False))
        })

        return drift_results

    def _calculate_stats(self, series: pd.Series) -> Dict[str, float]:
        """Calculate basic statistics for a feature series."""
        if pd.api.types.is_numeric_dtype(series):
            return {
                "count": int(series.count()),
                "mean": float(series.mean()) if series.count() > 0 else np.nan,
                "std": float(series.std()) if series.count() > 1 else np.nan,
                "min": float(series.min()) if series.count() > 0 else np.nan,
                "max": float(series.max()) if series.count() > 0 else np.nan,
                "null_rate": float(series.isnull().mean())
            }
        else:
            return {
                "count": int(series.count()),
                "unique_values": int(series.nunique()),
                "most_common": str(series.mode().iloc[0]) if len(series.mode()) > 0 else None,
                "null_rate": float(series.isnull().mean())
            }

    def generate_drift_report(self, drift_results: Dict[str, Dict],
                            output_format: str = "markdown") -> str:
        """
        Generate comprehensive drift detection report.

        Args:
            drift_results: Results from detect_drift method
            output_format: Output format ("markdown" or "html")

        Returns:
            Formatted drift report
        """
        features_with_drift = [f for f, r in drift_results.items()
                              if r.get("drift_detected", False)]

        if output_format == "markdown":
            return self._generate_markdown_report(drift_results, features_with_drift)
        elif output_format == "html":
            return self._generate_html_report(drift_results, features_with_drift)
        else:
            raise ValueError("output_format must be 'markdown' or 'html'")

    def _generate_markdown_report(self, drift_results: Dict[str, Dict],
                                features_with_drift: List[str]) -> str:
        """Generate markdown drift report."""
        lines = [
            "# Blaze Sports Intelligence Feature Drift Report",
            f"Generated at: {datetime.now().isoformat()}",
            "",
            f"**Features analyzed:** {len(drift_results)}",
            f"**Features with drift detected:** {len(features_with_drift)}",
            ""
        ]

        if len(features_with_drift) == 0:
            lines.extend([
                "✅ **NO DRIFT DETECTED**",
                "",
                "All features are stable compared to baseline.",
            ])
        else:
            lines.extend([
                f"⚠️ **DRIFT DETECTED IN {len(features_with_drift)} FEATURES**",
                "",
                "### Features with Drift:",
                ""
            ])

            for feature in features_with_drift:
                lines.append(f"- **{feature}**")

        lines.extend([
            "",
            "## Detailed Results",
            ""
        ])

        for feature, result in drift_results.items():
            drift_indicator = "🔴" if result.get("drift_detected", False) else "🟢"
            lines.extend([
                f"### {drift_indicator} {feature}",
                ""
            ])

            if "error" in result:
                lines.extend([
                    f"**Error:** {result['error']}",
                    ""
                ])
                continue

            # KS test results
            ks_result = result.get("ks_test", {})
            if "ks_statistic" in ks_result:
                lines.extend([
                    "**Kolmogorov-Smirnov Test:**",
                    f"- KS Statistic: {ks_result['ks_statistic']:.4f}",
                    f"- P-value: {ks_result['p_value']:.4f}",
                    f"- Threshold: {ks_result['threshold']:.4f}",
                    f"- Drift: {'Yes' if ks_result['drift_detected'] else 'No'}",
                    ""
                ])

            # PSI test results
            psi_result = result.get("psi_test", {})
            if "psi" in psi_result and not np.isnan(psi_result["psi"]):
                lines.extend([
                    "**Population Stability Index:**",
                    f"- PSI: {psi_result['psi']:.4f}",
                    f"- Threshold: {psi_result['threshold']:.4f}",
                    f"- Drift: {'Yes' if psi_result['drift_detected'] else 'No'}",
                    ""
                ])

            # Statistics comparison
            baseline_stats = result.get("baseline_stats", {})
            candidate_stats = result.get("candidate_stats", {})

            if baseline_stats and candidate_stats:
                lines.extend([
                    "**Statistics Comparison:**",
                    "",
                    "| Metric | Baseline | Candidate | Change |",
                    "|--------|----------|-----------|--------|"
                ])

                for metric in ["mean", "std", "min", "max", "null_rate"]:
                    if metric in baseline_stats and metric in candidate_stats:
                        baseline_val = baseline_stats[metric]
                        candidate_val = candidate_stats[metric]

                        if not (np.isnan(baseline_val) or np.isnan(candidate_val)):
                            change_pct = ((candidate_val - baseline_val) / abs(baseline_val) * 100
                                        if baseline_val != 0 else np.inf)
                            lines.append(f"| {metric.title()} | {baseline_val:.4f} | "
                                       f"{candidate_val:.4f} | {change_pct:+.1f}% |")

                lines.append("")

        return "\n".join(lines)

    def _generate_html_report(self, drift_results: Dict[str, Dict],
                            features_with_drift: List[str]) -> str:
        """Generate HTML drift report."""
        # Simplified HTML report - could be expanded with charts/visualizations
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Feature Drift Report - Blaze Sports Intelligence</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .drift {{ color: red; }}
                .no-drift {{ color: green; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <h1>Blaze Sports Intelligence Feature Drift Report</h1>
            <p><strong>Generated:</strong> {datetime.now().isoformat()}</p>
            <p><strong>Features analyzed:</strong> {len(drift_results)}</p>
            <p><strong>Features with drift:</strong>
               <span class="{'drift' if features_with_drift else 'no-drift'}">
                   {len(features_with_drift)}
               </span>
            </p>
        """

        # Add detailed results table
        html += """
            <h2>Detailed Results</h2>
            <table>
                <tr>
                    <th>Feature</th>
                    <th>Drift Detected</th>
                    <th>KS Statistic</th>
                    <th>PSI</th>
                    <th>Sample Size</th>
                </tr>
        """

        for feature, result in drift_results.items():
            drift_class = "drift" if result.get("drift_detected", False) else "no-drift"
            drift_text = "Yes" if result.get("drift_detected", False) else "No"

            ks_stat = result.get("ks_test", {}).get("ks_statistic", "N/A")
            psi_val = result.get("psi_test", {}).get("psi", "N/A")
            sample_size = result.get("ks_test", {}).get("sample_sizes", {}).get("candidate", "N/A")

            if isinstance(ks_stat, float) and not np.isnan(ks_stat):
                ks_stat = f"{ks_stat:.4f}"
            if isinstance(psi_val, float) and not np.isnan(psi_val):
                psi_val = f"{psi_val:.4f}"

            html += f"""
                <tr>
                    <td>{feature}</td>
                    <td class="{drift_class}">{drift_text}</td>
                    <td>{ks_stat}</td>
                    <td>{psi_val}</td>
                    <td>{sample_size}</td>
                </tr>
            """

        html += """
            </table>
        </body>
        </html>
        """

        return html

    def save_drift_results(self, drift_results: Dict[str, Dict],
                          filepath: str, format: str = "json") -> None:
        """
        Save drift detection results to file.

        Args:
            drift_results: Results from detect_drift method
            filepath: Output file path
            format: Output format ("json", "csv", or "parquet")
        """
        if format == "json":
            with open(filepath, 'w') as f:
                json.dump({
                    "timestamp": datetime.now().isoformat(),
                    "results": drift_results
                }, f, indent=2, default=str)

        elif format == "csv":
            # Flatten results for CSV export
            rows = []
            for feature, result in drift_results.items():
                row = {"feature": feature}

                if "error" in result:
                    row["error"] = result["error"]
                else:
                    row.update({
                        "drift_detected": result.get("drift_detected", False),
                        "ks_statistic": result.get("ks_test", {}).get("ks_statistic", np.nan),
                        "ks_p_value": result.get("ks_test", {}).get("p_value", np.nan),
                        "psi": result.get("psi_test", {}).get("psi", np.nan),
                        "baseline_mean": result.get("baseline_stats", {}).get("mean", np.nan),
                        "candidate_mean": result.get("candidate_stats", {}).get("mean", np.nan),
                    })

                rows.append(row)

            df = pd.DataFrame(rows)
            df.to_csv(filepath, index=False)

        else:
            raise ValueError("format must be 'json', 'csv', or 'parquet'")


def main():
    """CLI entry point for drift detection."""
    import argparse

    parser = argparse.ArgumentParser(description="Detect feature drift in Blaze Sports Intelligence")
    parser.add_argument("baseline", help="Baseline dataset file (CSV/parquet)")
    parser.add_argument("candidate", help="Candidate dataset file (CSV/parquet)")
    parser.add_argument("--features", nargs="+", help="Features to check (default: all numeric)")
    parser.add_argument("--output", help="Output report file", default="drift_report.md")
    parser.add_argument("--format", choices=["markdown", "html"], default="markdown")
    parser.add_argument("--thresholds", help="JSON file with custom drift thresholds")

    args = parser.parse_args()

    # Load datasets
    if args.baseline.endswith('.csv'):
        baseline_df = pd.read_csv(args.baseline)
    else:
        baseline_df = pd.read_parquet(args.baseline)

    if args.candidate.endswith('.csv'):
        candidate_df = pd.read_csv(args.candidate)
    else:
        candidate_df = pd.read_parquet(args.candidate)

    # Load custom thresholds if provided
    thresholds = {}
    if args.thresholds:
        with open(args.thresholds, 'r') as f:
            thresholds = json.load(f)

    # Initialize detector and run drift detection
    detector = FeatureDriftDetector(thresholds)
    results = detector.detect_drift(baseline_df, candidate_df, args.features)

    # Generate and save report
    report = detector.generate_drift_report(results, args.format)

    with open(args.output, 'w') as f:
        f.write(report)

    print(f"Drift detection complete. Report saved to {args.output}")

    # Print summary
    features_with_drift = sum(1 for r in results.values() if r.get("drift_detected", False))
    print(f"Features analyzed: {len(results)}")
    print(f"Features with drift: {features_with_drift}")

    if features_with_drift > 0:
        print("⚠️ Drift detected - review report for details")
        exit(1)
    else:
        print("✅ No drift detected")
        exit(0)


if __name__ == "__main__":
    main()