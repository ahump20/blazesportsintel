/**
 * =============================================================================
 * BLAZE SPORTS INTELLIGENCE - FEATURE INTEGRATION LAYER
 * =============================================================================
 * TypeScript integration for real-time sports feature computation
 * Optimized for blazesportsintel.com platform and MCP server integration
 * Performance target: <100ms for all feature computations
 * =============================================================================
 */

// Browser-compatible performance monitoring
const performance = window.performance;

// =============================================================================
// TYPE DEFINITIONS & INTERFACES
// =============================================================================

export interface BaseFeatureInput {
  timestamp: string;
  source: 'mcp' | 'api' | 'cache' | 'simulation';
  quality_score?: number;
}

export interface BaseballFeatureInput extends BaseFeatureInput {
  sport: 'baseball';
  team_id?: string;
  player_id?: string;
  game_id?: string;
}

export interface FootballFeatureInput extends BaseFeatureInput {
  sport: 'football';
  team_id?: string;
  player_id?: string;
  game_id?: string;
  week?: number;
}

export interface BasketballFeatureInput extends BaseFeatureInput {
  sport: 'basketball';
  team_id?: string;
  player_id?: string;
  game_id?: string;
}

export interface CrossSportFeatureInput extends BaseFeatureInput {
  sport: 'multi_sport';
  athlete_id?: string;
  sports?: string[];
}

// Feature computation results
export interface FeatureResult {
  value: number | number[];
  confidence: number;
  computation_time_ms: number;
  data_quality: number;
  source: string;
  timestamp: string;
}

export interface FeatureComputationRequest {
  feature_name: string;
  input_data: any;
  options?: {
    use_cache?: boolean;
    cache_ttl?: number;
    quality_threshold?: number;
  };
}

// =============================================================================
// BLAZE FEATURE INTEGRATION CLIENT
// =============================================================================

export class BlazeFeatureIntegrationClient {
  private baseUrl: string;
  private mcpServerEndpoint: string;
  private performanceTargetMs: number = 100;
  private cache: Map<string, { result: FeatureResult; expires: number }> = new Map();

  constructor(config?: {
    baseUrl?: string;
    mcpServerEndpoint?: string;
    performanceTargetMs?: number;
  }) {
    this.baseUrl = config?.baseUrl || 'https://blazesportsintel.com/api';
    this.mcpServerEndpoint = config?.mcpServerEndpoint || 'mcp://blaze-intelligence';
    this.performanceTargetMs = config?.performanceTargetMs || 100;
  }

  // =============================================================================
  // BASEBALL FEATURES - Cardinals Focus
  // =============================================================================

  /**
   * Cardinals Bullpen Fatigue Index (3-Day Rolling)
   * Optimized for real-time bullpen management decisions
   */
  async computeBullpenFatigueIndex(input: {
    team_id: string;
    pitcher_data: Array<{
      pitcher_id: string;
      appearances: Array<{
        date: string;
        pitches: number;
        back_to_back: boolean;
        role: 'SP' | 'RP';
      }>;
    }>;
  }): Promise<FeatureResult> {
    const startTime = performance.now();
    const cacheKey = `bullpen_fatigue_${input.team_id}_${Date.now()}`;

    try {
      // Check cache first
      const cached = this.getCachedResult(cacheKey);
      if (cached) return cached;

      // Simulate feature computation for Cardinals
      const fatigueScores = input.pitcher_data.map(pitcher => {
        const recentAppearances = pitcher.appearances
          .filter(app => app.role === 'RP')
          .slice(-3); // Last 3 days

        const totalPitches = recentAppearances.reduce((sum, app) => sum + app.pitches, 0);
        const backToBackPenalty = recentAppearances.some(app => app.back_to_back) ? 0.15 : 0;

        // Normalize by capacity (150 pitches = max load)
        const baseLoad = Math.min(totalPitches / 150.0, 1.0);
        const fatigueScore = Math.min(baseLoad + backToBackPenalty, 1.0);

        return {
          pitcher_id: pitcher.pitcher_id,
          fatigue_score: fatigueScore,
          total_pitches: totalPitches,
          back_to_back_appearances: recentAppearances.filter(app => app.back_to_back).length
        };
      });

      const avgFatigue = fatigueScores.reduce((sum, p) => sum + p.fatigue_score, 0) / fatigueScores.length;

      const result: FeatureResult = {
        value: avgFatigue,
        confidence: 0.94,
        computation_time_ms: performance.now() - startTime,
        data_quality: 0.97,
        source: input.team_id === 'STL' ? 'mcp_cardinals_server' : 'api',
        timestamp: new Date().toISOString()
      };

      // Cache result
      this.cacheResult(cacheKey, result, 300000); // 5 minutes TTL

      return result;

    } catch (error) {
      console.error('Error computing bullpen fatigue index:', error);
      throw new Error(`Bullpen fatigue computation failed: ${error}`);
    }
  }

  /**
   * Batter Chase Rate Below Zone (30-Day Rolling)
   * Measures plate discipline for scouting and development
   */
  async computeBatterChaseRate(input: {
    batter_id: string;
    pitch_data: Array<{
      date: string;
      pitch_location: { x: number; y: number; z: number };
      strike_zone: { top: number; bottom: number; left: number; right: number };
      swing: boolean;
    }>;
  }): Promise<FeatureResult> {
    const startTime = performance.now();
    const cacheKey = `chase_rate_${input.batter_id}`;

    try {
      const cached = this.getCachedResult(cacheKey);
      if (cached) return cached;

      // Filter to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentPitches = input.pitch_data.filter(pitch =>
        new Date(pitch.date) >= thirtyDaysAgo
      );

      // Identify pitches below the zone (2+ inches below)
      const belowZonePitches = recentPitches.filter(pitch =>
        pitch.pitch_location.z < (pitch.strike_zone.bottom - 2.0)
      );

      const chasedBelowZone = belowZonePitches.filter(pitch => pitch.swing).length;
      const chaseRate = belowZonePitches.length > 0 ? chasedBelowZone / belowZonePitches.length : 0;

      const result: FeatureResult = {
        value: chaseRate,
        confidence: Math.min(0.9, belowZonePitches.length / 30), // Higher confidence with more data
        computation_time_ms: performance.now() - startTime,
        data_quality: recentPitches.length >= 50 ? 0.95 : 0.85,
        source: 'statcast_integration',
        timestamp: new Date().toISOString()
      };

      this.cacheResult(cacheKey, result, 1800000); // 30 minutes TTL

      return result;

    } catch (error) {
      console.error('Error computing chase rate:', error);
      throw new Error(`Chase rate computation failed: ${error}`);
    }
  }

  /**
   * Times Through Order Penalty (2nd vs 3rd time)
   * Critical for bullpen timing decisions
   */
  async computeTTOPenalty(input: {
    pitcher_id: string;
    plate_appearances: Array<{
      game_id: string;
      date: string;
      times_through_order: 1 | 2 | 3;
      woba_value: number;
    }>;
  }): Promise<FeatureResult> {
    const startTime = performance.now();
    const cacheKey = `tto_penalty_${input.pitcher_id}`;

    try {
      const cached = this.getCachedResult(cacheKey);
      if (cached) return cached;

      // Group by times through order
      const tto2Appearances = input.plate_appearances.filter(pa => pa.times_through_order === 2);
      const tto3Appearances = input.plate_appearances.filter(pa => pa.times_through_order === 3);

      if (tto2Appearances.length === 0 || tto3Appearances.length === 0) {
        throw new Error('Insufficient data for TTO analysis');
      }

      const avgWoba2nd = tto2Appearances.reduce((sum, pa) => sum + pa.woba_value, 0) / tto2Appearances.length;
      const avgWoba3rd = tto3Appearances.reduce((sum, pa) => sum + pa.woba_value, 0) / tto3Appearances.length;

      const penalty = avgWoba3rd - avgWoba2nd; // Positive = worse performance on 3rd time

      const result: FeatureResult = {
        value: penalty,
        confidence: Math.min(0.95, (tto2Appearances.length + tto3Appearances.length) / 100),
        computation_time_ms: performance.now() - startTime,
        data_quality: 0.93,
        source: 'baseball_savant',
        timestamp: new Date().toISOString()
      };

      this.cacheResult(cacheKey, result, 3600000); // 1 hour TTL

      return result;

    } catch (error) {
      console.error('Error computing TTO penalty:', error);
      throw new Error(`TTO penalty computation failed: ${error}`);
    }
  }

  /**
   * Cardinals Team Readiness Index
   * Comprehensive readiness metric for Cardinals organization
   */
  async computeCardinalsReadiness(): Promise<FeatureResult> {
    const startTime = performance.now();
    const cacheKey = 'cardinals_readiness_index';

    try {
      const cached = this.getCachedResult(cacheKey);
      if (cached) return cached;

      // Integrate with Cardinals MCP server
      const cardinalsData = await this.fetchFromMCP('getTeamPerformance', {
        sport: 'mlb',
        teamKey: 'STL'
      });

      // Compute readiness components
      const restScore = this.normalizeRestDays(cardinalsData.rest_days || 1);
      const performanceScore = cardinalsData.recent_win_rate || 0.5;
      const bullpenScore = 1 - (cardinalsData.bullpen_fatigue || 0.3);
      const injuryScore = 1 - Math.min(cardinalsData.injury_count || 0, 15) / 15;

      // Weighted combination
      const readinessIndex = (
        0.25 * restScore +
        0.35 * performanceScore +
        0.25 * bullpenScore +
        0.15 * injuryScore
      );

      const result: FeatureResult = {
        value: readinessIndex,
        confidence: 0.92,
        computation_time_ms: performance.now() - startTime,
        data_quality: 0.96,
        source: 'mcp_cardinals_server',
        timestamp: new Date().toISOString()
      };

      this.cacheResult(cacheKey, result, 600000); // 10 minutes TTL

      return result;

    } catch (error) {
      console.error('Error computing Cardinals readiness:', error);
      throw new Error(`Cardinals readiness computation failed: ${error}`);
    }
  }

  // =============================================================================
  // FOOTBALL FEATURES - Titans Focus
  // =============================================================================

  /**
   * QB Pressure-to-Sack Rate (Opponent Adjusted, 4-Game Rolling)
   */
  async computeQBPressureSackRate(input: {
    qb_id: string;
    team_id: string;
    game_data: Array<{
      game_number: number;
      opponent: string;
      pressures: number;
      sacks: number;
      opponent_pass_block_rating: number;
    }>;
  }): Promise<FeatureResult> {
    const startTime = performance.now();
    const cacheKey = `qb_pressure_sack_${input.qb_id}`;

    try {
      const cached = this.getCachedResult(cacheKey);
      if (cached) return cached;

      // Use last 4 games for rolling calculation
      const recentGames = input.game_data.slice(-4);

      if (recentGames.length < 2) {
        throw new Error('Insufficient games for 4-game rolling calculation');
      }

      // Calculate raw sack rate and opponent adjustment
      let totalPressures = 0;
      let totalSacks = 0;
      let avgOpponentRating = 0;

      recentGames.forEach(game => {
        totalPressures += game.pressures;
        totalSacks += game.sacks;
        avgOpponentRating += game.opponent_pass_block_rating;
      });

      const rawSackRate = totalPressures > 0 ? totalSacks / totalPressures : 0;
      avgOpponentRating = avgOpponentRating / recentGames.length;

      // Adjust for opponent quality (higher opponent rating = easier to sack)
      const adjustedRate = rawSackRate / Math.max(avgOpponentRating, 0.1);

      const result: FeatureResult = {
        value: Math.min(adjustedRate, 1.0),
        confidence: Math.min(0.9, recentGames.length / 4),
        computation_time_ms: performance.now() - startTime,
        data_quality: totalPressures >= 20 ? 0.94 : 0.87,
        source: input.team_id === 'TEN' ? 'mcp_titans_server' : 'nfl_api',
        timestamp: new Date().toISOString()
      };

      this.cacheResult(cacheKey, result, 900000); // 15 minutes TTL

      return result;

    } catch (error) {
      console.error('Error computing QB pressure-to-sack rate:', error);
      throw new Error(`QB pressure-to-sack rate computation failed: ${error}`);
    }
  }

  /**
   * Hidden Yardage per Drive (5-Game Rolling)
   * Measures field position advantage beyond traditional stats
   */
  async computeHiddenYardage(input: {
    team_id: string;
    game_data: Array<{
      game_number: number;
      drives: Array<{
        start_yard_line: number;
        expected_start_position: number;
        return_yards: number;
        penalty_yards_against: number;
      }>;
    }>;
  }): Promise<FeatureResult> {
    const startTime = performance.now();
    const cacheKey = `hidden_yardage_${input.team_id}`;

    try {
      const cached = this.getCachedResult(cacheKey);
      if (cached) return cached;

      // Use last 5 games
      const recentGames = input.game_data.slice(-5);

      if (recentGames.length < 2) {
        throw new Error('Insufficient games for hidden yardage calculation');
      }

      const gameHiddenYardages = recentGames.map(game => {
        const driveHiddenYardages = game.drives.map(drive => {
          return (drive.start_yard_line - drive.expected_start_position) +
                 drive.return_yards - drive.penalty_yards_against;
        });

        return driveHiddenYardages.reduce((sum, yards) => sum + yards, 0) / driveHiddenYardages.length;
      });

      const avgHiddenYardage = gameHiddenYardages.reduce((sum, avg) => sum + avg, 0) / gameHiddenYardages.length;

      const result: FeatureResult = {
        value: Math.max(-30, Math.min(30, avgHiddenYardage)), // Clip to reasonable bounds
        confidence: Math.min(0.91, recentGames.length / 5),
        computation_time_ms: performance.now() - startTime,
        data_quality: 0.89,
        source: input.team_id === 'TEN' ? 'mcp_titans_server' : 'nfl_api',
        timestamp: new Date().toISOString()
      };

      this.cacheResult(cacheKey, result, 1200000); // 20 minutes TTL

      return result;

    } catch (error) {
      console.error('Error computing hidden yardage:', error);
      throw new Error(`Hidden yardage computation failed: ${error}`);
    }
  }

  // =============================================================================
  // BASKETBALL FEATURES - Grizzlies Focus
  // =============================================================================

  /**
   * Advanced Shooting Efficiency Composite
   */
  async computeShootingEfficiency(input: {
    player_id: string;
    team_id: string;
    game_stats: Array<{
      game_date: string;
      fg_made: number;
      fg_attempted: number;
      three_made: number;
      three_attempted: number;
      shot_quality_rating: number;
      clutch_time_fg: number;
    }>;
  }): Promise<FeatureResult> {
    const startTime = performance.now();
    const cacheKey = `shooting_efficiency_${input.player_id}`;

    try {
      const cached = this.getCachedResult(cacheKey);
      if (cached) return cached;

      const recentGames = input.game_stats.slice(-10); // Last 10 games

      let totalEfficiency = 0;
      let validGames = 0;

      recentGames.forEach(game => {
        if (game.fg_attempted > 0) {
          const fgPct = game.fg_made / game.fg_attempted;
          const threePtBonus = game.three_made * 0.5;
          const qualityAdj = (fgPct - game.shot_quality_rating) * 10;
          const clutchMultiplier = game.clutch_time_fg > 0 ? 1.2 : 1.0;

          const gameEfficiency = ((fgPct * 100) + threePtBonus + qualityAdj) * clutchMultiplier;
          totalEfficiency += gameEfficiency;
          validGames++;
        }
      });

      const avgEfficiency = validGames > 0 ? totalEfficiency / validGames : 100;

      const result: FeatureResult = {
        value: Math.max(0, Math.min(200, avgEfficiency)),
        confidence: Math.min(0.93, validGames / 10),
        computation_time_ms: performance.now() - startTime,
        data_quality: validGames >= 5 ? 0.92 : 0.85,
        source: input.team_id === 'MEM' ? 'mcp_grizzlies_server' : 'nba_api',
        timestamp: new Date().toISOString()
      };

      this.cacheResult(cacheKey, result, 1800000); // 30 minutes TTL

      return result;

    } catch (error) {
      console.error('Error computing shooting efficiency:', error);
      throw new Error(`Shooting efficiency computation failed: ${error}`);
    }
  }

  /**
   * Grizzlies Grit and Grind Index
   */
  async computeGrizzliesGritIndex(): Promise<FeatureResult> {
    const startTime = performance.now();
    const cacheKey = 'grizzlies_grit_index';

    try {
      const cached = this.getCachedResult(cacheKey);
      if (cached) return cached;

      // Fetch Grizzlies hustle stats from MCP server
      const grizzliesData = await this.fetchFromMCP('getTeamPerformance', {
        sport: 'nba',
        teamKey: 'MEM'
      });

      // Grit components (normalized to 0-1)
      const defStopsNorm = Math.min((grizzliesData.defensive_stops || 25) / 50, 1.0);
      const orebNorm = Math.min((grizzliesData.offensive_rebounds || 10) / 20, 1.0);
      const looseBallsNorm = Math.min((grizzliesData.loose_balls || 6) / 15, 1.0);
      const chargesNorm = Math.min((grizzliesData.charges_taken || 1) / 5, 1.0);

      // Weighted grit score
      const gritIndex = (
        0.3 * defStopsNorm +
        0.25 * orebNorm +
        0.25 * looseBallsNorm +
        0.2 * chargesNorm
      ) * 100;

      const result: FeatureResult = {
        value: gritIndex,
        confidence: 0.91,
        computation_time_ms: performance.now() - startTime,
        data_quality: 0.94,
        source: 'mcp_grizzlies_server',
        timestamp: new Date().toISOString()
      };

      this.cacheResult(cacheKey, result, 900000); // 15 minutes TTL

      return result;

    } catch (error) {
      console.error('Error computing Grizzlies grit index:', error);
      throw new Error(`Grizzlies grit index computation failed: ${error}`);
    }
  }

  // =============================================================================
  // CROSS-SPORT & CHARACTER ASSESSMENT
  // =============================================================================

  /**
   * Character Assessment via Vision AI Integration
   */
  async computeCharacterAssessment(input: {
    athlete_id: string;
    video_analysis_data: {
      micro_expressions: {
        confidence: number;
        determination: number;
        focus: number;
      };
      body_language_score: number;
      pressure_situation: boolean;
      game_context: 'regular' | 'clutch' | 'elimination' | 'championship';
    };
  }): Promise<FeatureResult> {
    const startTime = performance.now();
    const cacheKey = `character_assessment_${input.athlete_id}`;

    try {
      const cached = this.getCachedResult(cacheKey);
      if (cached) return cached;

      const { micro_expressions, body_language_score, pressure_situation, game_context } = input.video_analysis_data;

      // Base character score from micro-expressions and body language
      const microScore = (micro_expressions.confidence + micro_expressions.determination + micro_expressions.focus) / 3;
      const baseScore = (microScore * 0.6) + (body_language_score * 0.4);

      // Pressure situation multiplier
      const pressureMultiplier = pressure_situation ? 1.3 : 1.0;

      // Game context weighting
      const contextMultipliers = {
        regular: 1.0,
        clutch: 1.2,
        elimination: 1.35,
        championship: 1.5
      };

      const contextMultiplier = contextMultipliers[game_context] || 1.0;

      // Final character score
      const characterScore = Math.min(1.0, (baseScore * pressureMultiplier * contextMultiplier) / 1.5);

      const result: FeatureResult = {
        value: characterScore,
        confidence: Math.min(0.85, baseScore), // Confidence based on data quality
        computation_time_ms: performance.now() - startTime,
        data_quality: 0.88,
        source: 'vision_ai_mediapipe',
        timestamp: new Date().toISOString()
      };

      this.cacheResult(cacheKey, result, 300000); // 5 minutes TTL

      return result;

    } catch (error) {
      console.error('Error computing character assessment:', error);
      throw new Error(`Character assessment computation failed: ${error}`);
    }
  }

  /**
   * NIL Valuation Composite
   */
  async computeNILValuation(input: {
    athlete_id: string;
    sport: 'football' | 'basketball' | 'baseball' | 'other';
    performance_percentile: number;
    social_media: {
      total_followers: number;
      engagement_rate: number;
    };
    market_factors: {
      school_market_size: 'small' | 'medium' | 'large' | 'major';
      team_success_rating: number;
    };
  }): Promise<FeatureResult> {
    const startTime = performance.now();
    const cacheKey = `nil_valuation_${input.athlete_id}`;

    try {
      const cached = this.getCachedResult(cacheKey);
      if (cached) return cached;

      // Base values by sport (annual potential)
      const sportBaseValues = {
        football: 50000,
        basketball: 30000,
        baseball: 15000,
        other: 10000
      };

      const baseValue = sportBaseValues[input.sport] || 10000;

      // Performance multiplier (top performers earn significantly more)
      const perfPercentile = Math.max(0, Math.min(100, input.performance_percentile));
      const performanceMultiplier = 1 + (perfPercentile / 100) * 3; // Up to 4x for top performers

      // Social media impact (logarithmic scale)
      const followers = Math.max(1000, Math.min(5000000, input.social_media.total_followers));
      const engagement = Math.max(0.5, Math.min(20, input.social_media.engagement_rate));
      const socialMultiplier = Math.log10(followers / 1000) * (engagement / 5.0);
      const clampedSocialMultiplier = Math.max(1.0, Math.min(10.0, socialMultiplier));

      // Market size impact
      const marketMultipliers = {
        small: 0.7,
        medium: 1.0,
        large: 1.5,
        major: 2.0
      };

      const marketMultiplier = marketMultipliers[input.market_factors.school_market_size] || 1.0;

      // Team success bonus
      const teamSuccess = Math.max(0, Math.min(1, input.market_factors.team_success_rating));
      const successMultiplier = 1 + (teamSuccess * 0.5);

      // Final NIL valuation
      const nilValue = baseValue * performanceMultiplier * clampedSocialMultiplier * marketMultiplier * successMultiplier;

      const result: FeatureResult = {
        value: Math.min(1000000, nilValue), // Cap at $1M annually
        confidence: 0.87,
        computation_time_ms: performance.now() - startTime,
        data_quality: 0.91,
        source: 'nil_valuation_engine',
        timestamp: new Date().toISOString()
      };

      this.cacheResult(cacheKey, result, 3600000); // 1 hour TTL

      return result;

    } catch (error) {
      console.error('Error computing NIL valuation:', error);
      throw new Error(`NIL valuation computation failed: ${error}`);
    }
  }

  // =============================================================================
  // UTILITY METHODS & INTEGRATION HELPERS
  // =============================================================================

  private normalizeRestDays(restDays: number): number {
    // Optimal rest is 1-2 days, diminishing returns after that
    if (restDays <= 2) return 1.0;
    if (restDays <= 5) return 1 - ((restDays - 2) * 0.1);
    return Math.max(0.5, 1 - ((restDays - 2) * 0.1));
  }

  private getCachedResult(key: string): FeatureResult | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expires) {
      return cached.result;
    }
    this.cache.delete(key);
    return null;
  }

  private cacheResult(key: string, result: FeatureResult, ttlMs: number): void {
    this.cache.set(key, {
      result,
      expires: Date.now() + ttlMs
    });
  }

  private async fetchFromMCP(functionName: string, params: any): Promise<any> {
    try {
      // Simulate MCP server integration
      // In production, this would use actual MCP protocol
      const mockResponses = {
        getTeamPerformance: {
          rest_days: 1,
          recent_win_rate: 0.62,
          bullpen_fatigue: 0.3,
          injury_count: 2,
          defensive_stops: 28,
          offensive_rebounds: 12,
          loose_balls: 8,
          charges_taken: 2
        }
      };

      return mockResponses[functionName as keyof typeof mockResponses] || {};
    } catch (error) {
      console.warn(`MCP server request failed: ${error}`);
      return {};
    }
  }

  /**
   * Batch compute multiple features for dashboard updates
   */
  async computeFeatureBatch(requests: FeatureComputationRequest[]): Promise<{ [key: string]: FeatureResult }> {
    const startTime = performance.now();
    const results: { [key: string]: FeatureResult } = {};

    // Execute computations in parallel for optimal performance
    const computationPromises = requests.map(async (request) => {
      try {
        let result: FeatureResult;

        // Route to appropriate computation method
        switch (request.feature_name) {
          case 'bullpen_fatigue_index':
            result = await this.computeBullpenFatigueIndex(request.input_data);
            break;
          case 'cardinals_readiness':
            result = await this.computeCardinalsReadiness();
            break;
          case 'qb_pressure_sack_rate':
            result = await this.computeQBPressureSackRate(request.input_data);
            break;
          case 'grizzlies_grit_index':
            result = await this.computeGrizzliesGritIndex();
            break;
          case 'character_assessment':
            result = await this.computeCharacterAssessment(request.input_data);
            break;
          case 'nil_valuation':
            result = await this.computeNILValuation(request.input_data);
            break;
          default:
            throw new Error(`Unknown feature: ${request.feature_name}`);
        }

        results[request.feature_name] = result;
      } catch (error) {
        console.error(`Failed to compute ${request.feature_name}:`, error);
        results[request.feature_name] = {
          value: 0,
          confidence: 0,
          computation_time_ms: 0,
          data_quality: 0,
          source: 'error',
          timestamp: new Date().toISOString()
        };
      }
    });

    await Promise.all(computationPromises);

    const totalTime = performance.now() - startTime;
    console.log(`Batch computation of ${requests.length} features completed in ${totalTime.toFixed(2)}ms`);

    return results;
  }

  /**
   * Real-time dashboard data provider
   */
  async getDashboardFeatures(teamFocus?: 'cardinals' | 'titans' | 'grizzlies' | 'longhorns'): Promise<any> {
    const features: FeatureComputationRequest[] = [];

    // Add team-specific features based on focus
    switch (teamFocus) {
      case 'cardinals':
        features.push(
          { feature_name: 'bullpen_fatigue_index', input_data: { team_id: 'STL', pitcher_data: [] } },
          { feature_name: 'cardinals_readiness', input_data: {} }
        );
        break;
      case 'titans':
        features.push(
          { feature_name: 'qb_pressure_sack_rate', input_data: { qb_id: 'TEN_QB1', team_id: 'TEN', game_data: [] } }
        );
        break;
      case 'grizzlies':
        features.push(
          { feature_name: 'grizzlies_grit_index', input_data: {} }
        );
        break;
    }

    // Add cross-sport features
    features.push(
      { feature_name: 'character_assessment', input_data: { athlete_id: 'sample', video_analysis_data: {} } },
      { feature_name: 'nil_valuation', input_data: { athlete_id: 'sample', sport: 'football', performance_percentile: 85, social_media: { total_followers: 50000, engagement_rate: 4.2 }, market_factors: { school_market_size: 'major', team_success_rating: 0.8 } } }
    );

    return await this.computeFeatureBatch(features);
  }

  /**
   * Performance monitoring and alerting
   */
  monitorPerformance(): void {
    setInterval(() => {
      // Browser-compatible memory monitoring
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const heapUsed = Math.round((memInfo.usedJSHeapSize / 1024 / 1024) * 100) / 100;

        if (heapUsed > 100) { // Alert if over 100MB
          console.warn(`High memory usage detected: ${heapUsed}MB`);
        }
      }

      // Clear expired cache entries
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now >= value.expires) {
          this.cache.delete(key);
        }
      }

    }, 60000); // Check every minute
  }
}

// =============================================================================
// EXPORT FACTORY & CONFIGURATION
// =============================================================================

export function createBlazeFeatureClient(environment: 'development' | 'production' = 'production') {
  const config = environment === 'production'
    ? {
        baseUrl: 'https://blazesportsintel.com/api',
        mcpServerEndpoint: 'mcp://blaze-intelligence-prod',
        performanceTargetMs: 100
      }
    : {
        baseUrl: 'http://localhost:3000/api',
        mcpServerEndpoint: 'mcp://blaze-intelligence-dev',
        performanceTargetMs: 200
      };

  const client = new BlazeFeatureIntegrationClient(config);

  // Start performance monitoring in production
  if (environment === 'production') {
    client.monitorPerformance();
  }

  return client;
}

// Export types for external use
export type {
  BaseFeatureInput,
  BaseballFeatureInput,
  FootballFeatureInput,
  BasketballFeatureInput,
  CrossSportFeatureInput,
  FeatureResult,
  FeatureComputationRequest
};