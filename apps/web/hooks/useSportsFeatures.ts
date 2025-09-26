/**
 * =============================================================================
 * BLAZE SPORTS INTELLIGENCE - REACT HOOKS FOR SPORTS FEATURES
 * =============================================================================
 * React hooks for real-time sports feature integration
 * Optimized for blazesportsintel.com dashboard and Vision AI
 * Performance target: <100ms feature updates
 * =============================================================================
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { OptimizedBlazeFeatureClient, createOptimizedBlazeClient } from '../lib/sports-features/performance-optimizer';
import { FeatureResult } from '../lib/sports-features/feature-integration';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface TeamFeaturesState {
  cardinals: {
    bullpen_fatigue: FeatureResult | null;
    readiness_index: FeatureResult | null;
    tto_penalty: FeatureResult | null;
  };
  titans: {
    qb_pressure_rate: FeatureResult | null;
    hidden_yardage: FeatureResult | null;
    readiness_index: FeatureResult | null;
  };
  grizzlies: {
    shooting_efficiency: FeatureResult | null;
    grit_index: FeatureResult | null;
    defensive_rating: FeatureResult | null;
  };
  longhorns: {
    nil_valuation: FeatureResult | null;
    character_assessment: FeatureResult | null;
  };
}

interface FeatureHookOptions {
  updateInterval?: number;
  enableRealTime?: boolean;
  cacheStrategy?: 'aggressive' | 'moderate' | 'minimal';
  priority?: 'high' | 'medium' | 'low';
}

interface DashboardMetrics {
  total_features: number;
  avg_computation_time: number;
  cache_hit_rate: number;
  performance_grade: string;
  last_updated: string;
}

// =============================================================================
// MAIN SPORTS FEATURES HOOK
// =============================================================================

export function useSportsFeatures(options: FeatureHookOptions = {}) {
  const {
    updateInterval = 30000, // 30 seconds
    enableRealTime = true,
    cacheStrategy = 'moderate',
    priority = 'medium'
  } = options;

  const [features, setFeatures] = useState<TeamFeaturesState>({
    cardinals: {
      bullpen_fatigue: null,
      readiness_index: null,
      tto_penalty: null
    },
    titans: {
      qb_pressure_rate: null,
      hidden_yardage: null,
      readiness_index: null
    },
    grizzlies: {
      shooting_efficiency: null,
      grit_index: null,
      defensive_rating: null
    },
    longhorns: {
      nil_valuation: null,
      character_assessment: null
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_features: 0,
    avg_computation_time: 0,
    cache_hit_rate: 0,
    performance_grade: 'A+',
    last_updated: new Date().toISOString()
  });

  const clientRef = useRef<OptimizedBlazeFeatureClient | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize client
  useEffect(() => {
    clientRef.current = createOptimizedBlazeClient('production');
    return () => {
      if (clientRef.current) {
        clientRef.current.cleanup();
      }
    };
  }, []);

  // Feature computation function
  const computeAllFeatures = useCallback(async () => {
    if (!clientRef.current) return;

    try {
      setError(null);
      const startTime = performance.now();

      // Compute features for all teams in parallel
      const [cardinalsData, titansData, grizzliesData, longhornData] = await Promise.all([
        clientRef.current.getDashboardFeaturesOptimized('cardinals'),
        clientRef.current.getDashboardFeaturesOptimized('titans'),
        clientRef.current.getDashboardFeaturesOptimized('grizzlies'),
        clientRef.current.getDashboardFeaturesOptimized('longhorns')
      ]);

      const totalTime = performance.now() - startTime;

      // Update features state
      setFeatures({
        cardinals: {
          bullpen_fatigue: cardinalsData.bullpen_fatigue_index || null,
          readiness_index: cardinalsData.cardinals_readiness || null,
          tto_penalty: cardinalsData.tto_penalty || null
        },
        titans: {
          qb_pressure_rate: titansData.qb_pressure_sack_rate || null,
          hidden_yardage: titansData.hidden_yardage || null,
          readiness_index: titansData.titans_readiness || null
        },
        grizzlies: {
          shooting_efficiency: grizzliesData.shooting_efficiency || null,
          grit_index: grizzliesData.grizzlies_grit_index || null,
          defensive_rating: grizzliesData.defensive_rating || null
        },
        longhorns: {
          nil_valuation: longhornData.nil_valuation || null,
          character_assessment: longhornData.character_assessment || null
        }
      });

      // Update metrics
      const diagnostics = clientRef.current.getPerformanceDiagnostics();
      setMetrics({
        total_features: Object.keys({...cardinalsData, ...titansData, ...grizzliesData, ...longhornData}).length,
        avg_computation_time: Math.round(totalTime),
        cache_hit_rate: diagnostics.cache.hit_rate,
        performance_grade: diagnostics.performance.performance_grade,
        last_updated: new Date().toISOString()
      });

      setLoading(false);

      console.log(`🔥 Sports features updated in ${totalTime.toFixed(2)}ms`);

    } catch (err) {
      console.error('Error computing sports features:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, []);

  // Set up real-time updates
  useEffect(() => {
    if (enableRealTime) {
      // Initial computation
      computeAllFeatures();

      // Set up interval for updates
      intervalRef.current = setInterval(computeAllFeatures, updateInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [enableRealTime, updateInterval, computeAllFeatures]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setLoading(true);
    return computeAllFeatures();
  }, [computeAllFeatures]);

  return {
    features,
    loading,
    error,
    metrics,
    refresh,
    isConnected: !!clientRef.current
  };
}

// =============================================================================
// TEAM-SPECIFIC HOOKS
// =============================================================================

export function useCardinalsFeatures(options: FeatureHookOptions = {}) {
  const [features, setFeatures] = useState({
    bullpen_fatigue: null as FeatureResult | null,
    readiness_index: null as FeatureResult | null,
    tto_penalty: null as FeatureResult | null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<OptimizedBlazeFeatureClient | null>(null);

  useEffect(() => {
    clientRef.current = createOptimizedBlazeClient('production');
    return () => clientRef.current?.cleanup();
  }, []);

  const updateFeatures = useCallback(async () => {
    if (!clientRef.current) return;

    try {
      setError(null);
      const data = await clientRef.current.getDashboardFeaturesOptimized('cardinals');

      setFeatures({
        bullpen_fatigue: data.bullpen_fatigue_index || null,
        readiness_index: data.cardinals_readiness || null,
        tto_penalty: data.tto_penalty || null
      });

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cardinals features error');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    updateFeatures();
    const interval = setInterval(updateFeatures, options.updateInterval || 30000);
    return () => clearInterval(interval);
  }, [updateFeatures, options.updateInterval]);

  return { features, loading, error, refresh: updateFeatures };
}

export function useTitansFeatures(options: FeatureHookOptions = {}) {
  const [features, setFeatures] = useState({
    qb_pressure_rate: null as FeatureResult | null,
    hidden_yardage: null as FeatureResult | null,
    readiness_index: null as FeatureResult | null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<OptimizedBlazeFeatureClient | null>(null);

  useEffect(() => {
    clientRef.current = createOptimizedBlazeClient('production');
    return () => clientRef.current?.cleanup();
  }, []);

  const updateFeatures = useCallback(async () => {
    if (!clientRef.current) return;

    try {
      setError(null);
      const data = await clientRef.current.getDashboardFeaturesOptimized('titans');

      setFeatures({
        qb_pressure_rate: data.qb_pressure_sack_rate || null,
        hidden_yardage: data.hidden_yardage || null,
        readiness_index: data.titans_readiness || null
      });

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Titans features error');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    updateFeatures();
    const interval = setInterval(updateFeatures, options.updateInterval || 30000);
    return () => clearInterval(interval);
  }, [updateFeatures, options.updateInterval]);

  return { features, loading, error, refresh: updateFeatures };
}

export function useGrizzliesFeatures(options: FeatureHookOptions = {}) {
  const [features, setFeatures] = useState({
    shooting_efficiency: null as FeatureResult | null,
    grit_index: null as FeatureResult | null,
    defensive_rating: null as FeatureResult | null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<OptimizedBlazeFeatureClient | null>(null);

  useEffect(() => {
    clientRef.current = createOptimizedBlazeClient('production');
    return () => clientRef.current?.cleanup();
  }, []);

  const updateFeatures = useCallback(async () => {
    if (!clientRef.current) return;

    try {
      setError(null);
      const data = await clientRef.current.getDashboardFeaturesOptimized('grizzlies');

      setFeatures({
        shooting_efficiency: data.shooting_efficiency || null,
        grit_index: data.grizzlies_grit_index || null,
        defensive_rating: data.defensive_rating || null
      });

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grizzlies features error');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    updateFeatures();
    const interval = setInterval(updateFeatures, options.updateInterval || 30000);
    return () => clearInterval(interval);
  }, [updateFeatures, options.updateInterval]);

  return { features, loading, error, refresh: updateFeatures };
}

// =============================================================================
// CHARACTER ASSESSMENT & VISION AI HOOK
// =============================================================================

export function useCharacterAssessment() {
  const [assessment, setAssessment] = useState<FeatureResult | null>(null);
  const [visionActive, setVisionActive] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<OptimizedBlazeFeatureClient | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    clientRef.current = createOptimizedBlazeClient('production');
    return () => clientRef.current?.cleanup();
  }, []);

  const startVisionAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });

      setVideoStream(stream);
      setVisionActive(true);

      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start character assessment processing
      await processCharacterAssessment();

      setLoading(false);
    } catch (err) {
      console.error('Error starting vision analysis:', err);
      setError(err instanceof Error ? err.message : 'Vision analysis failed');
      setLoading(false);
    }
  }, []);

  const stopVisionAnalysis = useCallback(() => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setVisionActive(false);
    setAssessment(null);
  }, [videoStream]);

  const processCharacterAssessment = useCallback(async () => {
    if (!clientRef.current || !visionActive) return;

    try {
      // Simulate vision AI processing
      // In production, this would integrate with MediaPipe and TensorFlow.js
      const mockVisionData = {
        athlete_id: 'vision_analysis_user',
        video_analysis_data: {
          micro_expressions: {
            confidence: 0.75 + Math.random() * 0.2,
            determination: 0.65 + Math.random() * 0.25,
            focus: 0.70 + Math.random() * 0.25
          },
          body_language_score: 0.8 + Math.random() * 0.15,
          pressure_situation: Math.random() > 0.7,
          game_context: Math.random() > 0.5 ? 'clutch' : 'regular' as const
        }
      };

      const result = await clientRef.current.computeCharacterAssessment(mockVisionData);
      setAssessment(result);

      // Continue processing if vision is still active
      if (visionActive) {
        setTimeout(processCharacterAssessment, 2000); // Update every 2 seconds
      }
    } catch (err) {
      console.error('Character assessment processing error:', err);
    }
  }, [visionActive]);

  return {
    assessment,
    visionActive,
    loading,
    error,
    videoRef,
    startVisionAnalysis,
    stopVisionAnalysis
  };
}

// =============================================================================
// NIL VALUATION HOOK
// =============================================================================

export function useNILValuation() {
  const [valuation, setValuation] = useState<FeatureResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<OptimizedBlazeFeatureClient | null>(null);

  useEffect(() => {
    clientRef.current = createOptimizedBlazeClient('production');
    return () => clientRef.current?.cleanup();
  }, []);

  const calculateNILValue = useCallback(async (params: {
    sport: 'football' | 'basketball' | 'baseball' | 'other';
    performance_percentile: number;
    social_media_followers: number;
    engagement_rate: number;
    school_market_size: 'small' | 'medium' | 'large' | 'major';
    team_success_rating: number;
  }) => {
    if (!clientRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const result = await clientRef.current.computeNILValuation({
        athlete_id: `nil_calc_${Date.now()}`,
        sport: params.sport,
        performance_percentile: params.performance_percentile,
        social_media: {
          total_followers: params.social_media_followers,
          engagement_rate: params.engagement_rate
        },
        market_factors: {
          school_market_size: params.school_market_size,
          team_success_rating: params.team_success_rating
        }
      });

      setValuation(result);
      setLoading(false);

      return result;
    } catch (err) {
      console.error('NIL valuation error:', err);
      setError(err instanceof Error ? err.message : 'NIL calculation failed');
      setLoading(false);
      return null;
    }
  }, []);

  return {
    valuation,
    loading,
    error,
    calculateNILValue
  };
}

// =============================================================================
// PERFORMANCE MONITORING HOOK
// =============================================================================

export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState({
    avg_computation_time: 0,
    cache_hit_rate: 0,
    memory_usage: 0,
    performance_grade: 'A+',
    active_features: 0,
    last_updated: new Date().toISOString()
  });

  const [diagnostics, setDiagnostics] = useState<any>(null);
  const clientRef = useRef<OptimizedBlazeFeatureClient | null>(null);

  useEffect(() => {
    clientRef.current = createOptimizedBlazeClient('production');
    return () => clientRef.current?.cleanup();
  }, []);

  const updateMetrics = useCallback(() => {
    if (!clientRef.current) return;

    try {
      const diagnostics = clientRef.current.getPerformanceDiagnostics();

      setMetrics({
        avg_computation_time: Math.round(diagnostics.performance.avg_computation_time || 0),
        cache_hit_rate: Math.round((diagnostics.cache.hit_rate || 0) * 100) / 100,
        memory_usage: Math.round(diagnostics.memory_usage_mb || 0),
        performance_grade: diagnostics.performance.performance_grade || 'A+',
        active_features: diagnostics.cache.size || 0,
        last_updated: new Date().toISOString()
      });

      setDiagnostics(diagnostics);
    } catch (err) {
      console.error('Error updating performance metrics:', err);
    }
  }, []);

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [updateMetrics]);

  return { metrics, diagnostics, refresh: updateMetrics };
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

export function useFeatureStatus() {
  const { features, loading, error, metrics } = useSportsFeatures();

  const status = useMemo(() => {
    if (loading) return 'loading';
    if (error) return 'error';
    if (metrics.performance_grade === 'A+' || metrics.performance_grade === 'A') return 'optimal';
    if (metrics.performance_grade === 'B+' || metrics.performance_grade === 'B') return 'good';
    return 'degraded';
  }, [loading, error, metrics.performance_grade]);

  const isHealthy = useMemo(() => {
    return status === 'optimal' || status === 'good';
  }, [status]);

  return { status, isHealthy, metrics };
}

export function useRealTimeUpdates(callback: () => void, interval: number = 30000) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(callback, interval);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [callback, interval]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (!intervalRef.current) {
      intervalRef.current = setInterval(callback, interval);
    }
  }, [callback, interval]);

  return { stop, start };
}