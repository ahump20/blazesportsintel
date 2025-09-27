/**
 * Blaze Sports Intelligence - Core Type Definitions
 * Championship Intelligence Platform - Type System
 * The Deep South's Sports Intelligence Hub
 */

// Core Sports Data Types
export const SPORTS_DATA_TYPES = {
  mlb: {
    name: 'Baseball',
    icon: '⚾',
    code: 'MLB',
    season: 'April - October',
    teams: 30,
    divisions: ['AL East', 'AL Central', 'AL West', 'NL East', 'NL Central', 'NL West'],
    championship: 'World Series',
    features: ['bullpen_fatigue', 'readiness_index', 'tto_penalty', 'defensive_positioning']
  },
  nfl: {
    name: 'Football',
    icon: '🏈',
    code: 'NFL',
    season: 'September - February',
    teams: 32,
    divisions: ['AFC East', 'AFC North', 'AFC South', 'AFC West', 'NFC East', 'NFC North', 'NFC South', 'NFC West'],
    championship: 'Super Bowl',
    features: ['qb_pressure_rate', 'hidden_yardage', 'defensive_metrics', 'injury_risk']
  },
  nba: {
    name: 'Basketball',
    icon: '🏀',
    code: 'NBA',
    season: 'October - June',
    teams: 30,
    divisions: ['Atlantic', 'Central', 'Southeast', 'Northwest', 'Pacific', 'Southwest'],
    championship: 'NBA Finals',
    features: ['shooting_efficiency', 'grit_index', 'advanced_stats', 'pace_analysis']
  },
  ncaa: {
    name: 'College',
    icon: '🏃',
    code: 'NCAA',
    season: 'Year Round',
    teams: 350,
    divisions: ['Division I', 'Division II', 'Division III'],
    championship: 'March Madness',
    features: ['nil_valuation', 'character_assessment', 'recruiting_intelligence', 'academic_performance']
  }
} as const;

export type SportType = keyof typeof SPORTS_DATA_TYPES;

// Vision AI Modes
export const VISION_AI_MODES = {
  inactive: 'Inactive',
  pose_detection: 'Pose Detection',
  form_analysis: 'Form Analysis', 
  character_read: 'Character Read',
  biomechanical_analysis: 'Biomechanical Analysis',
  injury_prevention: 'Injury Prevention',
  performance_tracking: 'Performance Tracking'
} as const;

export type VisionAIMode = keyof typeof VISION_AI_MODES;

// Performance Metrics
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  renderTime: number;
  updateTime: number;
  cacheHitRate?: number;
  networkLatency?: number;
  apiResponseTime?: number;
}

// Analytics Models
export const ANALYTICS_MODELS = [
  'game_prediction',
  'player_performance',
  'injury_risk',
  'team_chemistry',
  'championship_probability',
  'market_value',
  'character_assessment',
  'recruiting_intelligence',
  'performance_optimization',
  'strategic_advantage'
] as const;

export type AnalyticsModel = typeof ANALYTICS_MODELS[number];

// Base Sports Data Interfaces
export interface BaseTeam {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  logo: string;
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
  };
  division: string;
  conference: string;
  founded: number;
  stadium: string;
  capacity: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface BasePlayer {
  id: string;
  name: string;
  position: string;
  number: number;
  team: string;
  age: number;
  height: string;
  weight: number;
  experience: number;
  college?: string;
  salary?: number;
  contract?: {
    years: number;
    value: number;
    guaranteed: number;
  };
}

export interface BaseGame {
  id: string;
  sport: SportType;
  homeTeam: BaseTeam;
  awayTeam: BaseTeam;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled';
  startTime: Date;
  venue: string;
  weather?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    conditions: string;
  };
  officials?: string[];
  attendance?: number;
}

// Sport-Specific Interfaces
export interface MLBPlayer extends BasePlayer {
  battingStats: {
    avg: number;
    obp: number;
    slg: number;
    ops: number;
    homeRuns: number;
    rbi: number;
    stolenBases: number;
    strikeouts: number;
    walks: number;
  };
  pitchingStats?: {
    era: number;
    whip: number;
    strikeouts: number;
    walks: number;
    wins: number;
    losses: number;
    saves: number;
    innings: number;
  };
  fieldingStats: {
    fielding: number;
    errors: number;
    assists: number;
    putouts: number;
    range: number;
  };
  advancedStats: {
    war: number;
    woba: number;
    babip: number;
    fip?: number;
    xfip?: number;
    hardHitRate: number;
    exitVelocity: number;
  };
}

export interface NFLPlayer extends BasePlayer {
  passingStats?: {
    completions: number;
    attempts: number;
    yards: number;
    touchdowns: number;
    interceptions: number;
    rating: number;
    qbr: number;
  };
  rushingStats?: {
    attempts: number;
    yards: number;
    touchdowns: number;
    fumbles: number;
    yardsPerCarry: number;
  };
  receivingStats?: {
    receptions: number;
    targets: number;
    yards: number;
    touchdowns: number;
    drops: number;
    catchRate: number;
  };
  defensiveStats?: {
    tackles: number;
    assistedTackles: number;
    sacks: number;
    interceptions: number;
    passDeflections: number;
    forcedFumbles: number;
  };
  advancedStats: {
    pff: number;
    pressureRate?: number;
    targetShare?: number;
    airYards?: number;
    yac?: number;
  };
}

export interface NBAPlayer extends BasePlayer {
  stats: {
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    fieldGoalPct: number;
    threePointPct: number;
    freeThrowPct: number;
    turnovers: number;
    fouls: number;
  };
  advancedStats: {
    per: number;
    ts: number;
    usg: number;
    bpm: number;
    vorp: number;
    ws: number;
    pie: number;
  };
  shootingStats: {
    efg: number;
    threePAr: number;
    ftr: number;
    trueShootingAttempts: number;
  };
}

export interface NCAAPlayer extends BasePlayer {
  academic: {
    gpa: number;
    major: string;
    year: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate';
    eligibility: number;
  };
  recruiting: {
    starRating: number;
    nationalRank?: number;
    positionRank?: number;
    stateRank?: number;
    offers: string[];
    commitment: Date;
  };
  nilValue?: {
    estimatedValue: number;
    deals: Array<{
      company: string;
      value: number;
      duration: string;
      type: 'endorsement' | 'appearance' | 'social_media' | 'merchandise';
    }>;
  };
}

// Advanced Analytics Interfaces
export interface PredictionModel {
  id: string;
  name: string;
  type: AnalyticsModel;
  version: string;
  accuracy: number;
  lastTrained: Date;
  features: string[];
  hyperparameters: Record<string, any>;
  metadata: {
    trainingSize: number;
    validationSize: number;
    testSize: number;
    crossValidationScore: number;
    featureImportance: Array<{
      feature: string;
      importance: number;
    }>;
  };
}

export interface GamePrediction {
  gameId: string;
  sport: SportType;
  predictions: {
    winner: {
      team: string;
      probability: number;
      confidence: number;
    };
    score: {
      home: number;
      away: number;
      margin: number;
    };
    keyFactors: Array<{
      factor: string;
      impact: number;
      description: string;
    }>;
    alternativeOutcomes: Array<{
      scenario: string;
      probability: number;
      description: string;
    }>;
  };
  modelUsed: string;
  generatedAt: Date;
  accuracy?: number;
}

export interface PlayerPrediction {
  playerId: string;
  sport: SportType;
  predictions: {
    performance: Record<string, number>;
    injuryRisk: {
      probability: number;
      riskFactors: string[];
      timeframe: string;
    };
    marketValue: {
      current: number;
      projected: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    };
    careerTrajectory: {
      peakAge: number;
      declineRate: number;
      longevity: number;
    };
  };
  modelUsed: string;
  generatedAt: Date;
}

// Vision AI Interfaces
export interface PoseMetrics {
  hipRotation: number;
  shoulderTilt: number;
  weightTransfer: number;
  formScore: number;
  confidence: number;
  biomechanicalEfficiency: number;
  injuryRisk: number;
  performanceIndex: number;
  keyPoints: Array<{
    name: string;
    x: number;
    y: number;
    z: number;
    confidence: number;
  }>;
  angles: Record<string, number>;
  velocities: Record<string, number>;
  accelerations: Record<string, number>;
}

export interface BiomechanicalAnalysis {
  playerId?: string;
  sport: SportType;
  activity: string;
  timestamp: Date;
  metrics: PoseMetrics;
  recommendations: Array<{
    category: 'technique' | 'conditioning' | 'injury_prevention';
    priority: 'high' | 'medium' | 'low';
    description: string;
    exercises?: string[];
  }>;
  comparisonToIdeal: {
    overallScore: number;
    deviations: Array<{
      metric: string;
      deviation: number;
      impact: string;
    }>;
  };
}

export interface CharacterAssessment {
  playerId: string;
  sport: SportType;
  assessment: {
    mentalToughness: number;
    leadership: number;
    competitiveness: number;
    coachability: number;
    teamwork: number;
    pressureHandling: number;
    resilience: number;
    workEthic: number;
  };
  microExpressions: Array<{
    emotion: string;
    intensity: number;
    context: string;
    timestamp: Date;
  }>;
  behavioralIndicators: Array<{
    indicator: string;
    frequency: number;
    significance: number;
  }>;
  overallScore: number;
  confidence: number;
  generatedAt: Date;
}

// Real-time Data Interfaces
export interface RealTimeUpdate {
  id: string;
  type: 'score' | 'stat' | 'event' | 'injury' | 'substitution' | 'penalty';
  sport: SportType;
  gameId?: string;
  playerId?: string;
  teamId?: string;
  timestamp: Date;
  data: Record<string, any>;
  source: string;
  reliability: number;
}

export interface LiveGameData {
  gameId: string;
  sport: SportType;
  status: 'pre' | 'live' | 'final' | 'delayed' | 'postponed';
  clock: {
    period: string;
    timeRemaining: string;
    isRunning: boolean;
  };
  score: {
    home: number;
    away: number;
  };
  stats: Record<string, any>;
  events: RealTimeUpdate[];
  lastUpdated: Date;
}

// Championship Intelligence Interfaces
export interface ChampionshipIntelligence {
  readinessIndex: number;
  fatigueLevel: number;
  performanceTrend: 'improving' | 'declining' | 'stable' | 'volatile';
  championshipProbability: number;
  strategicAdvantage: number;
  keyStrengths: string[];
  keyWeaknesses: string[];
  criticalFactors: Array<{
    factor: string;
    impact: number;
    controllable: boolean;
  }>;
  recommendations: Array<{
    category: 'roster' | 'strategy' | 'conditioning' | 'mental';
    priority: number;
    description: string;
    timeline: string;
  }>;
}

export interface DeepSouthAuthority {
  regionId: string;
  name: string;
  states: string[];
  primarySports: SportType[];
  culturalFactors: {
    footballCulture: number;
    baseballTradition: number;
    basketballGrowth: number;
    collegeSportsImportance: number;
  };
  recruitingPipeline: {
    talentDensity: number;
    retentionRate: number;
    outOfStateAttraction: number;
  };
  economicImpact: {
    totalRevenue: number;
    jobsCreated: number;
    touristAttraction: number;
  };
}

// 3D Graphics and Visualization Interfaces
export interface Stadium3D {
  id: string;
  name: string;
  sport: SportType;
  capacity: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  features: {
    hasRoof: boolean;
    surfaceType: 'grass' | 'turf' | 'court';
    lighting: string;
    videoBoard: boolean;
  };
  model: {
    geometry: THREE.BufferGeometry;
    materials: THREE.Material[];
    textures: THREE.Texture[];
    animations?: THREE.AnimationClip[];
  };
  cameraPaths: Array<{
    name: string;
    positions: THREE.Vector3[];
    duration: number;
  }>;
}

export interface HeatMapData {
  sport: SportType;
  metric: string;
  data: Array<{
    x: number;
    y: number;
    value: number;
    intensity: number;
    category?: string;
  }>;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  colorScale: {
    min: string;
    max: string;
    steps: number;
  };
}

export interface ParticleSystemConfig {
  count: number;
  spread: number;
  speed: number;
  size: number;
  opacity: number;
  colors: string[];
  behavior: 'static' | 'floating' | 'orbiting' | 'data_driven';
  dataSource?: any[];
}

// API Response Interfaces
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: Date;
    requestId: string;
    processingTime: number;
    source: string;
    version: string;
  };
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'data' | 'error' | 'ping' | 'pong';
  channel?: string;
  data?: any;
  timestamp: Date;
  id: string;
}

// Cache Configuration
export interface CacheConfig {
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'fifo' | 'ttl' | 'smart';
  compression: boolean;
  encryption: boolean;
  replication: boolean;
}

// Error Handling
export interface BlazeError extends Error {
  code: string;
  category: 'api' | 'graphics' | 'ml' | 'vision' | 'data' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  timestamp: Date;
  stackTrace: string;
  userMessage: string;
  technicalMessage: string;
}

// Configuration Interfaces
export interface BlazeConfig {
  environment: 'development' | 'staging' | 'production';
  features: {
    visionAI: boolean;
    graphics3D: boolean;
    realTimeUpdates: boolean;
    mlPredictions: boolean;
    advancedAnalytics: boolean;
  };
  performance: {
    targetFPS: number;
    maxMemoryUsage: number;
    apiTimeout: number;
    cacheStrategy: string;
  };
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
    rateLimit: number;
  };
  graphics: {
    renderer: 'webgl' | 'webgl2' | 'webgpu';
    quality: 'low' | 'medium' | 'high' | 'ultra';
    shadows: boolean;
    postProcessing: boolean;
  };
  ml: {
    models: AnalyticsModel[];
    updateFrequency: number;
    batchSize: number;
    accuracy: number;
  };
}
