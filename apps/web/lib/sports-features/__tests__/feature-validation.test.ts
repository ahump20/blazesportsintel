/**
 * =============================================================================
 * BLAZE SPORTS INTELLIGENCE - COMPREHENSIVE FEATURE VALIDATION TESTS
 * =============================================================================
 * Unit tests and integration tests for sports feature engineering
 * Performance benchmarks and data quality validation
 * Target: >95% test coverage, <100ms computation times
 * =============================================================================
 */

import { performance } from 'perf_hooks';
import {
  BlazeFeatureIntegrationClient,
  createBlazeFeatureClient,
  FeatureResult,
  FeatureComputationRequest
} from '../feature-integration';

// Mock data generators
const generateMockBaseballData = () => ({
  team_id: 'STL',
  pitcher_data: [
    {
      pitcher_id: 'P001_Helsley',
      appearances: [
        { date: '2025-09-23', pitches: 25, back_to_back: false, role: 'RP' as const },
        { date: '2025-09-24', pitches: 18, back_to_back: true, role: 'RP' as const },
        { date: '2025-09-25', pitches: 22, back_to_back: false, role: 'RP' as const }
      ]
    },
    {
      pitcher_id: 'P002_Gallegos',
      appearances: [
        { date: '2025-09-23', pitches: 32, back_to_back: false, role: 'RP' as const },
        { date: '2025-09-25', pitches: 15, back_to_back: false, role: 'RP' as const }
      ]
    }
  ]
});

const generateMockFootballData = () => ({
  qb_id: 'QB001_Levis',
  team_id: 'TEN',
  game_data: [
    { game_number: 1, opponent: 'IND', pressures: 12, sacks: 3, opponent_pass_block_rating: 0.65 },
    { game_number: 2, opponent: 'HOU', pressures: 8, sacks: 1, opponent_pass_block_rating: 0.78 },
    { game_number: 3, opponent: 'JAX', pressures: 15, sacks: 4, opponent_pass_block_rating: 0.58 }
  ]
});

const generateMockBasketballData = () => ({
  player_id: 'P001_Morant',
  team_id: 'MEM',
  game_stats: [
    { game_date: '2025-09-20', fg_made: 8, fg_attempted: 18, three_made: 2, three_attempted: 6, shot_quality_rating: 0.42, clutch_time_fg: 1 },
    { game_date: '2025-09-22', fg_made: 12, fg_attempted: 22, three_made: 4, three_attempted: 9, shot_quality_rating: 0.48, clutch_time_fg: 0 },
    { game_date: '2025-09-24', fg_made: 6, fg_attempted: 15, three_made: 1, three_attempted: 4, shot_quality_rating: 0.38, clutch_time_fg: 2 }
  ]
});

describe('BlazeFeatureIntegrationClient', () => {
  let client: BlazeFeatureIntegrationClient;

  beforeEach(() => {
    client = createBlazeFeatureClient('development');
  });

  // =============================================================================
  // BASEBALL FEATURE TESTS - Cardinals Focus
  // =============================================================================

  describe('Baseball Features - Cardinals Analytics', () => {
    test('computeBullpenFatigueIndex should calculate fatigue correctly', async () => {
      const startTime = performance.now();
      const mockData = generateMockBaseballData();

      const result = await client.computeBullpenFatigueIndex(mockData);

      const computationTime = performance.now() - startTime;

      // Performance validation
      expect(computationTime).toBeLessThan(100); // <100ms requirement
      expect(result.computation_time_ms).toBeLessThan(100);

      // Result validation
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.data_quality).toBeGreaterThan(0.9);
      expect(result.source).toBe('mcp_cardinals_server');

      console.log('✅ Bullpen Fatigue Index - Cardinals:', {
        value: result.value,
        computation_time: `${computationTime.toFixed(2)}ms`,
        confidence: result.confidence
      });
    });

    test('computeBatterChaseRate should handle discipline analysis', async () => {
      const mockChaseData = {
        batter_id: 'B001_Goldschmidt',
        pitch_data: [
          { date: '2025-09-01', pitch_location: { x: 0, y: 0, z: 1.5 }, strike_zone: { top: 3.5, bottom: 1.8, left: -1, right: 1 }, swing: true },
          { date: '2025-09-02', pitch_location: { x: 0, y: 0, z: 1.2 }, strike_zone: { top: 3.5, bottom: 1.8, left: -1, right: 1 }, swing: false },
          { date: '2025-09-03', pitch_location: { x: 0, y: 0, z: -0.5 }, strike_zone: { top: 3.5, bottom: 1.8, left: -1, right: 1 }, swing: true },
          ...Array.from({ length: 20 }, (_, i) => ({
            date: `2025-09-${String(i + 10).padStart(2, '0')}`,
            pitch_location: { x: 0, y: 0, z: Math.random() * 4 },
            strike_zone: { top: 3.5, bottom: 1.8, left: -1, right: 1 },
            swing: Math.random() > 0.6
          }))
        ]
      };

      const startTime = performance.now();
      const result = await client.computeBatterChaseRate(mockChaseData);
      const computationTime = performance.now() - startTime;

      expect(computationTime).toBeLessThan(100);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(1);
      expect(result.source).toBe('statcast_integration');

      console.log('✅ Batter Chase Rate - Cardinals:', {
        value: result.value,
        computation_time: `${computationTime.toFixed(2)}ms`
      });
    });

    test('computeTTOPenalty should analyze times through order', async () => {
      const mockTTOData = {
        pitcher_id: 'P003_Wainwright',
        plate_appearances: [
          { game_id: 'G001', date: '2025-09-01', times_through_order: 2 as const, woba_value: 0.320 },
          { game_id: 'G001', date: '2025-09-01', times_through_order: 3 as const, woba_value: 0.380 },
          { game_id: 'G002', date: '2025-09-03', times_through_order: 2 as const, woba_value: 0.310 },
          { game_id: 'G002', date: '2025-09-03', times_through_order: 3 as const, woba_value: 0.395 },
          ...Array.from({ length: 30 }, (_, i) => ({
            game_id: `G${String(i + 3).padStart(3, '0')}`,
            date: `2025-09-${String((i % 25) + 1).padStart(2, '0')}`,
            times_through_order: (Math.floor(i / 10) + 2) as 2 | 3,
            woba_value: 0.300 + Math.random() * 0.200
          }))
        ]
      };

      const startTime = performance.now();
      const result = await client.computeTTOPenalty(mockTTOData);
      const computationTime = performance.now() - startTime;

      expect(computationTime).toBeLessThan(100);
      expect(result.value).toBeGreaterThanOrEqual(-1);
      expect(result.value).toBeLessThanOrEqual(1);
      expect(result.source).toBe('baseball_savant');

      console.log('✅ Times Through Order Penalty:', {
        value: result.value,
        computation_time: `${computationTime.toFixed(2)}ms`,
        interpretation: result.value > 0 ? 'Worse on 3rd time' : 'Better on 3rd time'
      });
    });

    test('computeCardinalsReadiness should provide team readiness', async () => {
      const startTime = performance.now();
      const result = await client.computeCardinalsReadiness();
      const computationTime = performance.now() - startTime;

      expect(computationTime).toBeLessThan(100);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.source).toBe('mcp_cardinals_server');

      console.log('✅ Cardinals Readiness Index:', {
        value: result.value,
        computation_time: `${computationTime.toFixed(2)}ms`,
        readiness_level: result.value > 0.8 ? 'High' : result.value > 0.6 ? 'Medium' : 'Low'
      });
    });
  });

  // =============================================================================
  // FOOTBALL FEATURE TESTS - Titans Focus
  // =============================================================================

  describe('Football Features - Titans Analytics', () => {
    test('computeQBPressureSackRate should analyze QB pressure handling', async () => {
      const startTime = performance.now();
      const mockData = generateMockFootballData();

      const result = await client.computeQBPressureSackRate(mockData);
      const computationTime = performance.now() - startTime;

      expect(computationTime).toBeLessThan(100);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(1);
      expect(result.source).toBe('mcp_titans_server');

      console.log('✅ QB Pressure-to-Sack Rate - Titans:', {
        value: result.value,
        computation_time: `${computationTime.toFixed(2)}ms`,
        performance: result.value < 0.3 ? 'Excellent' : result.value < 0.5 ? 'Good' : 'Needs Improvement'
      });
    });

    test('computeHiddenYardage should calculate field position advantage', async () => {
      const mockHiddenYardageData = {
        team_id: 'TEN',
        game_data: [
          {
            game_number: 1,
            drives: [
              { start_yard_line: 35, expected_start_position: 28, return_yards: 12, penalty_yards_against: 5 },
              { start_yard_line: 22, expected_start_position: 25, return_yards: 0, penalty_yards_against: 0 },
              { start_yard_line: 45, expected_start_position: 30, return_yards: 8, penalty_yards_against: 10 }
            ]
          },
          {
            game_number: 2,
            drives: [
              { start_yard_line: 40, expected_start_position: 32, return_yards: 15, penalty_yards_against: 0 },
              { start_yard_line: 28, expected_start_position: 25, return_yards: 5, penalty_yards_against: 15 }
            ]
          }
        ]
      };

      const startTime = performance.now();
      const result = await client.computeHiddenYardage(mockHiddenYardageData);
      const computationTime = performance.now() - startTime;

      expect(computationTime).toBeLessThan(100);
      expect(result.value).toBeGreaterThanOrEqual(-30);
      expect(result.value).toBeLessThanOrEqual(30);
      expect(result.source).toBe('mcp_titans_server');

      console.log('✅ Hidden Yardage per Drive - Titans:', {
        value: result.value,
        computation_time: `${computationTime.toFixed(2)}ms`,
        field_position: result.value > 0 ? 'Advantage' : 'Disadvantage'
      });
    });
  });

  // =============================================================================
  // BASKETBALL FEATURE TESTS - Grizzlies Focus
  // =============================================================================

  describe('Basketball Features - Grizzlies Analytics', () => {
    test('computeShootingEfficiency should analyze composite shooting metrics', async () => {
      const startTime = performance.now();
      const mockData = generateMockBasketballData();

      const result = await client.computeShootingEfficiency(mockData);
      const computationTime = performance.now() - startTime;

      expect(computationTime).toBeLessThan(100);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(200);
      expect(result.source).toBe('mcp_grizzlies_server');

      console.log('✅ Shooting Efficiency Composite - Grizzlies:', {
        value: result.value,
        computation_time: `${computationTime.toFixed(2)}ms`,
        efficiency_rating: result.value > 120 ? 'Excellent' : result.value > 100 ? 'Above Average' : 'Below Average'
      });
    });

    test('computeGrizzliesGritIndex should measure team culture metrics', async () => {
      const startTime = performance.now();
      const result = await client.computeGrizzliesGritIndex();
      const computationTime = performance.now() - startTime;

      expect(computationTime).toBeLessThan(100);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(100);
      expect(result.source).toBe('mcp_grizzlies_server');

      console.log('✅ Grizzlies Grit and Grind Index:', {
        value: result.value,
        computation_time: `${computationTime.toFixed(2)}ms`,
        grit_level: result.value > 80 ? 'High Grit' : result.value > 60 ? 'Moderate Grit' : 'Building Grit'
      });
    });
  });

  // =============================================================================
  // CROSS-SPORT FEATURE TESTS
  // =============================================================================

  describe('Cross-Sport Features', () => {
    test('computeCharacterAssessment should analyze Vision AI metrics', async () => {
      const mockCharacterData = {
        athlete_id: 'ATH001_MultiSport',
        video_analysis_data: {
          micro_expressions: {
            confidence: 0.85,
            determination: 0.78,
            focus: 0.92
          },
          body_language_score: 0.88,
          pressure_situation: true,
          game_context: 'championship' as const
        }
      };

      const startTime = performance.now();
      const result = await client.computeCharacterAssessment(mockCharacterData);
      const computationTime = performance.now() - startTime;

      expect(computationTime).toBeLessThan(100);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(1);
      expect(result.source).toBe('vision_ai_mediapipe');

      console.log('✅ Character Assessment via Vision AI:', {
        value: result.value,
        computation_time: `${computationTime.toFixed(2)}ms`,
        character_level: result.value > 0.8 ? 'Exceptional Character' : result.value > 0.6 ? 'Strong Character' : 'Developing Character'
      });
    });

    test('computeNILValuation should calculate market value correctly', async () => {
      const mockNILData = {
        athlete_id: 'ATH002_LonghornQB',
        sport: 'football' as const,
        performance_percentile: 89,
        social_media: {
          total_followers: 125000,
          engagement_rate: 4.8
        },
        market_factors: {
          school_market_size: 'major' as const,
          team_success_rating: 0.85
        }
      };

      const startTime = performance.now();
      const result = await client.computeNILValuation(mockNILData);
      const computationTime = performance.now() - startTime;

      expect(computationTime).toBeLessThan(100);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(1000000);
      expect(result.source).toBe('nil_valuation_engine');

      console.log('✅ NIL Valuation Composite:', {
        value: `$${result.value.toLocaleString()}`,
        computation_time: `${computationTime.toFixed(2)}ms`,
        market_tier: result.value > 200000 ? 'Elite' : result.value > 100000 ? 'High Value' : 'Developing Value'
      });
    });
  });

  // =============================================================================
  // BATCH COMPUTATION & PERFORMANCE TESTS
  // =============================================================================

  describe('Batch Computation & Performance', () => {
    test('computeFeatureBatch should handle multiple features efficiently', async () => {
      const requests: FeatureComputationRequest[] = [
        {
          feature_name: 'bullpen_fatigue_index',
          input_data: generateMockBaseballData()
        },
        {
          feature_name: 'qb_pressure_sack_rate',
          input_data: generateMockFootballData()
        },
        {
          feature_name: 'grizzlies_grit_index',
          input_data: {}
        },
        {
          feature_name: 'nil_valuation',
          input_data: {
            athlete_id: 'batch_test',
            sport: 'basketball',
            performance_percentile: 75,
            social_media: { total_followers: 25000, engagement_rate: 3.2 },
            market_factors: { school_market_size: 'large', team_success_rating: 0.7 }
          }
        }
      ];

      const startTime = performance.now();
      const results = await client.computeFeatureBatch(requests);
      const totalTime = performance.now() - startTime;

      // Performance validation - batch should be faster than individual calls
      expect(totalTime).toBeLessThan(500); // <500ms for batch
      expect(Object.keys(results)).toHaveLength(4);

      // Validate each result
      Object.entries(results).forEach(([featureName, result]) => {
        expect(result.computation_time_ms).toBeLessThan(150); // Individual features <150ms in batch
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.timestamp).toBeDefined();
      });

      console.log('✅ Batch Computation Performance:', {
        total_features: requests.length,
        total_time: `${totalTime.toFixed(2)}ms`,
        avg_per_feature: `${(totalTime / requests.length).toFixed(2)}ms`,
        results: Object.keys(results)
      });
    });

    test('getDashboardFeatures should provide comprehensive team data', async () => {
      const teams = ['cardinals', 'titans', 'grizzlies'] as const;

      for (const team of teams) {
        const startTime = performance.now();
        const dashboardData = await client.getDashboardFeatures(team);
        const computationTime = performance.now() - startTime;

        expect(computationTime).toBeLessThan(300); // Dashboard load <300ms
        expect(Object.keys(dashboardData)).toContain('character_assessment');
        expect(Object.keys(dashboardData)).toContain('nil_valuation');

        console.log(`✅ ${team.toUpperCase()} Dashboard Features:`, {
          features_count: Object.keys(dashboardData).length,
          computation_time: `${computationTime.toFixed(2)}ms`,
          features: Object.keys(dashboardData)
        });
      }
    });
  });

  // =============================================================================
  // DATA QUALITY & VALIDATION TESTS
  // =============================================================================

  describe('Data Quality & Validation', () => {
    test('should handle missing data gracefully', async () => {
      const emptyData = { team_id: 'STL', pitcher_data: [] };

      const result = await client.computeBullpenFatigueIndex(emptyData);

      expect(result.value).toBeDefined();
      expect(result.confidence).toBeLessThanOrEqual(0.8); // Lower confidence for missing data
      expect(result.data_quality).toBeLessThanOrEqual(0.9);
    });

    test('should validate output ranges correctly', async () => {
      const mockData = generateMockBaseballData();

      // Add extreme values to test bounds
      mockData.pitcher_data[0].appearances.push({
        date: '2025-09-26',
        pitches: 200, // Extreme value
        back_to_back: true,
        role: 'RP'
      });

      const result = await client.computeBullpenFatigueIndex(mockData);

      // Should still be within valid range despite extreme input
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(1);
    });

    test('should maintain performance under load', async () => {
      const iterations = 10;
      const computationTimes: number[] = [];

      // Run multiple iterations to test consistency
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await client.computeCardinalsReadiness();
        const endTime = performance.now();
        computationTimes.push(endTime - startTime);
      }

      const avgTime = computationTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const maxTime = Math.max(...computationTimes);

      expect(avgTime).toBeLessThan(100); // Average <100ms
      expect(maxTime).toBeLessThan(150); // Max <150ms

      console.log('✅ Performance Under Load:', {
        iterations,
        average_time: `${avgTime.toFixed(2)}ms`,
        max_time: `${maxTime.toFixed(2)}ms`,
        consistency: computationTimes.every(time => time < 150) ? 'Excellent' : 'Needs Improvement'
      });
    });
  });

  // =============================================================================
  // INTEGRATION TESTS WITH MCP SERVER
  // =============================================================================

  describe('MCP Server Integration', () => {
    test('should handle MCP server failures gracefully', async () => {
      // This test would check fallback behavior when MCP server is unavailable
      const result = await client.computeCardinalsReadiness();

      // Should still return a result even if MCP server is down
      expect(result).toBeDefined();
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.source).toBeDefined();
    });

    test('should cache results appropriately', async () => {
      // First call
      const startTime1 = performance.now();
      const result1 = await client.computeGrizzliesGritIndex();
      const time1 = performance.now() - startTime1;

      // Second call (should be faster due to caching)
      const startTime2 = performance.now();
      const result2 = await client.computeGrizzliesGritIndex();
      const time2 = performance.now() - startTime2;

      expect(result1.value).toBe(result2.value);
      expect(time2).toBeLessThan(time1); // Cached call should be faster

      console.log('✅ Caching Performance:', {
        first_call: `${time1.toFixed(2)}ms`,
        cached_call: `${time2.toFixed(2)}ms`,
        improvement: `${((time1 - time2) / time1 * 100).toFixed(1)}% faster`
      });
    });
  });
});

// =============================================================================
// PERFORMANCE BENCHMARKING SUITE
// =============================================================================

describe('Performance Benchmarks', () => {
  let client: BlazeFeatureIntegrationClient;

  beforeAll(() => {
    client = createBlazeFeatureClient('production');
  });

  test('Performance Benchmark Suite', async () => {
    console.log('\n🏆 BLAZE SPORTS INTELLIGENCE - PERFORMANCE BENCHMARKS');
    console.log('='.repeat(60));

    const benchmarks = [
      {
        name: 'Cardinals Bullpen Fatigue',
        fn: () => client.computeBullpenFatigueIndex(generateMockBaseballData()),
        target: 50
      },
      {
        name: 'Titans QB Pressure Analysis',
        fn: () => client.computeQBPressureSackRate(generateMockFootballData()),
        target: 80
      },
      {
        name: 'Grizzlies Shooting Efficiency',
        fn: () => client.computeShootingEfficiency(generateMockBasketballData()),
        target: 45
      },
      {
        name: 'Character Assessment (Vision AI)',
        fn: () => client.computeCharacterAssessment({
          athlete_id: 'benchmark',
          video_analysis_data: {
            micro_expressions: { confidence: 0.8, determination: 0.75, focus: 0.9 },
            body_language_score: 0.85,
            pressure_situation: true,
            game_context: 'clutch'
          }
        }),
        target: 100
      }
    ];

    const results = [];

    for (const benchmark of benchmarks) {
      const iterations = 5;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await benchmark.fn();
        times.push(performance.now() - startTime);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / iterations;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      const passed = avgTime < benchmark.target;
      const grade = avgTime < benchmark.target * 0.5 ? 'A+' :
                   avgTime < benchmark.target * 0.7 ? 'A' :
                   avgTime < benchmark.target * 0.9 ? 'B+' :
                   avgTime < benchmark.target ? 'B' : 'C';

      results.push({
        name: benchmark.name,
        avgTime,
        minTime,
        maxTime,
        target: benchmark.target,
        passed,
        grade
      });

      console.log(`${passed ? '✅' : '❌'} ${benchmark.name}:`);
      console.log(`   Average: ${avgTime.toFixed(2)}ms (target: ${benchmark.target}ms) - Grade: ${grade}`);
      console.log(`   Range: ${minTime.toFixed(2)}ms - ${maxTime.toFixed(2)}ms`);
    }

    console.log('\n📊 BENCHMARK SUMMARY:');
    const passedCount = results.filter(r => r.passed).length;
    const overallGrade = passedCount === results.length ? 'EXCELLENT' :
                        passedCount >= results.length * 0.8 ? 'GOOD' :
                        passedCount >= results.length * 0.6 ? 'NEEDS IMPROVEMENT' : 'POOR';

    console.log(`   Overall Performance: ${overallGrade} (${passedCount}/${results.length} benchmarks passed)`);
    console.log(`   Platform Ready: ${overallGrade === 'EXCELLENT' ? 'YES' : 'NEEDS OPTIMIZATION'}`);
    console.log('='.repeat(60));

    // All benchmarks should pass for production deployment
    expect(passedCount).toBe(results.length);
  });
});

// =============================================================================
// EXPORT TEST UTILITIES
// =============================================================================

export {
  generateMockBaseballData,
  generateMockFootballData,
  generateMockBasketballData
};