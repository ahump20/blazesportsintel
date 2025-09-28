/**
 * Blaze Sports Intelligence - Advanced Analytics Type Definitions
 * Championship Intelligence Platform - Analytics System
 * The Deep South's Sports Intelligence Hub
 */

import { SportType, AnalyticsModel, BasePlayer, BaseTeam, BaseGame } from './sports.types';

// Championship Intelligence Core Types
export interface ChampionshipIntelligence {
  // Core Championship Metrics
  readinessIndex: number; // 0-1 scale
  fatigueLevel: number; // 0-1 scale
  performanceTrend: 'improving' | 'declining' | 'stable' | 'volatile';
  championshipProbability: number; // 0-1 scale
  strategicAdvantage: number; // 0-1 scale
  
  // Situational Awareness
  currentForm: {
    wins: number;
    losses: number;
    streak: number;
    momentum: number;
    consistency: number;
  };
  
  // Injury and Health Status
  healthIndex: {
    overall: number;
    keyPlayers: Array<{
      playerId: string;
      healthStatus: number;
      injuryRisk: number;
      availabilityProbability: number;
    }>;
    depthChart: {
      position: string;
      depth: number;
      quality: number;
    }[];
  };
  
  // Mental and Character Assessment
  teamChemistry: {
    cohesion: number;
    leadership: number;
    resilience: number;
    pressure_handling: number;
    clutch_performance: number;
  };
  
  // Tactical Analysis
  strategicProfile: {
    offensiveEfficiency: number;
    defensiveEfficiency: number;
    specialSituations: number;
    adaptability: number;
    coaching: number;
  };
  
  // Key Factors for Championship Success
  keyStrengths: Array<{
    category: string;
    description: string;
    impact: number;
    sustainability: number;
  }>;
  
  keyWeaknesses: Array<{
    category: string;
    description: string;
    severity: number;
    correctability: number;
  }>;
  
  criticalFactors: Array<{
    factor: string;
    impact: number;
    controllable: boolean;
    timeline: string;
    mitigation?: string;
  }>;
  
  // Actionable Recommendations
  recommendations: Array<{
    category: 'roster' | 'strategy' | 'conditioning' | 'mental' | 'tactical';
    priority: number;
    description: string;
    timeline: string;
    expectedImpact: number;
    cost: number;
    feasibility: number;
  }>;
  
  // Championship Path Analysis
  pathToChampionship: {
    remainingGames: number;
    mustWin: number;
    keyMatchups: Array<{
      opponent: string;
      date: Date;
      importance: number;
      winProbability: number;
    }>;
    scenarioAnalysis: Array<{
      scenario: string;
      probability: number;
      requirements: string[];
    }>;
  };
  
  // Historical Context
  historicalContext: {
    similarSeasons: Array<{
      year: number;
      similarity: number;
      outcome: string;
      lessons: string[];
    }>;
    championshipPrecedents: {
      underdogStories: Array<{
        team: string;
        year: number;
        odds: number;
        keyFactors: string[];
      }>;
    };
  };
  
  // Real-time Updates
  lastUpdated: Date;
  confidence: number;
  dataQuality: number;
}

// Deep South Authority - Regional Sports Intelligence
export interface DeepSouthAuthority {
  regionId: string;
  name: string;
  states: string[];
  primarySports: SportType[];
  
  // Cultural and Social Factors
  culturalFactors: {
    footballCulture: number; // How deeply embedded football is
    baseballTradition: number; // Historical baseball importance
    basketballGrowth: number; // Growing basketball influence
    collegeSportsImportance: number; // NCAA sports significance
    fridayNightLights: number; // High school football culture
    sundayFootball: number; // NFL engagement
    summerBaseball: number; // Baseball summer culture
  };
  
  // Talent Pipeline and Development
  recruitingPipeline: {
    talentDensity: number; // Athletes per capita
    retentionRate: number; // Keeping local talent
    outOfStateAttraction: number; // Drawing talent from other regions
    developmentPrograms: Array<{
      level: 'youth' | 'high_school' | 'college' | 'semi_pro';
      quality: number;
      reach: number;
      success_rate: number;
    }>;
    pipelines: Array<{
      sport: SportType;
      feederPrograms: string[];
      successRate: number;
      notableAlumni: string[];
    }>;
  };
  
  // Economic and Market Analysis
  economicImpact: {
    totalRevenue: number;
    jobsCreated: number;
    touristAttraction: number;
    mediaValue: number;
    merchandiseRevenue: number;
    facilityInvestment: number;
    scholarshipValue: number;
  };
  
  // Fan Engagement and Demographics
  fanEngagement: {
    attendanceRates: Record<SportType, number>;
    tvViewership: Record<SportType, number>;
    socialMediaFollowing: Record<SportType, number>;
    merchandiseSales: Record<SportType, number>;
    seasonTicketHolders: Record<SportType, number>;
  };
  
  // Competitive Landscape
  competitiveAnalysis: {
    rivalries: Array<{
      teams: string[];
      intensity: number;
      historicalRecord: string;
      economicImpact: number;
    }>;
    dominantPrograms: Array<{
      sport: SportType;
      program: string;
      successMetrics: Record<string, number>;
    }>;
    emergingThreats: Array<{
      program: string;
      sport: SportType;
      growthRate: number;
      threatlevel: number;
    }>;
  };
  
  // Infrastructure and Facilities
  infrastructure: {
    stadiums: Array<{
      name: string;
      capacity: number;
      sport: SportType;
      quality: number;
      age: number;
      renovationNeeds: string[];
    }>;
    trainingFacilities: Array<{
      type: string;
      quality: number;
      accessibility: number;
      utilization: number;
    }>;
    broadcastInfrastructure: {
      quality: number;
      reach: number;
      modernization: number;
    };
  };
}

// Elite Analytics - Advanced Performance Metrics
export interface EliteAnalytics {
  // Performance Optimization
  performanceOptimization: {
    currentLevel: number;
    potentialLevel: number;
    gaps: Array<{
      area: string;
      currentScore: number;
      targetScore: number;
      improvementPlan: string;
    }>;
    trainingRecommendations: Array<{
      focus: string;
      intensity: number;
      duration: string;
      expectedGain: number;
    }>;
  };
  
  // Advanced Statistical Models
  statisticalModels: {
    pythagoreanExpectation: number;
    strengthOfSchedule: number;
    pointDifferential: number;
    clutchPerformance: number;
    homeFieldAdvantage: number;
    momentumIndex: number;
    consistencyRating: number;
  };
  
  // Injury Risk and Health Analytics
  injuryAnalytics: {
    teamRiskScore: number;
    individualRisks: Array<{
      playerId: string;
      riskLevel: number;
      riskFactors: string[];
      preventionMeasures: string[];
      recoverTime: number;
    }>;
    historicalPatterns: Array<{
      injuryType: string;
      frequency: number;
      riskPeriods: string[];
      prevention: string[];
    }>;
    loadManagement: {
      currentLoad: number;
      optimalLoad: number;
      fatigue: number;
      recommendations: string[];
    };
  };
  
  // Market Value and Contract Analytics
  marketAnalytics: {
    teamValue: number;
    playerValues: Array<{
      playerId: string;
      currentValue: number;
      projectedValue: number;
      contractEfficiency: number;
      marketPosition: string;
    }>;
    salaryCapAnalysis: {
      currentUtilization: number;
      efficiency: number;
      flexibility: number;
      futureProjections: Array<{
        year: number;
        projectedCap: number;
        commitments: number;
        flexibility: number;
      }>;
    };
  };
  
  // Opponent Analysis and Scouting
  opponentAnalytics: {
    upcomingOpponents: Array<{
      teamId: string;
      strengths: string[];
      weaknesses: string[];
      keyPlayers: string[];
      strategicApproach: string;
      winProbability: number;
    }>;
    scoutingReports: Array<{
      playerId: string;
      position: string;
      tendencies: string[];
      exploitableWeaknesses: string[];
      neutralizationStrategies: string[];
    }>;
    gameplan: {
      offensiveStrategy: string[];
      defensiveStrategy: string[];
      specialSituations: string[];
      keyMatchups: string[];
    };
  };
  
  // Fan and Media Analytics
  fanAnalytics: {
    sentiment: number;
    engagement: number;
    loyalty: number;
    satisfaction: number;
    growthPotential: number;
    demographics: {
      ageDistribution: Record<string, number>;
      geographicDistribution: Record<string, number>;
      spendingPower: number;
      mediaConsumption: Record<string, number>;
    };
  };
}

// Championship Metallics - Success Tier Classifications
export interface ChampionshipMetallics {
  // Tier Classification System
  currentTier: 'Championship Gold' | 'Playoff Silver' | 'Competitive Bronze' | 'Development Iron';
  
  // Tier Metrics and Requirements
  tierMetrics: {
    championshipGold: {
      winPercentage: number; // >0.750
      strengthOfSchedule: number; // Top 25%
      injuryManagement: number; // Top 10%
      clutchPerformance: number; // Top 15%
      teamChemistry: number; // Top 10%
      coachingEfficiency: number; // Top 20%
    };
    playoffSilver: {
      winPercentage: number; // 0.600-0.749
      consistency: number; // Above average
      keyPlayerHealth: number; // >85%
      homeFieldAdvantage: number; // Strong
      momentumIndex: number; // Positive
    };
    competitiveBronze: {
      winPercentage: number; // 0.500-0.599
      improvement: number; // Season-over-season growth
      youngTalent: number; // Emerging players
      infrastructure: number; // Solid foundation
      fanSupport: number; // Growing
    };
    developmentIron: {
      winPercentage: number; // <0.500
      potential: number; // Future outlook
      assetAccumulation: number; // Building blocks
      cultureBuilding: number; // Foundation setting
      patientCapital: number; // Long-term view
    };
  };
  
  // Advancement Pathways
  advancementPath: {
    currentPosition: string;
    nextTier: string;
    requirements: Array<{
      category: string;
      currentLevel: number;
      requiredLevel: number;
      timeframe: string;
      probability: number;
    }>;
    accelerators: Array<{
      action: string;
      impact: number;
      feasibility: number;
      cost: number;
    }>;
    barriers: Array<{
      obstacle: string;
      severity: number;
      mitigation: string;
      timeline: string;
    }>;
  };
  
  // Historical Achievement Context
  historicalContext: {
    previousTiers: Array<{
      year: number;
      tier: string;
      achievements: string[];
      lessons: string[];
    }>;
    peerComparison: Array<{
      organization: string;
      currentTier: string;
      trajectory: string;
      differentiators: string[];
    }>;
    benchmarking: {
      bestInClass: Array<{
        category: string;
        leader: string;
        benchmark: number;
        gap: number;
      }>;
    };
  };
  
  // Success Probability Matrix
  successProbability: {
    shortTerm: Array<{
      timeframe: string;
      scenario: string;
      probability: number;
      requirements: string[];
    }>;
    mediumTerm: Array<{
      timeframe: string;
      scenario: string;
      probability: number;
      requirements: string[];
    }>;
    longTerm: Array<{
      timeframe: string;
      scenario: string;
      probability: number;
      requirements: string[];
    }>;
  };
}

// Performance Optimization Framework
export interface PerformanceOptimization {
  // System Performance Metrics
  systemPerformance: {
    renderingOptimization: {
      currentFPS: number;
      targetFPS: number;
      frameTime: number;
      drawCalls: number;
      triangleCount: number;
      textureMemory: number;
      shaderComplexity: number;
    };
    
    dataProcessing: {
      queryResponseTime: number;
      cacheHitRate: number;
      dataFreshness: number;
      processingLatency: number;
      throughput: number;
      errorRate: number;
    };
    
    userExperience: {
      loadTime: number;
      interactionDelay: number;
      visualQuality: number;
      responsiveness: number;
      stability: number;
      accessibility: number;
    };
  };
  
  // Analytics Performance
  analyticsPerformance: {
    modelAccuracy: Record<AnalyticsModel, number>;
    predictionLatency: Record<AnalyticsModel, number>;
    dataQuality: {
      completeness: number;
      accuracy: number;
      timeliness: number;
      consistency: number;
      relevance: number;
    };
    
    realtimeCapabilities: {
      updateFrequency: number;
      lagTime: number;
      dataVolume: number;
      concurrentUsers: number;
      systemLoad: number;
    };
  };
  
  // Optimization Strategies
  optimizationStrategies: {
    rendering: Array<{
      technique: string;
      impact: number;
      implementation: string;
      tradeoffs: string[];
    }>;
    
    data: Array<{
      technique: string;
      impact: number;
      implementation: string;
      tradeoffs: string[];
    }>;
    
    ml: Array<{
      technique: string;
      impact: number;
      implementation: string;
      tradeoffs: string[];
    }>;
    
    infrastructure: Array<{
      technique: string;
      impact: number;
      implementation: string;
      tradeoffs: string[];
    }>;
  };
  
  // Performance Monitoring
  monitoring: {
    alerts: Array<{
      metric: string;
      threshold: number;
      currentValue: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      action: string;
    }>;
    
    trends: Array<{
      metric: string;
      direction: 'improving' | 'degrading' | 'stable';
      rate: number;
      projection: number;
    }>;
    
    benchmarks: Array<{
      metric: string;
      internalBest: number;
      industryBest: number;
      gap: number;
      improvement: string;
    }>;
  };
}

// Machine Learning Model Analytics
export interface MLModelAnalytics {
  modelPerformance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
    confusionMatrix: number[][];
  };
  
  featureImportance: Array<{
    feature: string;
    importance: number;
    correlation: number;
    stability: number;
  }>;
  
  modelDrift: {
    dataDrift: number;
    conceptDrift: number;
    performanceDrift: number;
    lastRetraining: Date;
    nextRetrainingDue: Date;
  };
  
  predictionQuality: {
    confidence: number;
    uncertainty: number;
    reliability: number;
    calibration: number;
  };
  
  businessImpact: {
    decisionAccuracy: number;
    revenueImpact: number;
    costSavings: number;
    riskReduction: number;
  };
}

// Real-time Analytics Pipeline
export interface RealTimeAnalyticsPipeline {
  dataIngestion: {
    sources: Array<{
      name: string;
      type: string;
      frequency: number;
      latency: number;
      reliability: number;
    }>;
    volume: number;
    velocity: number;
    variety: number;
  };
  
  processing: {
    streamProcessing: {
      latency: number;
      throughput: number;
      errorRate: number;
      scalability: number;
    };
    
    batchProcessing: {
      frequency: number;
      duration: number;
      accuracy: number;
      completeness: number;
    };
  };
  
  delivery: {
    realTimeUpdates: {
      frequency: number;
      latency: number;
      reliability: number;
      coverage: number;
    };
    
    notifications: {
      criticalAlerts: number;
      automatedReports: number;
      customDashboards: number;
      mobileUpdates: number;
    };
  };
  
  quality: {
    dataAccuracy: number;
    systemReliability: number;
    userSatisfaction: number;
    businessValue: number;
  };
}

// Export consolidated analytics interface
export interface ComprehensiveAnalytics {
  championshipIntelligence: ChampionshipIntelligence;
  deepSouthAuthority: DeepSouthAuthority;
  eliteAnalytics: EliteAnalytics;
  championshipMetallics: ChampionshipMetallics;
  performanceOptimization: PerformanceOptimization;
  mlModelAnalytics: MLModelAnalytics;
  realTimeAnalytics: RealTimeAnalyticsPipeline;
  
  // Meta information
  generatedAt: Date;
  version: string;
  confidence: number;
  dataQuality: number;
  lastUpdated: Date;
}
