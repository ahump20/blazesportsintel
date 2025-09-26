/**
 * Data Collection Orchestrator
 * Manages daily data refresh across all sports leagues
 * Runs at 5:00 AM Central Time with error handling and reporting
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import pLimit from 'p-limit';

// Import all adapters
import { TexasHSFootballAdapter } from '../adapters/texas-hs-football.adapter.js';
import { PerfectGameBaseballAdapter } from '../adapters/perfect-game-baseball.adapter.js';
import { MLBCardinalsAdapter } from '../adapters/mlb-cardinals.adapter.js';
// Additional adapters would be imported here

const TIMEZONE = 'America/Chicago';
const DATA_DIR = process.env.DATA_DIR || './data';
const MAX_CONCURRENT_COLLECTORS = 3;

interface CollectionResult {
  league: string;
  success: boolean;
  recordCount: number;
  duration: number;
  error?: string;
  warnings: string[];
  dataFiles: string[];
}

interface CollectionReport {
  timestamp: string;
  totalDuration: number;
  successCount: number;
  errorCount: number;
  totalRecords: number;
  results: CollectionResult[];
  nextScheduledRun: string;
}

export class DataOrchestrator {
  private limit = pLimit(MAX_CONCURRENT_COLLECTORS);
  private collectors: Map<string, any> = new Map();

  constructor() {
    this.initializeCollectors();
  }

  private initializeCollectors() {
    this.collectors.set('texas-hs-football', new TexasHSFootballAdapter());
    this.collectors.set('perfect-game', new PerfectGameBaseballAdapter());
    this.collectors.set('mlb-cardinals', new MLBCardinalsAdapter());

    // Additional collectors would be registered here:
    // this.collectors.set('nfl-titans', new NFLTitansAdapter());
    // this.collectors.set('nba-grizzlies', new NBAGrizzliesAdapter());
    // this.collectors.set('ncaa-longhorns', new NCAALonghornsAdapter());
  }

  /**
   * Execute daily data refresh for all leagues
   */
  async executeDailyRefresh(): Promise<CollectionReport> {
    const startTime = Date.now();
    const timestamp = format(toZonedTime(new Date(), TIMEZONE), 'yyyy-MM-dd HH:mm:ss zzz');

    console.log('🚀 Starting daily data refresh at', timestamp);
    console.log(`📊 Collecting data for ${this.collectors.size} leagues...`);

    const results: CollectionResult[] = [];
    const collectionPromises = Array.from(this.collectors.entries()).map(
      ([league, adapter]) => this.limit(() => this.collectLeagueData(league, adapter))
    );

    const collectionResults = await Promise.allSettled(collectionPromises);

    for (let i = 0; i < collectionResults.length; i++) {
      const result = collectionResults[i];
      const league = Array.from(this.collectors.keys())[i];

      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          league,
          success: false,
          recordCount: 0,
          duration: 0,
          error: result.reason?.message || 'Unknown error',
          warnings: [],
          dataFiles: []
        });
      }
    }

    const report: CollectionReport = {
      timestamp,
      totalDuration: Date.now() - startTime,
      successCount: results.filter(r => r.success).length,
      errorCount: results.filter(r => !r.success).length,
      totalRecords: results.reduce((sum, r) => sum + r.recordCount, 0),
      results,
      nextScheduledRun: this.getNextRunTime()
    };

    await this.generateReport(report);
    await this.notifyCompletion(report);

    console.log(`✅ Daily refresh completed in ${report.totalDuration}ms`);
    console.log(`📈 ${report.successCount}/${this.collectors.size} leagues successful`);
    console.log(`📄 ${report.totalRecords} total records collected`);

    return report;
  }

  /**
   * Collect data for a specific league
   */
  private async collectLeagueData(league: string, adapter: any): Promise<CollectionResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const dataFiles: string[] = [];

    try {
      console.log(`🏃‍♂️ Starting collection for ${league}...`);

      let data: any = {};
      let recordCount = 0;

      // Execute league-specific collection based on adapter type
      switch (league) {
        case 'texas-hs-football':
          data.teams = await adapter.discoverTeams();
          data.games = await adapter.fetchSchedule({ season: new Date().getFullYear() });
          recordCount = data.teams.length + data.games.length;
          break;

        case 'perfect-game':
          data.tournaments = await adapter.discoverTournaments({ state: 'TX' });
          data.players = await adapter.fetchPlayerProfiles({
            graduationYear: new Date().getFullYear() + 1
          });
          recordCount = data.tournaments.length + data.players.length;
          break;

        case 'mlb-cardinals':
          data.players = await adapter.fetchRoster();
          data.games = await adapter.fetchSchedule({ season: new Date().getFullYear() });
          data.standings = await adapter.fetchStandings();
          recordCount = data.players.length + data.games.length + 1;
          break;

        default:
          throw new Error(`Unknown league: ${league}`);
      }

      // Normalize data
      const normalizedData = adapter.normalize(data);

      // Validate data quality
      if (!adapter.validate(normalizedData.data)) {
        warnings.push('Data validation warnings detected');
      }

      // Store data
      const files = await this.storeData(league, normalizedData);
      dataFiles.push(...files);

      console.log(`✅ ${league} completed: ${recordCount} records in ${Date.now() - startTime}ms`);

      return {
        league,
        success: true,
        recordCount,
        duration: Date.now() - startTime,
        warnings,
        dataFiles
      };

    } catch (error) {
      console.error(`❌ ${league} failed:`, error);

      return {
        league,
        success: false,
        recordCount: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings,
        dataFiles
      };
    }
  }

  /**
   * Store normalized data to filesystem
   */
  private async storeData(league: string, data: any): Promise<string[]> {
    const date = format(new Date(), 'yyyy-MM-dd');
    const leagueDir = join(DATA_DIR, league, data.season.toString());
    const files: string[] = [];

    // Ensure directory exists
    if (!existsSync(leagueDir)) {
      mkdirSync(leagueDir, { recursive: true });
    }

    // Store as JSONL (newline-delimited JSON)
    const jsonlFile = join(leagueDir, `${date}.jsonl`);
    const jsonlData = Object.entries(data.data).map(([type, records]) => {
      if (Array.isArray(records)) {
        return records.map(record => JSON.stringify({ type, ...record })).join('\n');
      } else {
        return JSON.stringify({ type, ...records });
      }
    }).join('\n');

    writeFileSync(jsonlFile, jsonlData);
    files.push(jsonlFile);

    // Store metadata
    const metaFile = join(leagueDir, `${date}-metadata.json`);
    writeFileSync(metaFile, JSON.stringify({
      ...data.metadata,
      generatedAt: new Date().toISOString(),
      fileSize: Buffer.byteLength(jsonlData, 'utf8'),
      recordCounts: Object.fromEntries(
        Object.entries(data.data).map(([type, records]) => [
          type,
          Array.isArray(records) ? records.length : 1
        ])
      )
    }, null, 2));
    files.push(metaFile);

    // Store latest snapshot (for API serving)
    const latestFile = join(leagueDir, 'latest.json');
    writeFileSync(latestFile, JSON.stringify(data, null, 2));
    files.push(latestFile);

    return files;
  }

  /**
   * Generate collection report
   */
  private async generateReport(report: CollectionReport): Promise<void> {
    const reportsDir = join(DATA_DIR, 'reports');
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }

    const date = format(new Date(), 'yyyy-MM-dd');
    const reportFile = join(reportsDir, `collection-${date}.json`);

    writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Also store as latest
    const latestFile = join(reportsDir, 'latest-collection.json');
    writeFileSync(latestFile, JSON.stringify(report, null, 2));

    console.log(`📋 Report saved to ${reportFile}`);
  }

  /**
   * Send completion notification (implement based on notification preferences)
   */
  private async notifyCompletion(report: CollectionReport): Promise<void> {
    // Implementation would send notifications via:
    // - Email (for daily summary)
    // - Slack webhook (for errors)
    // - Discord webhook (for status updates)
    // - Push notifications (for mobile app)

    if (report.errorCount > 0) {
      console.warn(`⚠️  ${report.errorCount} leagues had errors - notifications would be sent`);
    }

    // Mock notification
    console.log('📤 Notifications sent to configured channels');
  }

  /**
   * Calculate next scheduled run time (5:00 AM CT)
   */
  private getNextRunTime(): string {
    const now = toZonedTime(new Date(), TIMEZONE);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(5, 0, 0, 0);

    return format(tomorrow, 'yyyy-MM-dd HH:mm:ss zzz');
  }

  /**
   * Manual collection for specific league
   */
  async collectLeague(leagueName: string): Promise<CollectionResult> {
    const adapter = this.collectors.get(leagueName);
    if (!adapter) {
      throw new Error(`League '${leagueName}' not found. Available: ${Array.from(this.collectors.keys()).join(', ')}`);
    }

    console.log(`🎯 Manual collection for ${leagueName}...`);
    return await this.collectLeagueData(leagueName, adapter);
  }

  /**
   * Get collection status
   */
  getStatus(): any {
    return {
      availableLeagues: Array.from(this.collectors.keys()),
      dataDirectory: DATA_DIR,
      maxConcurrentCollectors: MAX_CONCURRENT_COLLECTORS,
      nextScheduledRun: this.getNextRunTime(),
      timezone: TIMEZONE
    };
  }

  /**
   * Validate all stored data
   */
  async validateStoredData(): Promise<any> {
    console.log('🔍 Validating stored data...');

    const validationResults: any = {};

    for (const [league, adapter] of this.collectors.entries()) {
      try {
        const latestFile = join(DATA_DIR, league, 'latest.json');
        if (existsSync(latestFile)) {
          const data = JSON.parse(require('fs').readFileSync(latestFile, 'utf8'));
          const isValid = adapter.validate(data.data);

          validationResults[league] = {
            isValid,
            lastUpdated: data.lastUpdated,
            recordCount: this.countRecords(data.data)
          };
        } else {
          validationResults[league] = {
            isValid: false,
            error: 'No data file found'
          };
        }
      } catch (error) {
        validationResults[league] = {
          isValid: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return validationResults;
  }

  private countRecords(data: any): number {
    return Object.values(data).reduce((total, value) => {
      if (Array.isArray(value)) {
        return total + value.length;
      } else if (typeof value === 'object' && value !== null) {
        return total + 1;
      }
      return total;
    }, 0);
  }
}

// Export singleton instance
export const dataOrchestrator = new DataOrchestrator();