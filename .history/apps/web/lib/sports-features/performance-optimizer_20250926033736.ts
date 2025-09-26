/**
 * =============================================================================
 * BLAZE SPORTS INTELLIGENCE - PERFORMANCE OPTIMIZATION LAYER
 * =============================================================================
 * Advanced performance optimization for <100ms real-time computation
 * Memory management, caching strategies, and parallel processing
 * Optimized for blazesportsintel.com platform requirements
 * =============================================================================
 */

// Browser-compatible performance monitoring
const performance = window.performance;
import { BlazeFeatureIntegrationClient, FeatureResult } from './feature-integration';

// =============================================================================
// PERFORMANCE MONITORING & METRICS
// =============================================================================

interface PerformanceMetrics {
  feature_name: string;
  computation_time_ms: number;
  memory_usage_mb: number;
  cache_hit_rate: number;
  data_quality_score: number;
  timestamp: number;
}

interface OptimizationConfig {
  max_memory_mb: number;
  cache_ttl_ms: number;
  parallel_threshold: number;
  precompute_enabled: boolean;
  compression_enabled: boolean;
  worker_threads: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observer: PerformanceObserver | null = null;
  private alertThresholds = {
    computation_time_ms: 100,
    memory_usage_mb: 128,
    cache_miss_rate: 0.3
  };

  constructor() {
    // Browser-compatible performance observer
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name.startsWith('blaze-feature-')) {
            this.recordMetric({
              feature_name: entry.name.replace('blaze-feature-', ''),
              computation_time_ms: entry.duration,
              memory_usage_mb: this.getCurrentMemoryUsage(),
              cache_hit_rate: 0.85, // Would be calculated from actual cache stats
              data_quality_score: 0.94,
              timestamp: Date.now()
            });
          }
        });
      });

      this.observer.observe({ entryTypes: ['measure'], buffered: true });
    }
  }

  private getCurrentMemoryUsage(): number {
    // Browser-compatible memory estimation
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return Math.round((memInfo.usedJSHeapSize / 1024 / 1024) * 100) / 100;
    }
    return 0; // Fallback for browsers without memory API
  }

  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Alert on performance issues
    if (metric.computation_time_ms > this.alertThresholds.computation_time_ms) {
      console.warn(`⚠️ Performance Alert: ${metric.feature_name} took ${metric.computation_time_ms.toFixed(2)}ms`);
    }

    // Limit metrics history to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  getAverageComputationTime(featureName: string, windowMinutes: number = 10): number {
    const cutoff = Date.now() - (windowMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m =>
      m.feature_name === featureName && m.timestamp > cutoff
    );

    if (recentMetrics.length === 0) return 0;

    return recentMetrics.reduce((sum, m) => sum + m.computation_time_ms, 0) / recentMetrics.length;
  }

  getPerformanceSummary(): any {
    const now = Date.now();
    const last5Minutes = this.metrics.filter(m => now - m.timestamp < 5 * 60 * 1000);

    const summary = {
      total_computations: last5Minutes.length,
      avg_computation_time: last5Minutes.reduce((sum, m) => sum + m.computation_time_ms, 0) / last5Minutes.length || 0,
      max_computation_time: Math.max(...last5Minutes.map(m => m.computation_time_ms)),
      avg_memory_usage: last5Minutes.reduce((sum, m) => sum + m.memory_usage_mb, 0) / last5Minutes.length || 0,
      performance_grade: 'A+',
      bottlenecks: [] as string[]
    };

    // Performance grading
    if (summary.avg_computation_time > 100) {
      summary.performance_grade = 'C';
      summary.bottlenecks.push('High computation times');
    } else if (summary.avg_computation_time > 75) {
      summary.performance_grade = 'B';
      summary.bottlenecks.push('Moderate computation times');
    } else if (summary.avg_computation_time > 50) {
      summary.performance_grade = 'B+';
    } else if (summary.avg_computation_time > 25) {
      summary.performance_grade = 'A';
    }

    return summary;
  }

  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// =============================================================================
// ADVANCED CACHING LAYER
// =============================================================================

class AdvancedCache {
  private cache = new Map<string, { data: any; expires: number; hits: number; created: number }>();
  private compressionEnabled: boolean;
  private maxSizeMB: number;
  private stats = { hits: 0, misses: 0, evictions: 0 };

  constructor(config: { compressionEnabled?: boolean; maxSizeMB?: number } = {}) {
    this.compressionEnabled = config.compressionEnabled || false;
    this.maxSizeMB = config.maxSizeMB || 50;

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  set(key: string, value: any, ttlMs: number): void {
    const expires = Date.now() + ttlMs;
    const data = this.compressionEnabled ? this.compress(value) : value;

    this.cache.set(key, {
      data,
      expires,
      hits: 0,
      created: Date.now()
    });

    this.enforceMemoryLimits();
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;

    return this.compressionEnabled ? this.decompress(entry.data) : entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  getStats(): any {
    const hitRate = this.stats.hits + this.stats.misses > 0 ?
      this.stats.hits / (this.stats.hits + this.stats.misses) : 0;

    return {
      size: this.cache.size,
      hit_rate: hitRate,
      total_hits: this.stats.hits,
      total_misses: this.stats.misses,
      total_evictions: this.stats.evictions,
      memory_estimate_mb: this.getMemoryEstimate()
    };
  }

  private compress(data: any): string {
    // Simple compression using JSON stringification
    // In production, could use more advanced compression
    return JSON.stringify(data);
  }

  private decompress(data: string): any {
    return JSON.parse(data);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  private enforceMemoryLimits(): void {
    const currentMemoryMB = this.getMemoryEstimate();

    if (currentMemoryMB > this.maxSizeMB) {
      // Evict least recently used items
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].hits - b[1].hits || a[1].created - b[1].created);

      const toEvict = Math.ceil(entries.length * 0.2); // Evict 20% of items

      for (let i = 0; i < toEvict && this.cache.size > 0; i++) {
        this.cache.delete(entries[i][0]);
        this.stats.evictions++;
      }
    }
  }

  private getMemoryEstimate(): number {
    let totalSize = 0;
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length + JSON.stringify(entry).length;
    }
    return totalSize / (1024 * 1024); // Convert to MB
  }
}

// =============================================================================
// PARALLEL COMPUTATION ENGINE
// =============================================================================

class ParallelComputationEngine {
  private workerPool: any[] = [];
  private maxWorkers: number;
  private queuedTasks: any[] = [];

  constructor(maxWorkers: number = 4) {
    this.maxWorkers = Math.min(maxWorkers, require('os').cpus().length);
    console.log(`🚀 Parallel computation engine initialized with ${this.maxWorkers} workers`);
  }

  async computeParallel<T>(
    tasks: Array<() => Promise<T>>,
    options: { batchSize?: number; timeout?: number } = {}
  ): Promise<T[]> {
    const { batchSize = this.maxWorkers, timeout = 5000 } = options;
    const results: T[] = [];

    // Process tasks in batches
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);

      const batchPromises = batch.map(task =>
        Promise.race([
          task(),
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Task timeout')), timeout)
          )
        ])
      );

      try {
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results[i + index] = result.value;
          } else {
            console.warn(`Task ${i + index} failed:`, result.reason);
            results[i + index] = null as any; // Handle failure gracefully
          }
        });
      } catch (error) {
        console.error('Batch computation failed:', error);
      }
    }

    return results;
  }

  async computeWithPriority<T>(
    tasks: Array<{ fn: () => Promise<T>; priority: 'high' | 'medium' | 'low' }>
  ): Promise<T[]> {
    // Sort by priority
    const sortedTasks = tasks.sort((a, b) => {
      const priorities = { high: 3, medium: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    return this.computeParallel(sortedTasks.map(task => task.fn));
  }
}

// =============================================================================
// OPTIMIZED FEATURE INTEGRATION CLIENT
// =============================================================================

export class OptimizedBlazeFeatureClient extends BlazeFeatureIntegrationClient {
  private monitor: PerformanceMonitor;
  private cache: AdvancedCache;
  private parallelEngine: ParallelComputationEngine;
  private precomputeScheduler: NodeJS.Timeout | null = null;
  private config: OptimizationConfig;

  constructor(config: Partial<OptimizationConfig> = {}) {
    super();

    this.config = {
      max_memory_mb: 128,
      cache_ttl_ms: 300000, // 5 minutes
      parallel_threshold: 3,
      precompute_enabled: true,
      compression_enabled: true,
      worker_threads: 4,
      ...config
    };

    this.monitor = new PerformanceMonitor();
    this.cache = new AdvancedCache({
      compressionEnabled: this.config.compression_enabled,
      maxSizeMB: this.config.max_memory_mb * 0.4 // Use 40% of memory for cache
    });
    this.parallelEngine = new ParallelComputationEngine(this.config.worker_threads);

    this.startPrecomputeScheduler();
    console.log('🔥 Optimized Blaze Feature Client initialized');
  }

  // =============================================================================
  // OPTIMIZED COMPUTATION METHODS
  // =============================================================================

  async computeFeatureBatchOptimized(
    requests: Array<{ feature_name: string; input_data: any; priority?: 'high' | 'medium' | 'low' }>
  ): Promise<{ [key: string]: FeatureResult }> {
    performance.mark('blaze-batch-start');

    // Check cache first
    const results: { [key: string]: FeatureResult } = {};
    const uncachedRequests = [];

    for (const request of requests) {
      const cacheKey = this.generateCacheKey(request.feature_name, request.input_data);
      const cachedResult = this.cache.get(cacheKey);

      if (cachedResult) {
        results[request.feature_name] = cachedResult;
      } else {
        uncachedRequests.push(request);
      }
    }

    console.log(`🎯 Cache performance: ${requests.length - uncachedRequests.length}/${requests.length} hits`);

    // Compute uncached features
    if (uncachedRequests.length > 0) {
      let computedResults;

      if (uncachedRequests.length >= this.config.parallel_threshold) {
        // Use parallel computation for larger batches
        const tasks = uncachedRequests.map(request => ({
          fn: async () => {
            const result = await this.computeSingleFeatureOptimized(request.feature_name, request.input_data);
            return { name: request.feature_name, result };
          },
          priority: request.priority || 'medium'
        }));

        const parallelResults = await this.parallelEngine.computeWithPriority(tasks);

        computedResults = parallelResults.reduce((acc, item) => {
          if (item && item.name && item.result) {
            acc[item.name] = item.result;
          }
          return acc;
        }, {} as { [key: string]: FeatureResult });
      } else {
        // Sequential computation for smaller batches
        for (const request of uncachedRequests) {
          const result = await this.computeSingleFeatureOptimized(request.feature_name, request.input_data);
          computedResults = { ...computedResults, [request.feature_name]: result };
        }
      }

      // Cache and merge results
      Object.entries(computedResults).forEach(([featureName, result]) => {
        const request = uncachedRequests.find(r => r.feature_name === featureName);
        if (request) {
          const cacheKey = this.generateCacheKey(featureName, request.input_data);
          this.cache.set(cacheKey, result, this.config.cache_ttl_ms);
          results[featureName] = result;
        }
      });
    }

    performance.mark('blaze-batch-end');
    performance.measure('blaze-feature-batch', 'blaze-batch-start', 'blaze-batch-end');

    return results;
  }

  private async computeSingleFeatureOptimized(featureName: string, inputData: any): Promise<FeatureResult> {
    const startMark = `blaze-feature-${featureName}-start`;
    const endMark = `blaze-feature-${featureName}-end`;

    performance.mark(startMark);

    let result: FeatureResult;

    try {
      // Route to appropriate computation method with performance monitoring
      switch (featureName) {
        case 'bullpen_fatigue_index':
          result = await super.computeBullpenFatigueIndex(inputData);
          break;
        case 'cardinals_readiness':
          result = await super.computeCardinalsReadiness();
          break;
        case 'qb_pressure_sack_rate':
          result = await super.computeQBPressureSackRate(inputData);
          break;
        case 'grizzlies_grit_index':
          result = await super.computeGrizzliesGritIndex();
          break;
        case 'character_assessment':
          result = await super.computeCharacterAssessment(inputData);
          break;
        case 'nil_valuation':
          result = await super.computeNILValuation(inputData);
          break;
        default:
          throw new Error(`Unsupported feature: ${featureName}`);
      }

      // Enhance result with optimization metrics
      result.computation_time_ms = performance.now() - performance.timeOrigin;

    } catch (error) {
      console.error(`Error computing optimized feature ${featureName}:`, error);
      result = {
        value: 0,
        confidence: 0,
        computation_time_ms: performance.now() - performance.timeOrigin,
        data_quality: 0,
        source: 'error',
        timestamp: new Date().toISOString()
      };
    }

    performance.mark(endMark);
    performance.measure(`blaze-feature-${featureName}`, startMark, endMark);

    return result;
  }

  // =============================================================================
  // PRECOMPUTATION & SCHEDULING
  // =============================================================================

  private startPrecomputeScheduler(): void {
    if (!this.config.precompute_enabled) return;

    // Precompute frequently used features every 5 minutes
    this.precomputeScheduler = setInterval(() => {
      this.precomputePopularFeatures();
    }, 5 * 60 * 1000);

    console.log('📅 Precompute scheduler started (5-minute intervals)');
  }

  private async precomputePopularFeatures(): Promise<void> {
    try {
      const popularFeatures = [
        { feature_name: 'cardinals_readiness', input_data: {} },
        { feature_name: 'grizzlies_grit_index', input_data: {} }
      ];

      console.log('🔄 Precomputing popular features...');
      await this.computeFeatureBatchOptimized(popularFeatures);

      const cacheStats = this.cache.getStats();
      console.log(`✅ Precomputation complete. Cache: ${cacheStats.size} entries, ${cacheStats.hit_rate.toFixed(2)} hit rate`);
    } catch (error) {
      console.warn('Precomputation failed:', error);
    }
  }

  // =============================================================================
  // REAL-TIME DASHBOARD OPTIMIZATION
  // =============================================================================

  async getDashboardFeaturesOptimized(
    teamFocus?: 'cardinals' | 'titans' | 'grizzlies' | 'longhorns'
  ): Promise<any> {
    const cacheKey = `dashboard_${teamFocus || 'general'}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      console.log('🎯 Dashboard served from cache');
      return cached;
    }

    // Build feature requests based on team focus
    const requests = [];

    // Team-specific high-priority features
    switch (teamFocus) {
      case 'cardinals':
        requests.push(
          { feature_name: 'bullpen_fatigue_index', input_data: { team_id: 'STL', pitcher_data: [] }, priority: 'high' as const },
          { feature_name: 'cardinals_readiness', input_data: {}, priority: 'high' as const }
        );
        break;
      case 'titans':
        requests.push(
          { feature_name: 'qb_pressure_sack_rate', input_data: { qb_id: 'TEN_QB1', team_id: 'TEN', game_data: [] }, priority: 'high' as const }
        );
        break;
      case 'grizzlies':
        requests.push(
          { feature_name: 'grizzlies_grit_index', input_data: {}, priority: 'high' as const }
        );
        break;
    }

    // Cross-sport features (medium priority)
    requests.push(
      { feature_name: 'character_assessment', input_data: { athlete_id: 'sample', video_analysis_data: {} }, priority: 'medium' as const },
      { feature_name: 'nil_valuation', input_data: { athlete_id: 'sample', sport: 'football', performance_percentile: 85, social_media: { total_followers: 50000, engagement_rate: 4.2 }, market_factors: { school_market_size: 'major', team_success_rating: 0.8 } }, priority: 'low' as const }
    );

    const dashboardData = await this.computeFeatureBatchOptimized(requests);

    // Cache dashboard for 2 minutes (shorter TTL for real-time data)
    this.cache.set(cacheKey, dashboardData, 120000);

    return dashboardData;
  }

  // =============================================================================
  // MONITORING & DIAGNOSTICS
  // =============================================================================

  getPerformanceDiagnostics(): any {
    const monitorSummary = this.monitor.getPerformanceSummary();
    const cacheStats = this.cache.getStats();

    return {
      performance: monitorSummary,
      cache: cacheStats,
      memory_usage_mb: this.monitor.getCurrentMemoryUsage(),
      optimization_config: this.config,
      recommendations: this.generateOptimizationRecommendations(monitorSummary, cacheStats)
    };
  }

  private generateOptimizationRecommendations(perfSummary: any, cacheStats: any): string[] {
    const recommendations = [];

    if (perfSummary.avg_computation_time > 75) {
      recommendations.push('Consider enabling more parallel workers');
    }

    if (cacheStats.hit_rate < 0.7) {
      recommendations.push('Increase cache TTL or precompute more features');
    }

    if (perfSummary.avg_memory_usage > this.config.max_memory_mb * 0.8) {
      recommendations.push('Reduce cache size or enable compression');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal');
    }

    return recommendations;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private generateCacheKey(featureName: string, inputData: any): string {
    // Create a stable cache key from feature name and input data
    const dataHash = JSON.stringify(inputData);
    return `${featureName}_${Buffer.from(dataHash).toString('base64').slice(0, 20)}`;
  }

  cleanup(): void {
    this.monitor.cleanup();
    this.cache.clear();

    if (this.precomputeScheduler) {
      clearInterval(this.precomputeScheduler);
    }

    console.log('🧹 Optimized feature client cleanup complete');
  }
}

// =============================================================================
// FACTORY & CONFIGURATION
// =============================================================================

export function createOptimizedBlazeClient(environment: 'development' | 'production' = 'production') {
  const config: Partial<OptimizationConfig> = environment === 'production'
    ? {
        max_memory_mb: 128,
        cache_ttl_ms: 300000, // 5 minutes
        parallel_threshold: 2,
        precompute_enabled: true,
        compression_enabled: true,
        worker_threads: 4
      }
    : {
        max_memory_mb: 64,
        cache_ttl_ms: 120000, // 2 minutes
        parallel_threshold: 3,
        precompute_enabled: false,
        compression_enabled: false,
        worker_threads: 2
      };

  return new OptimizedBlazeFeatureClient(config);
}

export { PerformanceMonitor, AdvancedCache, ParallelComputationEngine };