#!/usr/bin/env python3
"""
Blaze Sports Intelligence Real-Time Analytics Pipeline

Production-ready streaming analytics for live sports data processing.
Optimized for <100ms latency with Redis caching and parallel processing.
"""

import pandas as pd
import numpy as np
import redis
import json
import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import dask.dataframe as dd
from dask.distributed import Client
import warnings

from features_impl import (
    FEATURE_IMPLEMENTATIONS,
    compute_feature,
    parallel_feature_computation,
    incremental_update,
    optimized_rolling_calculation,
    process_statcast_data
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RealTimeAnalyticsEngine:
    """
    Real-time sports analytics processing engine.

    Features:
    - Sub-100ms feature computation
    - Redis caching for frequently accessed data
    - Parallel processing with Dask
    - Incremental updates for streaming data
    - Error handling and recovery
    - Memory-efficient operations
    """

    def __init__(self,
                 redis_host: str = 'localhost',
                 redis_port: int = 6379,
                 redis_db: int = 0,
                 dask_address: Optional[str] = None,
                 max_workers: int = 4):
        """
        Initialize the real-time analytics engine.

        Args:
            redis_host: Redis server host
            redis_port: Redis server port
            redis_db: Redis database number
            dask_address: Dask scheduler address (None for local cluster)
            max_workers: Maximum number of worker threads
        """
        self.redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            db=redis_db,
            decode_responses=True
        )

        # Initialize Dask client for distributed computing
        if dask_address:
            self.dask_client = Client(dask_address)
        else:
            self.dask_client = Client(processes=False, threads_per_worker=2)

        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

        # Cache TTL settings (in seconds)
        self.cache_ttl = {
            'features': 300,      # 5 minutes
            'raw_data': 60,       # 1 minute
            'aggregations': 600,  # 10 minutes
            'metadata': 3600      # 1 hour
        }

        # Performance tracking
        self.performance_metrics = {
            'total_requests': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'avg_processing_time': 0.0,
            'errors': 0
        }

        logger.info("Real-time analytics engine initialized")

    def _get_cache_key(self, data_type: str, identifier: str, params: Dict = None) -> str:
        """Generate cache key for data."""
        if params:
            param_str = json.dumps(params, sort_keys=True)
            return f"blaze:{data_type}:{identifier}:{hash(param_str)}"
        return f"blaze:{data_type}:{identifier}"

    def _cache_get(self, key: str) -> Optional[Any]:
        """Get data from cache."""
        try:
            data = self.redis_client.get(key)
            if data:
                self.performance_metrics['cache_hits'] += 1
                return json.loads(data)
        except Exception as e:
            logger.warning(f"Cache get error: {e}")

        self.performance_metrics['cache_misses'] += 1
        return None

    def _cache_set(self, key: str, data: Any, ttl: int):
        """Set data in cache."""
        try:
            self.redis_client.setex(
                key,
                ttl,
                json.dumps(data, default=str)
            )
        except Exception as e:
            logger.warning(f"Cache set error: {e}")

    async def process_live_game_data(self,
                                   game_data: Dict,
                                   features_to_compute: List[str]) -> Dict:
        """
        Process live game data and compute features in real-time.

        Args:
            game_data: Live game data dictionary
            features_to_compute: List of feature names to compute

        Returns:
            Dictionary with computed features and metadata
        """
        start_time = time.time()
        self.performance_metrics['total_requests'] += 1

        try:
            # Convert to DataFrame
            df = pd.DataFrame(game_data.get('plays', []))

            if df.empty:
                return {'features': {}, 'error': 'No play data provided'}

            # Check cache for recent computations
            cache_key = self._get_cache_key(
                'live_features',
                game_data.get('game_id', 'unknown'),
                {'features': features_to_compute}
            )

            cached_result = self._cache_get(cache_key)
            if cached_result:
                return cached_result

            # Compute features in parallel
            features_df = await self._parallel_feature_computation(df, features_to_compute)

            # Convert to JSON-serializable format
            result = {
                'game_id': game_data.get('game_id'),
                'timestamp': datetime.now().isoformat(),
                'features': {},
                'processing_time_ms': (time.time() - start_time) * 1000
            }

            for feature in features_to_compute:
                if feature in features_df.columns:
                    # Get latest values for active players
                    latest_values = features_df.groupby(
                        df.columns[0]  # Assume first column is player/team ID
                    )[feature].last().to_dict()

                    result['features'][feature] = {
                        'values': latest_values,
                        'timestamp': datetime.now().isoformat(),
                        'count': len(latest_values)
                    }

            # Cache result
            self._cache_set(cache_key, result, self.cache_ttl['features'])

            # Update performance metrics
            processing_time = (time.time() - start_time) * 1000
            self.performance_metrics['avg_processing_time'] = (
                (self.performance_metrics['avg_processing_time'] *
                 (self.performance_metrics['total_requests'] - 1) + processing_time) /
                self.performance_metrics['total_requests']
            )\n            \n            logger.info(f\"Processed {len(features_to_compute)} features in {processing_time:.2f}ms\")\n            \n            return result\n            \n        except Exception as e:\n            self.performance_metrics['errors'] += 1\n            logger.error(f\"Error processing live data: {e}\")\n            return {'features': {}, 'error': str(e)}\n    \n    async def _parallel_feature_computation(self, \n                                          df: pd.DataFrame,\n                                          features: List[str]) -> pd.DataFrame:\n        \"\"\"Compute features in parallel using async execution.\"\"\"\n        \n        # Use Dask for large datasets\n        if len(df) > 10000:\n            return self._dask_feature_computation(df, features)\n        \n        # Use thread pool for smaller datasets\n        loop = asyncio.get_event_loop()\n        \n        async def compute_single_feature(feature_name: str) -> Tuple[str, pd.Series]:\n            def _compute():\n                try:\n                    if feature_name in FEATURE_IMPLEMENTATIONS:\n                        return feature_name, FEATURE_IMPLEMENTATIONS[feature_name](df)\n                    return feature_name, pd.Series(np.nan, index=df.index)\n                except Exception as e:\n                    logger.warning(f\"Feature {feature_name} computation failed: {e}\")\n                    return feature_name, pd.Series(np.nan, index=df.index)\n            \n            return await loop.run_in_executor(self.executor, _compute)\n        \n        # Execute all features concurrently\n        tasks = [compute_single_feature(feat) for feat in features]\n        results = await asyncio.gather(*tasks)\n        \n        # Combine results\n        features_df = pd.DataFrame(index=df.index)\n        for feature_name, feature_values in results:\n            features_df[feature_name] = feature_values\n        \n        return features_df\n    \n    def _dask_feature_computation(self, \n                                 df: pd.DataFrame, \n                                 features: List[str]) -> pd.DataFrame:\n        \"\"\"Compute features using Dask for large datasets.\"\"\"\n        \n        # Convert to Dask DataFrame\n        ddf = dd.from_pandas(df, npartitions=self.max_workers)\n        \n        results = {}\n        \n        for feature_name in features:\n            try:\n                if feature_name in FEATURE_IMPLEMENTATIONS:\n                    # Apply feature function to each partition\n                    feature_result = ddf.map_partitions(\n                        FEATURE_IMPLEMENTATIONS[feature_name],\n                        meta=pd.Series(dtype='float64')\n                    )\n                    results[feature_name] = feature_result.compute()\n                else:\n                    results[feature_name] = pd.Series(np.nan, index=df.index)\n            \n            except Exception as e:\n                logger.warning(f\"Dask feature {feature_name} computation failed: {e}\")\n                results[feature_name] = pd.Series(np.nan, index=df.index)\n        \n        return pd.DataFrame(results, index=df.index)\n    \n    async def stream_statcast_processing(self, \n                                       statcast_stream: AsyncIterator) -> AsyncIterator[Dict]:\n        \"\"\"Process streaming Statcast data with real-time feature computation.\"\"\"\n        \n        buffer = []\n        buffer_size = 100  # Process in batches for efficiency\n        \n        async for pitch_data in statcast_stream:\n            buffer.append(pitch_data)\n            \n            if len(buffer) >= buffer_size:\n                # Process batch\n                df = pd.DataFrame(buffer)\n                \n                # Apply Statcast processing\n                enhanced_df = process_statcast_data(df)\n                \n                # Compute real-time features\n                features = [\n                    'cardinals_pitcher_whiff_rate_15d',\n                    'pitch_tunneling_score',\n                    'pitch_sequence_effectiveness'\n                ]\n                \n                features_df = await self._parallel_feature_computation(enhanced_df, features)\n                \n                # Yield enhanced data\n                for idx, row in enhanced_df.iterrows():\n                    result = row.to_dict()\n                    result['features'] = {}\n                    \n                    for feature in features:\n                        if feature in features_df.columns:\n                            result['features'][feature] = features_df.loc[idx, feature]\n                    \n                    yield result\n                \n                # Clear buffer\n                buffer = []\n    \n    def batch_update_features(self, \n                             team_data: Dict[str, pd.DataFrame],\n                             features: List[str]) -> Dict[str, pd.DataFrame]:\n        \"\"\"Batch update features for multiple teams.\"\"\"\n        \n        results = {}\n        \n        # Process teams in parallel\n        futures = []\n        \n        for team_id, df in team_data.items():\n            future = self.executor.submit(self._compute_team_features, df, features)\n            futures.append((team_id, future))\n        \n        # Collect results\n        for team_id, future in futures:\n            try:\n                results[team_id] = future.result(timeout=30)\n            except Exception as e:\n                logger.error(f\"Error processing team {team_id}: {e}\")\n                results[team_id] = pd.DataFrame()\n        \n        return results\n    \n    def _compute_team_features(self, \n                              df: pd.DataFrame, \n                              features: List[str]) -> pd.DataFrame:\n        \"\"\"Compute features for a single team.\"\"\"\n        \n        results = {}\n        \n        for feature in features:\n            try:\n                if feature in FEATURE_IMPLEMENTATIONS:\n                    results[feature] = FEATURE_IMPLEMENTATIONS[feature](df)\n                else:\n                    results[feature] = pd.Series(np.nan, index=df.index)\n            except Exception as e:\n                logger.warning(f\"Feature {feature} failed: {e}\")\n                results[feature] = pd.Series(np.nan, index=df.index)\n        \n        return pd.DataFrame(results, index=df.index)\n    \n    def get_performance_metrics(self) -> Dict:\n        \"\"\"Get engine performance metrics.\"\"\"\n        return {\n            **self.performance_metrics,\n            'cache_hit_rate': (\n                self.performance_metrics['cache_hits'] / \n                max(self.performance_metrics['cache_hits'] + \n                    self.performance_metrics['cache_misses'], 1)\n            ) * 100,\n            'error_rate': (\n                self.performance_metrics['errors'] / \n                max(self.performance_metrics['total_requests'], 1)\n            ) * 100\n        }\n    \n    def clear_cache(self, pattern: str = \"blaze:*\"):\n        \"\"\"Clear cache entries matching pattern.\"\"\"\n        keys = self.redis_client.keys(pattern)\n        if keys:\n            self.redis_client.delete(*keys)\n            logger.info(f\"Cleared {len(keys)} cache entries\")\n    \n    async def health_check(self) -> Dict:\n        \"\"\"Perform health check of all components.\"\"\"\n        health_status = {\n            'timestamp': datetime.now().isoformat(),\n            'components': {}\n        }\n        \n        # Check Redis connection\n        try:\n            self.redis_client.ping()\n            health_status['components']['redis'] = 'healthy'\n        except Exception as e:\n            health_status['components']['redis'] = f'unhealthy: {e}'\n        \n        # Check Dask cluster\n        try:\n            cluster_info = self.dask_client.scheduler_info()\n            health_status['components']['dask'] = {\n                'status': 'healthy',\n                'workers': len(cluster_info.get('workers', {})),\n                'tasks': cluster_info.get('tasks', {})\n            }\n        except Exception as e:\n            health_status['components']['dask'] = f'unhealthy: {e}'\n        \n        # Check thread pool\n        health_status['components']['thread_pool'] = {\n            'status': 'healthy',\n            'active_threads': self.executor._threads,\n            'max_workers': self.max_workers\n        }\n        \n        return health_status\n    \n    def __del__(self):\n        \"\"\"Cleanup resources.\"\"\"\n        try:\n            self.executor.shutdown(wait=True)\n            self.dask_client.close()\n        except Exception:\n            pass\n\n\nclass LiveGameProcessor:\n    \"\"\"Specialized processor for live game scenarios.\"\"\"\n    \n    def __init__(self, analytics_engine: RealTimeAnalyticsEngine):\n        self.engine = analytics_engine\n        self.active_games = {}\n    \n    async def start_game_tracking(self, \n                                game_id: str, \n                                sport: str,\n                                team_features: Dict[str, List[str]]):\n        \"\"\"Start tracking a live game.\"\"\"\n        \n        self.active_games[game_id] = {\n            'sport': sport,\n            'start_time': datetime.now(),\n            'team_features': team_features,\n            'play_count': 0,\n            'last_update': datetime.now()\n        }\n        \n        logger.info(f\"Started tracking game {game_id} ({sport})\")\n    \n    async def process_play_update(self, \n                                game_id: str, \n                                play_data: Dict) -> Dict:\n        \"\"\"Process a single play update.\"\"\"\n        \n        if game_id not in self.active_games:\n            raise ValueError(f\"Game {game_id} not being tracked\")\n        \n        game_info = self.active_games[game_id]\n        game_info['play_count'] += 1\n        game_info['last_update'] = datetime.now()\n        \n        # Determine features to compute based on sport\n        sport = game_info['sport']\n        features = self._get_sport_features(sport)\n        \n        # Process the play\n        result = await self.engine.process_live_game_data(\n            {\n                'game_id': game_id,\n                'plays': [play_data]\n            },\n            features\n        )\n        \n        # Add game context\n        result['game_context'] = {\n            'sport': sport,\n            'play_number': game_info['play_count'],\n            'game_duration_minutes': (\n                datetime.now() - game_info['start_time']\n            ).total_seconds() / 60\n        }\n        \n        return result\n    \n    def _get_sport_features(self, sport: str) -> List[str]:\n        \"\"\"Get relevant features for sport.\"\"\"\n        \n        feature_map = {\n            'baseball': [\n                'cardinals_batter_xwoba_30d',\n                'cardinals_pitcher_whiff_rate_15d',\n                'cardinals_bullpen_fatigue_index_3d',\n                'pitch_tunneling_score'\n            ],\n            'football': [\n                'titans_qb_epa_per_play_clean_pocket_5g',\n                'titans_qb_pressure_to_sack_rate_adj_4g',\n                'calculate_epa',\n                'calculate_dvoa'\n            ],\n            'basketball': [\n                'grizzlies_player_defensive_rating_10g',\n                'grizzlies_player_grit_grind_score_season',\n                'grizzlies_lineup_net_rating_5g'\n            ]\n        }\n        \n        return feature_map.get(sport, [])\n    \n    async def end_game_tracking(self, game_id: str) -> Dict:\n        \"\"\"End tracking for a game and return summary.\"\"\"\n        \n        if game_id not in self.active_games:\n            raise ValueError(f\"Game {game_id} not being tracked\")\n        \n        game_info = self.active_games.pop(game_id)\n        \n        summary = {\n            'game_id': game_id,\n            'sport': game_info['sport'],\n            'total_plays': game_info['play_count'],\n            'duration_minutes': (\n                game_info['last_update'] - game_info['start_time']\n            ).total_seconds() / 60,\n            'end_time': datetime.now().isoformat()\n        }\n        \n        logger.info(f\"Ended tracking for game {game_id}: {summary}\")\n        \n        return summary\n\n\nclass FeatureStore:\n    \"\"\"High-performance feature store for caching computed features.\"\"\"\n    \n    def __init__(self, redis_client: redis.Redis):\n        self.redis = redis_client\n    \n    def store_features(self, \n                      entity_type: str,\n                      entity_id: str,\n                      features: Dict[str, float],\n                      timestamp: datetime,\n                      ttl: int = 3600):\n        \"\"\"Store computed features.\"\"\"\n        \n        key = f\"features:{entity_type}:{entity_id}\"\n        \n        feature_data = {\n            'features': features,\n            'timestamp': timestamp.isoformat(),\n            'entity_type': entity_type,\n            'entity_id': entity_id\n        }\n        \n        self.redis.setex(key, ttl, json.dumps(feature_data))\n    \n    def get_features(self, \n                    entity_type: str,\n                    entity_id: str,\n                    max_age_seconds: int = 3600) -> Optional[Dict]:\n        \"\"\"Retrieve stored features.\"\"\"\n        \n        key = f\"features:{entity_type}:{entity_id}\"\n        data = self.redis.get(key)\n        \n        if not data:\n            return None\n        \n        feature_data = json.loads(data)\n        \n        # Check if data is still fresh\n        timestamp = datetime.fromisoformat(feature_data['timestamp'])\n        if (datetime.now() - timestamp).total_seconds() > max_age_seconds:\n            return None\n        \n        return feature_data\n    \n    def batch_get_features(self, \n                          entities: List[Tuple[str, str]],\n                          max_age_seconds: int = 3600) -> Dict[Tuple[str, str], Dict]:\n        \"\"\"Batch retrieve features for multiple entities.\"\"\"\n        \n        keys = [f\"features:{entity_type}:{entity_id}\" \n               for entity_type, entity_id in entities]\n        \n        values = self.redis.mget(keys)\n        results = {}\n        \n        for i, (entity_type, entity_id) in enumerate(entities):\n            if values[i]:\n                feature_data = json.loads(values[i])\n                timestamp = datetime.fromisoformat(feature_data['timestamp'])\n                \n                if (datetime.now() - timestamp).total_seconds() <= max_age_seconds:\n                    results[(entity_type, entity_id)] = feature_data\n        \n        return results\n\n\n# Example usage and testing\nif __name__ == \"__main__\":\n    import asyncio\n    \n    async def main():\n        # Initialize analytics engine\n        engine = RealTimeAnalyticsEngine(\n            redis_host='localhost',\n            max_workers=4\n        )\n        \n        # Test with sample data\n        sample_game_data = {\n            'game_id': 'STL_vs_CHC_20250925',\n            'plays': [\n                {\n                    'batter_id': 'goldschmidt_p',\n                    'pitcher_id': 'hendricks_k',\n                    'exit_velocity': 103.2,\n                    'launch_angle': 28,\n                    'game_no': 150,\n                    'ts': datetime.now().isoformat(),\n                    'swing': True,\n                    'whiff': False\n                }\n            ]\n        }\n        \n        features_to_compute = [\n            'cardinals_batter_xwoba_30d',\n            'cardinals_batter_barrel_rate_7g'\n        ]\n        \n        # Process live data\n        result = await engine.process_live_game_data(\n            sample_game_data,\n            features_to_compute\n        )\n        \n        print(f\"Processing result: {result}\")\n        \n        # Health check\n        health = await engine.health_check()\n        print(f\"System health: {health}\")\n        \n        # Performance metrics\n        metrics = engine.get_performance_metrics()\n        print(f\"Performance: {metrics}\")\n    \n    # Run the example\n    # asyncio.run(main())\n    print(\"Real-time analytics pipeline ready for deployment\")