#!/usr/bin/env python3
"""
Blaze Sports Intelligence Feature Engineering Setup

Automated setup script for the feature engineering infrastructure.
Validates environment, installs dependencies, and runs initial validation.
"""

import os
import sys
import subprocess
import shutil
import json
from pathlib import Path
from typing import List, Dict, Any
import platform


def run_command(cmd: List[str], description: str, cwd: str = None,
                check: bool = True) -> subprocess.CompletedProcess:
    """Run a command with proper error handling and logging."""
    print(f"🔧 {description}...")

    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=check
        )

        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
        else:
            print(f"❌ {description} failed with return code {result.returncode}")
            if result.stderr:
                print(f"Error: {result.stderr}")

        return result

    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        if e.stderr:
            print(f"Error: {e.stderr}")
        raise
    except FileNotFoundError:
        print(f"❌ Command not found: {' '.join(cmd)}")
        raise


def check_python_version() -> bool:
    """Check if Python version meets requirements."""
    print("🐍 Checking Python version...")

    version = sys.version_info
    required_major, required_minor = 3, 9

    if version.major >= required_major and version.minor >= required_minor:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor} is too old. "
              f"Requires Python {required_major}.{required_minor}+")
        return False


def check_system_dependencies() -> Dict[str, bool]:
    """Check for required system dependencies."""
    print("🔍 Checking system dependencies...")

    dependencies = {
        "git": ["git", "--version"],
        "redis-server": ["redis-server", "--version"],
    }

    results = {}

    for name, cmd in dependencies.items():
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ {name} is available")
                results[name] = True
            else:
                print(f"❌ {name} is not available")
                results[name] = False
        except FileNotFoundError:
            print(f"❌ {name} is not installed")
            results[name] = False

    return results


def install_python_dependencies(project_root: Path) -> bool:
    """Install Python dependencies from requirements file."""
    requirements_file = project_root / "requirements-features.txt"

    if not requirements_file.exists():
        print(f"❌ Requirements file not found: {requirements_file}")
        return False

    print("📦 Installing Python dependencies...")

    # Upgrade pip first
    run_command([sys.executable, "-m", "pip", "install", "--upgrade", "pip"],
                "Upgrading pip")

    # Install requirements
    result = run_command([
        sys.executable, "-m", "pip", "install",
        "-r", str(requirements_file)
    ], "Installing feature engineering dependencies", check=False)

    return result.returncode == 0


def setup_directories(project_root: Path) -> None:
    """Create required directories."""
    print("📁 Setting up directories...")

    directories = [
        "features",
        "tools/features",
        "tests/features",
        "reports",
        "ci_reports"
    ]

    for dir_path in directories:
        full_path = project_root / dir_path
        full_path.mkdir(parents=True, exist_ok=True)
        print(f"✅ Created directory: {full_path}")


def validate_feature_files(project_root: Path) -> bool:
    """Validate existing feature files."""
    features_dir = project_root / "features"

    if not features_dir.exists():
        print("⚠️ Features directory not found, skipping validation")
        return True

    yaml_files = list(features_dir.glob("*.yaml"))

    if not yaml_files:
        print("⚠️ No feature YAML files found, skipping validation")
        return True

    print(f"🔍 Validating {len(yaml_files)} feature files...")

    # Run validator
    validator_path = project_root / "tools" / "features" / "validator.py"

    if not validator_path.exists():
        print("⚠️ Validator not found, skipping validation")
        return True

    result = run_command([
        sys.executable, str(validator_path),
        "--features", str(features_dir),
        "--schema", str(features_dir / "schema.json")
    ], "Running feature validation", check=False)

    return result.returncode == 0


def setup_redis_config(project_root: Path) -> None:
    """Setup Redis configuration for development."""
    print("🔄 Setting up Redis configuration...")

    redis_config = {
        "host": "localhost",
        "port": 6379,
        "db": 0,
        "decode_responses": False,
        "socket_connect_timeout": 1,
        "socket_timeout": 1
    }

    config_path = project_root / "redis_config.json"

    with open(config_path, 'w') as f:
        json.dump(redis_config, f, indent=2)

    print(f"✅ Redis config saved to {config_path}")


def create_environment_file(project_root: Path) -> None:
    """Create .env file template for development."""
    print("⚙️ Creating environment file template...")

    env_template = """# Blaze Sports Intelligence Feature Engineering Environment
# Copy this file to .env and fill in your values

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Feature Pipeline Configuration
FEATURE_CACHE_TTL=300
MAX_WORKERS=4
DEFAULT_TIMEOUT_MS=100

# Monitoring and Logging
LOG_LEVEL=INFO
METRICS_ENABLED=true

# Development Settings
ENVIRONMENT=development
DEBUG=false

# Optional: Performance Optimization
PANDAS_COPY_ON_WRITE=true
NUMPY_DISABLE_PERFORMANCE_WARNINGS=true
"""

    env_path = project_root / ".env.example"

    with open(env_path, 'w') as f:
        f.write(env_template)

    print(f"✅ Environment template saved to {env_path}")
    print("📝 Copy to .env and customize for your environment")


def run_initial_tests(project_root: Path) -> bool:
    """Run initial feature tests to verify setup."""
    print("🧪 Running initial tests...")

    test_generator = project_root / "tools" / "features" / "test_generator.py"

    if not test_generator.exists():
        print("⚠️ Test generator not found, skipping test generation")
        return True

    # Generate tests for existing features
    result = run_command([
        sys.executable, str(test_generator),
        "--features-dir", str(project_root / "features"),
        "--output-dir", str(project_root / "tests" / "features")
    ], "Generating feature tests", check=False)

    if result.returncode != 0:
        print("⚠️ Test generation failed, but continuing setup")
        return False

    # Run a basic smoke test
    ci_validator = project_root / "tools" / "features" / "ci_validation.py"

    if ci_validator.exists():
        result = run_command([
            sys.executable, str(ci_validator),
            "--project-root", str(project_root),
            "--step", "schema"
        ], "Running schema validation", check=False)

        return result.returncode == 0

    return True


def print_next_steps() -> None:
    """Print helpful next steps for the user."""
    print("\n🎉 Feature Engineering Infrastructure Setup Complete!")
    print("\n📋 Next Steps:")
    print("1. Copy .env.example to .env and customize settings")
    print("2. Start Redis server: redis-server --port 6379")
    print("3. Validate features: python tools/features/validator.py")
    print("4. Generate tests: python tools/features/test_generator.py")
    print("5. Run real-time pipeline: python tools/features/realtime_pipeline.py")

    print("\n🔗 Useful Commands:")
    print("• Full validation: python tools/features/ci_validation.py")
    print("• Drift detection: python tools/features/drift_detector.py baseline.csv candidate.csv")
    print("• Performance benchmark: python tools/features/ci_validation.py --step benchmarks")

    print("\n📚 Documentation:")
    print("• Feature specs: features/*.yaml")
    print("• Implementation guide: features_impl.py")
    print("• Architecture overview: features/README.md")


def main():
    """Main setup routine."""
    print("🚀 Blaze Sports Intelligence Feature Engineering Setup")
    print("=" * 60)

    project_root = Path.cwd()

    # Check prerequisites
    if not check_python_version():
        sys.exit(1)

    system_deps = check_system_dependencies()

    if not system_deps.get("redis-server", False):
        print("\n⚠️ Warning: Redis server not found!")
        print("Install Redis for full functionality:")

        if platform.system() == "Darwin":  # macOS
            print("  brew install redis")
        elif platform.system() == "Linux":
            print("  sudo apt-get install redis-server  # Ubuntu/Debian")
            print("  sudo yum install redis            # CentOS/RHEL")
        else:
            print("  Visit: https://redis.io/download")

    # Setup process
    try:
        setup_directories(project_root)

        if not install_python_dependencies(project_root):
            print("❌ Failed to install dependencies, but continuing...")

        setup_redis_config(project_root)
        create_environment_file(project_root)

        # Validate existing features if any
        if not validate_feature_files(project_root):
            print("⚠️ Feature validation had issues, but setup continues...")

        # Generate and run initial tests
        if not run_initial_tests(project_root):
            print("⚠️ Initial tests had issues, but setup is complete...")

        print_next_steps()

    except KeyboardInterrupt:
        print("\n🛑 Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Setup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()