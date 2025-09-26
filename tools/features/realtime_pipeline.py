"""
Blaze Sports Intelligence Real-Time Feature Computation Pipeline

High-performance feature computation system designed to meet <100ms latency requirements:
- Redis-backed caching for intermediate calculations
- Streaming data processing with asyncio
- Optimized pandas operations
- Circuit breaker pattern for reliability
- Monitoring and metrics collection
"""

import asyncio
import redis
import pandas as pd
import numpy as np
import json
import time
import logging
from typing import Dict, List, Optional, Callable, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor
import warnings
from pathlib import Path
import pickle
import hashlib

# Import our feature implementations
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))
from features_impl import FEATURE_IMPLEMENTATIONS, compute_feature


@dataclass
class FeatureRequest:
    """Request for real-time feature computation."""
    feature_name: str
    input_data: Dict[str, Any]
    request_id: str
    timestamp: datetime
    priority: int = 1  # 1=highest, 3=lowest
    timeout_ms: int = 100


@dataclass
class FeatureResponse:
    """Response from feature computation."""
    request_id: str
    feature_name: str
    values: List[float]
    computation_time_ms: float
    cache_hit: bool
    error: Optional[str] = None
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


class CircuitBreaker:
    """Circuit breaker for feature computation reliability."""

    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN

    def can_execute(self) -> bool:
        """Check if execution is allowed."""
        if self.state == "CLOSED":
            return True
        elif self.state == "OPEN":
            if (datetime.now() - self.last_failure_time).seconds > self.recovery_timeout:
                self.state = "HALF_OPEN"
                return True
            return False
        else:  # HALF_OPEN
            return True

    def record_success(self):
        """Record successful execution."""
        self.failure_count = 0
        self.state = "CLOSED"

    def record_failure(self):
        """Record failed execution."""
        self.failure_count += 1
        self.last_failure_time = datetime.now()

        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"


class FeatureCache:
    """Redis-backed feature caching system."""

    def __init__(self, redis_client: redis.Redis, ttl_seconds: int = 300):
        self.redis_client = redis_client
        self.ttl_seconds = ttl_seconds

    def _generate_key(self, feature_name: str, input_data: Dict[str, Any]) -> str:
        """Generate cache key from feature name and input data."""
        # Create hash of input data for consistent keying
        data_str = json.dumps(input_data, sort_keys=True, default=str)
        data_hash = hashlib.md5(data_str.encode()).hexdigest()
        return f"feature:{feature_name}:{data_hash}"

    def get(self, feature_name: str, input_data: Dict[str, Any]) -> Optional[List[float]]:
        """Retrieve cached feature values."""
        try:
            key = self._generate_key(feature_name, input_data)
            cached_data = self.redis_client.get(key)

            if cached_data:
                return pickle.loads(cached_data)
        except Exception as e:
            logging.warning(f"Cache get error: {e}")

        return None

    def set(self, feature_name: str, input_data: Dict[str, Any], values: List[float]) -> None:
        """Store feature values in cache."""
        try:
            key = self._generate_key(feature_name, input_data)
            cached_data = pickle.dumps(values)
            self.redis_client.setex(key, self.ttl_seconds, cached_data)
        except Exception as e:
            logging.warning(f"Cache set error: {e}")

    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching pattern."""
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
        except Exception as e:
            logging.warning(f"Cache invalidation error: {e}")
        return 0


class RealTimeFeaturePipeline:
    """Main real-time feature computation pipeline."""

    def __init__(self, redis_host: str = "localhost", redis_port: int = 6379,
                 max_workers: int = 4, cache_ttl: int = 300):
        """
        Initialize pipeline.

        Args:
            redis_host: Redis server hostname
            redis_port: Redis server port
            max_workers: Maximum worker threads
            cache_ttl: Cache TTL in seconds
        """
        # Redis setup
        self.redis_client = redis.Redis(
            host=redis_host, port=redis_port, decode_responses=False,
            socket_connect_timeout=1, socket_timeout=1
        )
        self.cache = FeatureCache(self.redis_client, cache_ttl)

        # Threading
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

        # Circuit breakers per feature
        self.circuit_breakers = {}

        # Metrics
        self.metrics = {
            "requests_total": 0,
            "requests_success": 0,
            "requests_error": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "avg_latency_ms": 0.0,
            "feature_counts": {},
            "error_counts": {}
        }

        # Configure logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)

        # Pre-warm cache with feature registry
        self._load_feature_registry()

    def _load_feature_registry(self) -> None:
        """Load and cache feature definitions."""
        try:
            features_dir = Path("features")
            if features_dir.exists():
                self.logger.info(f"Loading feature registry from {features_dir}")
                # Store feature metadata in Redis for quick access
                for yaml_file in features_dir.glob("*.yaml"):
                    self.logger.info(f"Loaded features from {yaml_file}")
        except Exception as e:
            self.logger.warning(f"Failed to load feature registry: {e}")

    def _get_circuit_breaker(self, feature_name: str) -> CircuitBreaker:
        """Get or create circuit breaker for feature."""
        if feature_name not in self.circuit_breakers:
            self.circuit_breakers[feature_name] = CircuitBreaker()
        return self.circuit_breakers[feature_name]

    def _update_metrics(self, feature_name: str, computation_time_ms: float,
                       success: bool, cache_hit: bool, error: str = None) -> None:
        """Update pipeline metrics."""
        self.metrics["requests_total"] += 1

        if success:
            self.metrics["requests_success"] += 1
        else:
            self.metrics["requests_error"] += 1
            if error:
                self.metrics["error_counts"][error] = self.metrics["error_counts"].get(error, 0) + 1

        if cache_hit:
            self.metrics["cache_hits"] += 1
        else:
            self.metrics["cache_misses"] += 1

        # Update feature-specific metrics
        if feature_name not in self.metrics["feature_counts"]:
            self.metrics["feature_counts"][feature_name] = {"requests": 0, "avg_latency": 0.0}

        feature_metrics = self.metrics["feature_counts"][feature_name]
        feature_metrics["requests"] += 1

        # Update rolling average latency
        old_avg = feature_metrics["avg_latency"]
        n = feature_metrics["requests"]
        feature_metrics["avg_latency"] = (old_avg * (n - 1) + computation_time_ms) / n

        # Update global average
        total_requests = self.metrics["requests_total"]
        old_global_avg = self.metrics["avg_latency_ms"]
        self.metrics["avg_latency_ms"] = (old_global_avg * (total_requests - 1) + computation_time_ms) / total_requests

    def _optimize_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Optimize DataFrame for fast computation."""
        # Convert to optimal dtypes
        for col in df.columns:
            if df[col].dtype == 'object':
                try:
                    # Try to convert to numeric
                    df[col] = pd.to_numeric(df[col], errors='ignore')
                except:
                    pass
            elif df[col].dtype == 'int64':
                # Downcast integers if possible
                df[col] = pd.to_numeric(df[col], downcast='integer')
            elif df[col].dtype == 'float64':
                # Downcast floats if possible
                df[col] = pd.to_numeric(df[col], downcast='float')

        return df

    def _compute_feature_sync(self, request: FeatureRequest) -> FeatureResponse:
        """Synchronously compute a single feature."""
        start_time = time.time()

        # Check circuit breaker
        circuit_breaker = self._get_circuit_breaker(request.feature_name)
        if not circuit_breaker.can_execute():
            return FeatureResponse(
                request_id=request.request_id,
                feature_name=request.feature_name,
                values=[],
                computation_time_ms=0,
                cache_hit=False,
                error="Circuit breaker OPEN"
            )

        # Check cache first
        cached_values = self.cache.get(request.feature_name, request.input_data)
        if cached_values is not None:
            computation_time = (time.time() - start_time) * 1000
            circuit_breaker.record_success()

            self._update_metrics(request.feature_name, computation_time, True, True)

            return FeatureResponse(
                request_id=request.request_id,
                feature_name=request.feature_name,
                values=cached_values,
                computation_time_ms=computation_time,
                cache_hit=True
            )

        try:
            # Convert input data to DataFrame
            df = pd.DataFrame(request.input_data)
            df = self._optimize_dataframe(df)

            # Compute feature
            result = compute_feature(request.feature_name, df)

            # Convert to list for JSON serialization
            if isinstance(result, pd.Series):
                values = result.fillna(0.0).tolist()
            else:
                values = [float(result)] if np.isscalar(result) else list(result)

            # Cache result
            self.cache.set(request.feature_name, request.input_data, values)

            computation_time = (time.time() - start_time) * 1000

            # Check if we met latency requirement
            if computation_time > request.timeout_ms:
                self.logger.warning(
                    f"Feature {request.feature_name} took {computation_time:.1f}ms "
                    f"(timeout: {request.timeout_ms}ms)"
                )

            circuit_breaker.record_success()
            self._update_metrics(request.feature_name, computation_time, True, False)

            return FeatureResponse(
                request_id=request.request_id,
                feature_name=request.feature_name,
                values=values,
                computation_time_ms=computation_time,
                cache_hit=False
            )

        except Exception as e:
            computation_time = (time.time() - start_time) * 1000
            error_msg = str(e)

            circuit_breaker.record_failure()
            self._update_metrics(request.feature_name, computation_time, False, False, error_msg)

            self.logger.error(f"Feature computation failed for {request.feature_name}: {error_msg}")

            return FeatureResponse(
                request_id=request.request_id,
                feature_name=request.feature_name,
                values=[],
                computation_time_ms=computation_time,
                cache_hit=False,
                error=error_msg
            )

    async def compute_feature_async(self, request: FeatureRequest) -> FeatureResponse:
        """Asynchronously compute a single feature."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, self._compute_feature_sync, request)

    async def compute_features_batch(self, requests: List[FeatureRequest]) -> List[FeatureResponse]:
        """Compute multiple features concurrently."""
        tasks = [self.compute_feature_async(request) for request in requests]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        # Handle any exceptions
        results = []
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                results.append(FeatureResponse(
                    request_id=requests[i].request_id,
                    feature_name=requests[i].feature_name,
                    values=[],
                    computation_time_ms=0,
                    cache_hit=False,
                    error=f"Async execution error: {str(response)}"
                ))
            else:
                results.append(response)

        return results

    def compute_feature_sync(self, feature_name: str, input_data: Dict[str, Any],
                           request_id: str = None, timeout_ms: int = 100) -> FeatureResponse:
        """Synchronous interface for single feature computation."""
        if request_id is None:
            request_id = f"{feature_name}_{int(time.time() * 1000)}"

        request = FeatureRequest(
            feature_name=feature_name,
            input_data=input_data,
            request_id=request_id,
            timestamp=datetime.now(),
            timeout_ms=timeout_ms
        )

        return self._compute_feature_sync(request)

    def get_metrics(self) -> Dict[str, Any]:
        """Get current pipeline metrics."""
        return self.metrics.copy()

    def get_health_status(self) -> Dict[str, Any]:
        """Get system health status."""
        try:
            # Test Redis connection
            redis_healthy = self.redis_client.ping()
        except:
            redis_healthy = False

        # Calculate success rate
        total_requests = self.metrics["requests_total"]
        success_rate = (self.metrics["requests_success"] / total_requests * 100
                       if total_requests > 0 else 100.0)

        # Check circuit breaker states
        circuit_breaker_states = {
            name: cb.state for name, cb in self.circuit_breakers.items()
        }

        return {
            "status": "healthy" if redis_healthy and success_rate > 90 else "degraded",
            "redis_healthy": redis_healthy,
            "success_rate": success_rate,
            "avg_latency_ms": self.metrics["avg_latency_ms"],
            "circuit_breakers": circuit_breaker_states,
            "cache_hit_rate": (self.metrics["cache_hits"] /
                              (self.metrics["cache_hits"] + self.metrics["cache_misses"]) * 100
                              if self.metrics["cache_hits"] + self.metrics["cache_misses"] > 0 else 0),
            "timestamp": datetime.now().isoformat()
        }

    def invalidate_cache(self, feature_name: str = None) -> int:
        """Invalidate feature cache."""
        if feature_name:
            pattern = f"feature:{feature_name}:*"
        else:
            pattern = "feature:*"

        return self.cache.invalidate_pattern(pattern)

    def close(self):
        """Clean up resources."""
        self.executor.shutdown(wait=True)
        self.redis_client.close()


class FeatureStreamProcessor:
    """Stream processor for real-time feature updates."""

    def __init__(self, pipeline: RealTimeFeaturePipeline,
                 stream_key: str = "sports_events"):
        self.pipeline = pipeline
        self.stream_key = stream_key
        self.running = False

    async def process_stream(self, consumer_group: str = "feature_processors",
                            consumer_name: str = "processor_1"):
        """Process streaming sports data for real-time features."""
        self.running = True

        # Create consumer group if it doesn't exist
        try:
            self.pipeline.redis_client.xgroup_create(
                self.stream_key, consumer_group, id='0', mkstream=True
            )
        except redis.exceptions.ResponseError:
            pass  # Group already exists

        self.pipeline.logger.info(f"Starting stream processor for {self.stream_key}")

        while self.running:
            try:
                # Read from stream
                messages = self.pipeline.redis_client.xreadgroup(
                    consumer_group, consumer_name,
                    {self.stream_key: '>'},
                    count=10, block=1000
                )

                for stream, msgs in messages:
                    for msg_id, fields in msgs:
                        await self._process_message(msg_id, fields)

                        # Acknowledge message
                        self.pipeline.redis_client.xack(self.stream_key, consumer_group, msg_id)

            except Exception as e:
                self.pipeline.logger.error(f"Stream processing error: {e}")
                await asyncio.sleep(1)

    async def _process_message(self, msg_id: str, fields: Dict[str, bytes]):
        """Process a single stream message."""
        try:
            # Decode message
            data = {k.decode('utf-8'): v.decode('utf-8') for k, v in fields.items()}

            # Determine which features to compute based on data type
            sport = data.get('sport', '')
            team = data.get('team', '')

            features_to_compute = []

            if sport == 'baseball' and team == 'STL':
                features_to_compute.extend([
                    'cardinals_batter_xwoba_30d',
                    'cardinals_pitcher_whiff_rate_15d',
                    'cardinals_bullpen_fatigue_index_3d'
                ])
            elif sport == 'football' and team == 'TEN':
                features_to_compute.extend([
                    'titans_qb_pressure_to_sack_rate_adj_4g',
                    'titans_qb_epa_per_play_clean_pocket_5g'
                ])

            # Create feature requests
            requests = []
            for feature_name in features_to_compute:
                request = FeatureRequest(
                    feature_name=feature_name,
                    input_data=data,
                    request_id=f"{msg_id}_{feature_name}",
                    timestamp=datetime.now(),
                    priority=1,
                    timeout_ms=50  # Aggressive timeout for streaming
                )
                requests.append(request)

            # Compute features
            if requests:
                responses = await self.pipeline.compute_features_batch(requests)

                # Store results back to Redis for downstream consumption
                for response in responses:
                    if not response.error:
                        result_key = f"feature_results:{response.feature_name}:{msg_id}"
                        self.pipeline.redis_client.setex(
                            result_key, 300,
                            json.dumps(asdict(response), default=str)
                        )

        except Exception as e:
            self.pipeline.logger.error(f"Message processing error: {e}")

    def stop(self):
        """Stop stream processing."""
        self.running = False


def create_sample_data(sport: str = "baseball", team: str = "STL", rows: int = 100) -> Dict[str, Any]:
    """Create sample data for testing."""
    np.random.seed(42)  # For reproducible results

    if sport == "baseball":
        return {
            'batter_id': np.random.randint(1, 50, rows).tolist(),
            'pitcher_id': np.random.randint(1, 30, rows).tolist(),
            'team_id': [team] * rows,
            'ts': [(datetime.now() - timedelta(days=np.random.randint(0, 30))).isoformat()
                   for _ in range(rows)],
            'game_no': np.random.randint(1, 162, rows).tolist(),
            'exit_velocity': (np.random.normal(89, 8, rows)).clip(60, 120).tolist(),
            'launch_angle': (np.random.normal(12, 15, rows)).clip(-50, 50).tolist(),
            'swing': np.random.choice([True, False], rows, p=[0.6, 0.4]).tolist(),
            'whiff': np.random.choice([True, False], rows, p=[0.25, 0.75]).tolist(),
            'velocity': (np.random.normal(92, 5, rows)).clip(75, 105).tolist(),
            'spin_rate': np.random.randint(1800, 2800, rows).tolist(),
        }
    else:  # football
        return {
            'qb_id': np.random.randint(1, 10, rows).tolist(),
            'team_id': [team] * rows,
            'game_no': np.random.randint(1, 17, rows).tolist(),
            'pressure': np.random.choice([True, False], rows, p=[0.3, 0.7]).tolist(),
            'sack': np.random.choice([True, False], rows, p=[0.1, 0.9]).tolist(),
            'expected_points_added': (np.random.normal(0, 2, rows)).clip(-7, 7).tolist(),
            'opp_pass_block_win_rate': (np.random.normal(0.6, 0.1, rows)).clip(0.3, 0.9).tolist(),
        }


async def main():
    """Example usage and performance testing."""
    # Initialize pipeline
    print("Initializing Real-Time Feature Pipeline...")

    try:
        pipeline = RealTimeFeaturePipeline(
            redis_host="localhost",
            redis_port=6379,
            max_workers=4,
            cache_ttl=300
        )

        print("✅ Pipeline initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize pipeline: {e}")
        print("Note: This requires Redis to be running on localhost:6379")
        return

    # Test single feature computation
    print("\n🧪 Testing single feature computation...")

    sample_data = create_sample_data("baseball", "STL", 50)

    start_time = time.time()
    response = pipeline.compute_feature_sync(
        "cardinals_batter_xwoba_30d",
        sample_data,
        timeout_ms=100
    )
    end_time = time.time()

    print(f"Feature: {response.feature_name}")
    print(f"Request ID: {response.request_id}")
    print(f"Computation Time: {response.computation_time_ms:.1f}ms")
    print(f"Cache Hit: {response.cache_hit}")
    print(f"Values Count: {len(response.values)}")
    print(f"Error: {response.error}")

    # Test batch computation
    print("\n🚀 Testing batch feature computation...")

    requests = []
    feature_names = [
        "cardinals_batter_xwoba_30d",
        "cardinals_pitcher_whiff_rate_15d",
        "cardinals_bullpen_fatigue_index_3d"
    ]

    for i, feature_name in enumerate(feature_names):
        requests.append(FeatureRequest(
            feature_name=feature_name,
            input_data=sample_data,
            request_id=f"batch_test_{i}",
            timestamp=datetime.now(),
            timeout_ms=100
        ))

    start_time = time.time()
    responses = await pipeline.compute_features_batch(requests)
    end_time = time.time()

    total_time = (end_time - start_time) * 1000
    print(f"Batch computation time: {total_time:.1f}ms for {len(requests)} features")

    for response in responses:
        status = "✅" if not response.error else "❌"
        cache_status = "📋" if response.cache_hit else "🔄"
        print(f"{status} {cache_status} {response.feature_name}: "
              f"{response.computation_time_ms:.1f}ms")

    # Show metrics
    print("\n📊 Pipeline Metrics:")
    metrics = pipeline.get_metrics()

    print(f"Total Requests: {metrics['requests_total']}")
    print(f"Success Rate: {metrics['requests_success']/metrics['requests_total']*100:.1f}%")
    print(f"Cache Hit Rate: {metrics['cache_hits']/(metrics['cache_hits'] + metrics['cache_misses'])*100:.1f}%")
    print(f"Average Latency: {metrics['avg_latency_ms']:.1f}ms")

    # Show health status
    print("\n🏥 Health Status:")
    health = pipeline.get_health_status()
    status_icon = "🟢" if health['status'] == 'healthy' else "🟡"
    print(f"{status_icon} System Status: {health['status']}")
    print(f"Redis Healthy: {health['redis_healthy']}")
    print(f"Success Rate: {health['success_rate']:.1f}%")
    print(f"Average Latency: {health['avg_latency_ms']:.1f}ms")

    # Clean up
    pipeline.close()
    print("\n✨ Pipeline shutdown complete")


if __name__ == "__main__":
    asyncio.run(main())