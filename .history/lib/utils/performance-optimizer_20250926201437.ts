/**
 * Blaze Sports Intelligence - Performance Optimizer
 * Championship Intelligence Platform - Performance Optimization System
 * The Deep South's Sports Intelligence Hub
 */

import { PerformanceMetrics } from '../../types/sports.types';

// Performance optimization configuration
interface PerformanceConfig {
  targetFPS: number;
  maxMemoryUsage: number; // MB
  maxFrameTime: number; // ms
  enableAdaptiveQuality: boolean;
  enableMemoryManagement: boolean;
  enableFrameRateControl: boolean;
  enableResourcePooling: boolean;
  debugMode: boolean;
}

// Performance thresholds
interface PerformanceThresholds {
  fps: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
  memory: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  frameTime: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
}

// Optimization strategies
interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  category: 'rendering' | 'memory' | 'network' | 'computation';
  impact: 'low' | 'medium' | 'high';
  cost: 'low' | 'medium' | 'high';
  enabled: boolean;
  parameters: Record<string, any>;
}

// Performance monitoring data
interface PerformanceData {
  timestamp: number;
  fps: number;
  frameTime: number;
  memoryUsage: number;
  renderTime: number;
  updateTime: number;
  drawCalls: number;
  triangleCount: number;
  textureMemory: number;
  shaderSwitches: number;
}

// Default configuration
const DEFAULT_CONFIG: PerformanceConfig = {
  targetFPS: 60,
  maxMemoryUsage: 500,
  maxFrameTime: 16.67,
  enableAdaptiveQuality: true,
  enableMemoryManagement: true,
  enableFrameRateControl: true,
  enableResourcePooling: true,
  debugMode: false
};

// Default thresholds
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  fps: {
    excellent: 58,
    good: 50,
    acceptable: 30,
    poor: 20
  },
  memory: {
    low: 100,
    medium: 250,
    high: 400,
    critical: 500
  },
  frameTime: {
    excellent: 16.67,
    good: 20,
    acceptable: 33.33,
    poor: 50
  }
};

// Default optimization strategies
const DEFAULT_STRATEGIES: OptimizationStrategy[] = [
  {
    id: 'reduce_shadow_quality',
    name: 'Reduce Shadow Quality',
    description: 'Lower shadow map resolution to improve performance',
    category: 'rendering',
    impact: 'medium',
    cost: 'low',
    enabled: true,
    parameters: { shadowMapSize: 1024 }
  },
  {
    id: 'enable_frustum_culling',
    name: 'Enable Frustum Culling',
    description: 'Skip rendering objects outside the camera view',
    category: 'rendering',
    impact: 'high',
    cost: 'low',
    enabled: true,
    parameters: { enabled: true }
  },
  {
    id: 'reduce_particle_count',
    name: 'Reduce Particle Count',
    description: 'Lower the number of particles in effects',
    category: 'rendering',
    impact: 'medium',
    cost: 'low',
    enabled: true,
    parameters: { reductionFactor: 0.5 }
  },
  {
    id: 'enable_texture_compression',
    name: 'Enable Texture Compression',
    description: 'Compress textures to reduce memory usage',
    category: 'memory',
    impact: 'high',
    cost: 'low',
    enabled: true,
    parameters: { compressionRatio: 0.8 }
  },
  {
    id: 'implement_lod_system',
    name: 'Implement LOD System',
    description: 'Use different detail levels based on distance',
    category: 'rendering',
    impact: 'high',
    cost: 'medium',
    enabled: true,
    parameters: { levels: 3, distances: [50, 100, 200] }
  },
  {
    id: 'enable_instanced_rendering',
    name: 'Enable Instanced Rendering',
    description: 'Render multiple instances of the same object efficiently',
    category: 'rendering',
    impact: 'high',
    cost: 'medium',
    enabled: true,
    parameters: { maxInstances: 1000 }
  },
  {
    id: 'optimize_shaders',
    name: 'Optimize Shaders',
    description: 'Simplify shader calculations for better performance',
    category: 'rendering',
    impact: 'medium',
    cost: 'high',
    enabled: false,
    parameters: { simplificationLevel: 1 }
  },
  {
    id: 'enable_occlusion_culling',
    name: 'Enable Occlusion Culling',
    description: 'Skip rendering objects hidden behind others',
    category: 'rendering',
    impact: 'high',
    cost: 'high',
    enabled: false,
    parameters: { enabled: true }
  }
];

/**
 * Performance Optimizer Class
 * Handles performance monitoring, optimization, and adaptive quality management
 */
export class PerformanceOptimizer {
  private config: PerformanceConfig;
  private thresholds: PerformanceThresholds;
  private strategies: Map<string, OptimizationStrategy>;
  private performanceHistory: PerformanceData[];
  private isOptimizing: boolean = false;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private lastOptimizationTime: number = 0;
  private optimizationCooldown: number = 5000; // 5 seconds
  
  // Performance monitoring
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private fpsHistory: number[] = [];
  private memoryHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  
  // Event system
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();
  
  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.thresholds = DEFAULT_THRESHOLDS;
    this.strategies = new Map();
    this.performanceHistory = [];
    
    // Initialize strategies
    DEFAULT_STRATEGIES.forEach(strategy => {
      this.strategies.set(strategy.id, strategy);
    });
    
    this.initializePerformanceMonitoring();
  }
  
  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    // Monitor memory usage
    if (typeof window !== 'undefined' && 'memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          this.updateMemoryUsage(memory.usedJSHeapSize / 1024 / 1024); // Convert to MB
        }
      }, 1000);
    }
    
    // Start optimization loop
    if (this.config.enableAdaptiveQuality) {
      this.startOptimizationLoop();
    }
  }
  
  /**
   * Start optimization loop
   */
  private startOptimizationLoop(): void {
    this.optimizationInterval = setInterval(() => {
      this.performOptimization();
    }, 1000); // Check every second
  }
  
  /**
   * Stop optimization loop
   */
  private stopOptimizationLoop(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
  }
  
  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
    const currentTime = performance.now();
    
    // Update frame rate
    if (metrics.fps !== undefined) {
      this.fpsHistory.push(metrics.fps);
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }
    }
    
    // Update frame time
    if (metrics.frameTime !== undefined) {
      this.frameTimeHistory.push(metrics.frameTime);
      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory.shift();
      }
    }
    
    // Update memory usage
    if (metrics.memoryUsage !== undefined) {
      this.memoryHistory.push(metrics.memoryUsage);
      if (this.memoryHistory.length > 60) {
        this.memoryHistory.shift();
      }
    }
    
    // Store performance data
    const performanceData: PerformanceData = {
      timestamp: currentTime,
      fps: metrics.fps || 0,
      frameTime: metrics.frameTime || 0,
      memoryUsage: metrics.memoryUsage || 0,
      renderTime: metrics.renderTime || 0,
      updateTime: metrics.updateTime || 0,
      drawCalls: metrics.drawCalls || 0,
      triangleCount: metrics.triangleCount || 0,
      textureMemory: metrics.textureMemory || 0,
      shaderSwitches: metrics.shaderSwitches || 0
    };
    
    this.performanceHistory.push(performanceData);
    if (this.performanceHistory.length > 300) { // Keep 5 minutes of data
      this.performanceHistory.shift();
    }
    
    // Emit performance update event
    this.emit('performanceUpdate', performanceData);
  }
  
  /**
   * Update memory usage
   */
  private updateMemoryUsage(memoryUsage: number): void {
    this.memoryHistory.push(memoryUsage);
    if (this.memoryHistory.length > 60) {
      this.memoryHistory.shift();
    }
    
    // Check for memory pressure
    if (memoryUsage > this.thresholds.memory.critical) {
      this.emit('memoryPressure', { level: 'critical', usage: memoryUsage });
      this.triggerMemoryOptimization();
    } else if (memoryUsage > this.thresholds.memory.high) {
      this.emit('memoryPressure', { level: 'high', usage: memoryUsage });
    }
  }
  
  /**
   * Perform optimization
   */
  private performOptimization(): void {
    if (this.isOptimizing) return;
    
    const currentTime = performance.now();
    if (currentTime - this.lastOptimizationTime < this.optimizationCooldown) {
      return;
    }
    
    this.isOptimizing = true;
    
    try {
      // Analyze current performance
      const performanceAnalysis = this.analyzePerformance();
      
      // Determine if optimization is needed
      if (this.needsOptimization(performanceAnalysis)) {
        this.applyOptimizations(performanceAnalysis);
        this.lastOptimizationTime = currentTime;
      }
      
      // Emit optimization event
      this.emit('optimizationPerformed', {
        analysis: performanceAnalysis,
        timestamp: currentTime
      });
      
    } catch (error) {
      console.error('Optimization failed:', error);
      this.emit('optimizationError', { error });
    } finally {
      this.isOptimizing = false;
    }
  }
  
  /**
   * Analyze current performance
   */
  private analyzePerformance(): {
    fps: { current: number; average: number; trend: 'improving' | 'declining' | 'stable' };
    memory: { current: number; average: number; trend: 'increasing' | 'decreasing' | 'stable' };
    frameTime: { current: number; average: number; trend: 'improving' | 'declining' | 'stable' };
    overall: 'excellent' | 'good' | 'acceptable' | 'poor';
  } {
    const currentFPS = this.fpsHistory[this.fpsHistory.length - 1] || 0;
    const averageFPS = this.fpsHistory.length > 0 
      ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length 
      : 0;
    
    const currentMemory = this.memoryHistory[this.memoryHistory.length - 1] || 0;
    const averageMemory = this.memoryHistory.length > 0 
      ? this.memoryHistory.reduce((sum, mem) => sum + mem, 0) / this.memoryHistory.length 
      : 0;
    
    const currentFrameTime = this.frameTimeHistory[this.frameTimeHistory.length - 1] || 0;
    const averageFrameTime = this.frameTimeHistory.length > 0 
      ? this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length 
      : 0;
    
    // Determine trends
    const fpsTrend = this.calculateTrend(this.fpsHistory);
    const memoryTrend = this.calculateTrend(this.memoryHistory, true); // Inverted for memory
    const frameTimeTrend = this.calculateTrend(this.frameTimeHistory, true); // Inverted for frame time
    
    // Determine overall performance
    let overall: 'excellent' | 'good' | 'acceptable' | 'poor' = 'excellent';
    
    if (currentFPS < this.thresholds.fps.poor || 
        currentMemory > this.thresholds.memory.critical || 
        currentFrameTime > this.thresholds.frameTime.poor) {
      overall = 'poor';
    } else if (currentFPS < this.thresholds.fps.acceptable || 
               currentMemory > this.thresholds.memory.high || 
               currentFrameTime > this.thresholds.frameTime.acceptable) {
      overall = 'acceptable';
    } else if (currentFPS < this.thresholds.fps.good || 
               currentMemory > this.thresholds.memory.medium || 
               currentFrameTime > this.thresholds.frameTime.good) {
      overall = 'good';
    }
    
    return {
      fps: { current: currentFPS, average: averageFPS, trend: fpsTrend },
      memory: { current: currentMemory, average: averageMemory, trend: memoryTrend },
      frameTime: { current: currentFrameTime, average: averageFrameTime, trend: frameTimeTrend },
      overall
    };
  }
  
  /**
   * Calculate trend from history
   */
  private calculateTrend(history: number[], inverted: boolean = false): 'improving' | 'declining' | 'stable' {
    if (history.length < 10) return 'stable';
    
    const recent = history.slice(-10);
    const older = history.slice(-20, -10);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    const threshold = 0.1; // 10% change threshold
    
    if (inverted) {
      if (difference > threshold) return 'improving';
      if (difference < -threshold) return 'declining';
    } else {
      if (difference > threshold) return 'improving';
      if (difference < -threshold) return 'declining';
    }
    
    return 'stable';
  }
  
  /**
   * Check if optimization is needed
   */
  private needsOptimization(analysis: ReturnType<typeof this.analyzePerformance>): boolean {
    // Check if performance is poor
    if (analysis.overall === 'poor') {
      return true;
    }
    
    // Check if performance is declining
    if (analysis.fps.trend === 'declining' || analysis.frameTime.trend === 'declining') {
      return true;
    }
    
    // Check if memory usage is high and increasing
    if (analysis.memory.current > this.thresholds.memory.high && 
        analysis.memory.trend === 'increasing') {
      return true;
    }
    
    // Check if FPS is below target
    if (analysis.fps.current < this.config.targetFPS * 0.8) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Apply optimizations based on analysis
   */
  private applyOptimizations(analysis: ReturnType<typeof this.analyzePerformance>): void {
    const optimizations: string[] = [];
    
    // Apply FPS optimizations
    if (analysis.fps.current < this.thresholds.fps.acceptable) {
      optimizations.push(...this.getFPSOptimizations());
    }
    
    // Apply memory optimizations
    if (analysis.memory.current > this.thresholds.memory.high) {
      optimizations.push(...this.getMemoryOptimizations());
    }
    
    // Apply frame time optimizations
    if (analysis.frameTime.current > this.thresholds.frameTime.acceptable) {
      optimizations.push(...this.getFrameTimeOptimizations());
    }
    
    // Apply optimizations
    optimizations.forEach(optimizationId => {
      this.applyOptimization(optimizationId);
    });
    
    if (optimizations.length > 0) {
      this.emit('optimizationsApplied', { optimizations });
    }
  }
  
  /**
   * Get FPS optimizations
   */
  private getFPSOptimizations(): string[] {
    const optimizations: string[] = [];
    
    // High impact, low cost optimizations first
    if (this.strategies.get('enable_frustum_culling')?.enabled) {
      optimizations.push('enable_frustum_culling');
    }
    
    if (this.strategies.get('reduce_particle_count')?.enabled) {
      optimizations.push('reduce_particle_count');
    }
    
    if (this.strategies.get('reduce_shadow_quality')?.enabled) {
      optimizations.push('reduce_shadow_quality');
    }
    
    // Medium impact optimizations
    if (this.strategies.get('implement_lod_system')?.enabled) {
      optimizations.push('implement_lod_system');
    }
    
    if (this.strategies.get('enable_instanced_rendering')?.enabled) {
      optimizations.push('enable_instanced_rendering');
    }
    
    return optimizations;
  }
  
  /**
   * Get memory optimizations
   */
  private getMemoryOptimizations(): string[] {
    const optimizations: string[] = [];
    
    if (this.strategies.get('enable_texture_compression')?.enabled) {
      optimizations.push('enable_texture_compression');
    }
    
    if (this.strategies.get('implement_lod_system')?.enabled) {
      optimizations.push('implement_lod_system');
    }
    
    return optimizations;
  }
  
  /**
   * Get frame time optimizations
   */
  private getFrameTimeOptimizations(): string[] {
    const optimizations: string[] = [];
    
    if (this.strategies.get('enable_frustum_culling')?.enabled) {
      optimizations.push('enable_frustum_culling');
    }
    
    if (this.strategies.get('optimize_shaders')?.enabled) {
      optimizations.push('optimize_shaders');
    }
    
    if (this.strategies.get('enable_occlusion_culling')?.enabled) {
      optimizations.push('enable_occlusion_culling');
    }
    
    return optimizations;
  }
  
  /**
   * Apply specific optimization
   */
  private applyOptimization(optimizationId: string): void {
    const strategy = this.strategies.get(optimizationId);
    if (!strategy) return;
    
    // Emit optimization event
    this.emit('optimizationApplied', { 
      id: optimizationId, 
      strategy, 
      timestamp: performance.now() 
    });
    
    if (this.config.debugMode) {
      console.log(`Applied optimization: ${strategy.name}`);
    }
  }
  
  /**
   * Trigger memory optimization
   */
  private triggerMemoryOptimization(): void {
    // Force garbage collection if available
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }
    
    // Clear performance history if it's too large
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-50);
    }
    
    // Clear history arrays
    if (this.fpsHistory.length > 30) {
      this.fpsHistory = this.fpsHistory.slice(-15);
    }
    
    if (this.memoryHistory.length > 30) {
      this.memoryHistory = this.memoryHistory.slice(-15);
    }
    
    if (this.frameTimeHistory.length > 30) {
      this.frameTimeHistory = this.frameTimeHistory.slice(-15);
    }
    
    this.emit('memoryOptimization', { timestamp: performance.now() });
  }
  
  /**
   * Enable performance mode
   */
  enablePerformanceMode(): void {
    this.config.enableAdaptiveQuality = true;
    this.config.enableMemoryManagement = true;
    this.config.enableFrameRateControl = true;
    
    if (!this.optimizationInterval) {
      this.startOptimizationLoop();
    }
    
    this.emit('performanceModeEnabled', { timestamp: performance.now() });
  }
  
  /**
   * Disable performance mode
   */
  disablePerformanceMode(): void {
    this.config.enableAdaptiveQuality = false;
    this.config.enableMemoryManagement = false;
    this.config.enableFrameRateControl = false;
    
    this.stopOptimizationLoop();
    
    this.emit('performanceModeDisabled', { timestamp: performance.now() });
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStatistics(): {
    current: PerformanceData | null;
    average: {
      fps: number;
      memory: number;
      frameTime: number;
    };
    trends: {
      fps: 'improving' | 'declining' | 'stable';
      memory: 'increasing' | 'decreasing' | 'stable';
      frameTime: 'improving' | 'declining' | 'stable';
    };
    history: PerformanceData[];
  } {
    const current = this.performanceHistory[this.performanceHistory.length - 1] || null;
    
    const average = {
      fps: this.fpsHistory.length > 0 
        ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length 
        : 0,
      memory: this.memoryHistory.length > 0 
        ? this.memoryHistory.reduce((sum, mem) => sum + mem, 0) / this.memoryHistory.length 
        : 0,
      frameTime: this.frameTimeHistory.length > 0 
        ? this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length 
        : 0
    };
    
    const trends = {
      fps: this.calculateTrend(this.fpsHistory),
      memory: this.calculateTrend(this.memoryHistory, true) as 'stable' | 'increasing' | 'decreasing',
      frameTime: this.calculateTrend(this.frameTimeHistory, true)
    };
    
    return {
      current,
      average,
      trends,
      history: [...this.performanceHistory]
    };
  }
  
  /**
   * Get optimization strategies
   */
  getOptimizationStrategies(): OptimizationStrategy[] {
    return Array.from(this.strategies.values());
  }
  
  /**
   * Update optimization strategy
   */
  updateOptimizationStrategy(id: string, updates: Partial<OptimizationStrategy>): void {
    const strategy = this.strategies.get(id);
    if (strategy) {
      this.strategies.set(id, { ...strategy, ...updates });
      this.emit('strategyUpdated', { id, strategy: this.strategies.get(id) });
    }
  }
  
  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): Array<{
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    impact: string;
    cost: string;
  }> {
    const analysis = this.analyzePerformance();
    const recommendations: Array<{
      id: string;
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
      impact: string;
      cost: string;
    }> = [];
    
    // FPS recommendations
    if (analysis.fps.current < this.thresholds.fps.acceptable) {
      recommendations.push({
        id: 'improve_fps',
        title: 'Improve Frame Rate',
        description: 'Current FPS is below acceptable threshold. Consider reducing visual quality or enabling performance optimizations.',
        priority: 'high',
        impact: 'High',
        cost: 'Low'
      });
    }
    
    // Memory recommendations
    if (analysis.memory.current > this.thresholds.memory.high) {
      recommendations.push({
        id: 'reduce_memory',
        title: 'Reduce Memory Usage',
        description: 'Memory usage is high. Consider enabling texture compression or reducing asset quality.',
        priority: 'high',
        impact: 'High',
        cost: 'Low'
      });
    }
    
    // Frame time recommendations
    if (analysis.frameTime.current > this.thresholds.frameTime.acceptable) {
      recommendations.push({
        id: 'improve_frame_time',
        title: 'Improve Frame Time',
        description: 'Frame time is above acceptable threshold. Consider enabling culling or reducing scene complexity.',
        priority: 'medium',
        impact: 'Medium',
        cost: 'Medium'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Event system
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }
  
  off(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopOptimizationLoop();
    this.eventListeners.clear();
    this.performanceHistory = [];
    this.fpsHistory = [];
    this.memoryHistory = [];
    this.frameTimeHistory = [];
  }
}

// Create global performance optimizer instance
let globalPerformanceOptimizer: PerformanceOptimizer | null = null;

/**
 * Get or create global performance optimizer
 */
export function getPerformanceOptimizer(config?: Partial<PerformanceConfig>): PerformanceOptimizer {
  if (!globalPerformanceOptimizer) {
    globalPerformanceOptimizer = new PerformanceOptimizer(config);
  }
  return globalPerformanceOptimizer;
}

/**
 * Performance optimization hook for React components
 */
export function usePerformanceOptimizer(config?: Partial<PerformanceConfig>) {
  const optimizer = getPerformanceOptimizer(config);
  
  return {
    updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => {
      optimizer.updatePerformanceMetrics(metrics);
    },
    getPerformanceStatistics: () => optimizer.getPerformanceStatistics(),
    getPerformanceRecommendations: () => optimizer.getPerformanceRecommendations(),
    enablePerformanceMode: () => optimizer.enablePerformanceMode(),
    disablePerformanceMode: () => optimizer.disablePerformanceMode(),
    getOptimizationStrategies: () => optimizer.getOptimizationStrategies(),
    updateOptimizationStrategy: (id: string, updates: Partial<OptimizationStrategy>) => {
      optimizer.updateOptimizationStrategy(id, updates);
    }
  };
}
