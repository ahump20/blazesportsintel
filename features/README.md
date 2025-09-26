# Blaze Sports Intelligence Feature Engineering Infrastructure

A comprehensive ML feature engineering platform designed specifically for sports analytics, supporting the Cardinals (MLB), Titans (NFL), Longhorns (NCAA), and Perfect Game youth baseball systems.

## 🏗️ Architecture Overview

```
features/
├── *.yaml                    # Feature definitions (YAML specs)
├── schema.json               # JSON Schema for validation
├── README.md                 # This file
features_impl.py              # Python feature implementations
tools/features/
├── validator.py              # Schema and business rule validation
├── drift_detector.py         # KS-statistic and PSI drift detection
├── test_generator.py         # Property-based test generation
├── realtime_pipeline.py      # <100ms real-time computation
└── ci_validation.py          # CI/CD validation pipeline
tests/features/               # Auto-generated property tests
reports/                      # Drift detection reports
requirements-features.txt     # Python dependencies
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements-features.txt
```

### 2. Validate Feature Definitions

```bash
python tools/features/validator.py --features features --schema features/schema.json
```

### 3. Generate and Run Tests

```bash
# Generate property-based tests
python tools/features/test_generator.py --features-dir features --output-dir tests/features

# Run tests
python tests/features/run_all_tests.py
```

### 4. Start Real-Time Pipeline

```bash
# Requires Redis running on localhost:6379
python tools/features/realtime_pipeline.py
```

## 📊 Feature Categories

### Cardinals Baseball Features
- **Batting Metrics**: xwOBA, barrel rate, chase rate, clutch performance, sprint speed
- **Pitching Metrics**: Whiff rate, command+, bullpen fatigue, TTO penalty, stuff+

### Titans Football Features
- **Offensive Metrics**: QB pressure rates, EPA, YAC, O-line efficiency, hidden yardage
- **Defensive Metrics**: EPA allowed, pass rush win rate, red zone defense, coverage grades

### Longhorns NCAA Features
- **Football**: QB completion over expectation, defensive havoc, recruiting ratings
- **Basketball**: Effective FG%, defensive rating, assist/TO ratio, pace metrics

### NIL Valuation Features
- **Social Media**: Engagement scores, follower growth, platform reach
- **Performance**: Consistency index, character assessment, market valuation
- **Brand**: Compatibility scoring, sponsorship alignment

### Perfect Game Youth Features
- **Physical Tools**: Exit velocity, pop time, 60-yard dash, pitching velocity
- **Scouting Grades**: Overall grade, commitment level, projection scores

## 🔄 Real-Time Processing

The pipeline supports three latency tiers:

- **Real-Time** (<100ms): Critical game-time features
- **Near Real-Time** (<500ms): In-game analytics features
- **Batch** (minutes): Deep analytical features

### Example Usage

```python
from tools.features.realtime_pipeline import RealTimeFeaturePipeline

# Initialize pipeline
pipeline = RealTimeFeaturePipeline(
    redis_host="localhost",
    redis_port=6379,
    max_workers=4
)

# Compute single feature
response = pipeline.compute_feature_sync(
    "cardinals_batter_xwoba_30d",
    {"batter_id": [1, 2], "exit_velocity": [95.0, 87.0], ...}
)

print(f"Computation time: {response.computation_time_ms}ms")
print(f"Values: {response.values}")
```

## 📋 Feature Definition Format

Features are defined in YAML with strict validation:

```yaml
name: cardinals_batter_xwoba_30d
owner: blaze_baseball_team
dtype: float
source: curated.batting_stats
description: Expected weighted on-base average for Cardinals batters over 30 days
sport_scope: ["baseball"]  # NEVER include "soccer"
version: 1
window: 30d
agg: mean
validation:
  not_null: true
  min: 0.200
  max: 0.600
tags: ["cardinals", "batting", "advanced_metrics"]
latency_requirement: near_real_time
quality_checks:
  drift_threshold: 0.15
  missing_threshold: 0.02
created_at: "2025-09-25T00:00:00Z"
updated_at: "2025-09-25T00:00:00Z"
```

## 🧪 Testing Framework

### Property-Based Tests
Auto-generated tests using Hypothesis verify:
- Numeric bounds compliance
- Null handling per specification
- Type constraints and edge cases
- Performance characteristics

### Drift Detection
Statistical monitoring using:
- **Kolmogorov-Smirnov Test**: Distribution shape changes
- **Population Stability Index**: Categorical drift detection
- **Configurable Thresholds**: Per-feature drift sensitivity

### Example Drift Detection

```python
from tools.features.drift_detector import FeatureDriftDetector

detector = FeatureDriftDetector({
    "cardinals_batter_xwoba_30d": 0.15,  # Custom threshold
})

drift_results = detector.detect_drift(baseline_df, candidate_df)
report = detector.generate_drift_report(drift_results)
```

## 🔧 CI/CD Integration

### Validation Pipeline

```bash
# Run full CI validation
python tools/features/ci_validation.py --project-root . --output-dir ci_reports

# Run specific validation step
python tools/features/ci_validation.py --step schema
```

### GitHub Actions Integration

```yaml
name: Feature Validation
on: [push, pull_request]
jobs:
  validate-features:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    - name: Install dependencies
      run: pip install -r requirements-features.txt
    - name: Validate features
      run: python tools/features/ci_validation.py
```

## 📈 Performance Standards

All features must meet platform requirements:
- **Latency**: <100ms for real-time features
- **Accuracy**: Support 94.6% model accuracy target
- **Reliability**: 99.9% uptime with circuit breakers
- **Scalability**: Handle 1M+ feature computations/hour

## 🔐 Governance

### Feature Lifecycle
1. **Definition**: YAML specification with schema validation
2. **Implementation**: Python function in `features_impl.py`
3. **Testing**: Auto-generated property-based tests
4. **Validation**: CI pipeline verification
5. **Deployment**: Real-time pipeline integration
6. **Monitoring**: Drift detection and performance metrics

### Version Management
- Monotonic version increments required
- Breaking changes trigger new major versions
- Backward compatibility maintained for 6 months

### Quality Gates
- ✅ Schema validation passes
- ✅ Property tests pass (>95% success rate)
- ✅ Performance benchmarks met
- ✅ Drift detection functional
- ✅ No security vulnerabilities

## 🏃‍♂️ Command Reference

### Feature Management
```bash
# Validate all features
python tools/features/validator.py

# Generate feature tests
python tools/features/test_generator.py

# Run performance benchmarks
python tools/features/ci_validation.py --step benchmarks
```

### Real-Time Operations
```bash
# Start feature pipeline
python tools/features/realtime_pipeline.py

# Monitor drift
python tools/features/drift_detector.py baseline.csv candidate.csv

# Check system health
curl http://localhost:8080/health  # If running web API
```

### Development Workflow
```bash
# 1. Create feature definition
vim features/my_new_feature.yaml

# 2. Implement feature function
vim features_impl.py

# 3. Validate and test
python tools/features/validator.py
python tools/features/test_generator.py --feature my_new_feature
python tests/features/test_my_new_feature.py

# 4. Run CI validation
python tools/features/ci_validation.py
```

## 🚨 Troubleshooting

### Common Issues

**Redis Connection Errors**
```bash
# Start Redis locally
redis-server --port 6379

# Or use Docker
docker run -p 6379:6379 redis:alpine
```

**Schema Validation Failures**
- Check YAML syntax with `yamllint features/*.yaml`
- Verify all required fields are present
- Ensure `sport_scope` never includes "soccer"

**Performance Issues**
- Profile with `python -m cProfile tools/features/realtime_pipeline.py`
- Check Redis memory usage and eviction policies
- Optimize DataFrame operations in feature implementations

**Test Failures**
- Review generated test files in `tests/features/`
- Check feature implementation error handling
- Verify sample data generation matches feature requirements

## 📚 Resources

- [Feature Schema Documentation](schema.json)
- [Implementation Examples](features_impl.py)
- [Property Testing Guide](tools/features/test_generator.py)
- [Drift Detection Theory](tools/features/drift_detector.py)
- [Real-Time Architecture](tools/features/realtime_pipeline.py)

## 🤝 Contributing

1. **Feature Requests**: Create YAML specification first
2. **Bug Reports**: Include failing test case
3. **Performance Issues**: Provide benchmark comparison
4. **Security Issues**: Report privately to team leads

## 📄 License

Copyright (c) 2025 Blaze Sports Intelligence. All rights reserved.

---

**Built for blazesportsintel.com - THE DEEP SOUTH'S SPORTS INTELLIGENCE HUB**