/**
 * Perfect Game Baseball Data Adapter
 * Collects youth tournament and showcase data for Texas and surrounding states
 * Focus on 14U+ age groups with recruitment tracking
 */

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import pRetry from 'p-retry';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Chicago';
const USER_AGENT = 'BlazeSportsIntelBot/1.0 (https://blazesportsintel.com; sports-data@blazeintelligence.com)';

// Schema definitions for Perfect Game data
const PlayerProfileSchema = z.object({
  id: z.string(),
  pgId: z.string(), // Perfect Game ID
  firstName: z.string(),
  lastName: z.string(),
  graduationYear: z.number(),
  position: z.string(), // Primary position
  secondaryPositions: z.array(z.string()).optional(),
  height: z.string(), // e.g., "6-1"
  weight: z.number(),
  batsThrows: z.string(), // e.g., "R/R", "L/R"
  hometown: z.string(),
  state: z.string(),
  highSchool: z.string(),
  travelTeam: z.string().optional(),

  // Performance metrics
  metrics: z.object({
    exitVelo: z.number().optional(), // mph
    throwingVelo: z.number().optional(), // mph (position players)
    pitchingVelo: z.number().optional(), // mph (pitchers)
    sixtyTime: z.number().optional(), // seconds
    popTime: z.number().optional(), // seconds (catchers)
    homeToFirst: z.number().optional() // seconds
  }).optional(),

  // Recruiting info
  recruiting: z.object({
    rating: z.number().min(0).max(10).optional(), // PG Grade
    nationalRank: z.number().optional(),
    stateRank: z.number().optional(),
    positionRank: z.number().optional(),
    commitment: z.string().optional(),
    offers: z.array(z.string()).optional(),
    interest: z.array(z.string()).optional()
  }).optional(),

  // Tournament history
  tournaments: z.array(z.object({
    name: z.string(),
    date: z.string(),
    team: z.string(),
    stats: z.record(z.union([z.string(), z.number()]))
  })).optional(),

  externalRefs: z.object({
    pgUrl: z.string(),
    prepBaseballUrl: z.string().optional(),
    mlbDraftUrl: z.string().optional()
  })
});

const TournamentSchema = z.object({
  id: z.string(),
  pgTournamentId: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  location: z.object({
    city: z.string(),
    state: z.string(),
    venue: z.string().optional(),
    complexes: z.array(z.string()).optional()
  }),
  ageGroups: z.array(z.string()), // e.g., ["14U", "16U", "18U"]
  divisions: z.array(z.string()).optional(),
  totalTeams: z.number(),
  type: z.enum(['tournament', 'showcase', 'league', 'championship']),

  // Tournament details
  format: z.string().optional(), // e.g., "Pool Play + Bracket"
  guaranteedGames: z.number().optional(),
  entryFee: z.number().optional(),

  teams: z.array(z.object({
    id: z.string(),
    name: z.string(),
    organization: z.string().optional(),
    city: z.string(),
    state: z.string(),
    ageGroup: z.string(),
    division: z.string().optional()
  })).optional(),

  externalRefs: z.object({
    pgUrl: z.string(),
    diamondKinesisUrl: z.string().optional() // GameChanger alternative
  })
});

const ShowcaseSchema = z.object({
  id: z.string(),
  pgShowcaseId: z.string(),
  name: z.string(),
  date: z.string(),
  location: z.object({
    city: z.string(),
    state: z.string(),
    venue: z.string()
  }),
  graduationYears: z.array(z.number()),
  inviteOnly: z.boolean(),

  participants: z.array(z.object({
    playerId: z.string(),
    pgId: z.string(),
    name: z.string(),
    position: z.string(),
    highSchool: z.string(),
    graduationYear: z.number(),
    metrics: z.record(z.union([z.string(), z.number()]))
  })).optional(),

  scouts: z.array(z.object({
    organization: z.string(),
    level: z.enum(['MLB', 'College', 'JUCO'])
  })).optional(),

  externalRefs: z.object({
    pgUrl: z.string(),
    livestreamUrl: z.string().optional()
  })
});

const TeamRankingSchema = z.object({
  rank: z.number(),
  teamId: z.string(),
  teamName: z.string(),
  organization: z.string(),
  state: z.string(),
  ageGroup: z.string(),
  record: z.string(), // e.g., "45-10-2"
  winPercentage: z.number(),
  points: z.number().optional(),
  lastUpdated: z.string()
});

type PlayerProfile = z.infer<typeof PlayerProfileSchema>;
type Tournament = z.infer<typeof TournamentSchema>;
type Showcase = z.infer<typeof ShowcaseSchema>;
type TeamRanking = z.infer<typeof TeamRankingSchema>;

export class PerfectGameBaseballAdapter {
  private client: AxiosInstance;
  private limit = pLimit(3); // Lower limit for PG to be respectful

  constructor() {
    this.client = axios.create({
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/json,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache'
      },
      timeout: 30000
    });
  }

  /**
   * Discover Texas-area tournaments
   */
  async discoverTournaments(params: {
    state?: string;
    ageGroups?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<Tournament[]> {
    const state = params.state || 'TX';
    const ageGroups = params.ageGroups || ['14U', '15U', '16U', '17U', '18U'];

    console.log(`⚾ Discovering Perfect Game tournaments in ${state}...`);

    const tournaments: Tournament[] = [];

    for (const ageGroup of ageGroups) {
      try {
        const ageTournaments = await this.fetchTournamentsByAge(state, ageGroup);
        tournaments.push(...ageTournaments);
        console.log(`  ✓ Found ${ageTournaments.length} ${ageGroup} tournaments`);
      } catch (error) {
        console.error(`  ✗ Error fetching ${ageGroup} tournaments:`, error);
      }
    }

    console.log(`⚾ Total tournaments discovered: ${tournaments.length}`);
    return tournaments;
  }

  /**
   * Fetch tournaments by age group
   */
  private async fetchTournamentsByAge(state: string, ageGroup: string): Promise<Tournament[]> {
    return pRetry(
      async () => {
        // Implementation would scrape PG tournament listings
        // Respecting robots.txt and rate limits
        const mockTournament: Tournament = {
          id: `pg-tournament-${ageGroup}-example`,
          pgTournamentId: 'PG123',
          name: `Texas State Championship ${ageGroup}`,
          startDate: '2025-10-01',
          endDate: '2025-10-05',
          location: {
            city: 'Round Rock',
            state: 'TX',
            venue: 'Dell Diamond Complex',
            complexes: ['Dell Diamond', 'Old Settlers Park']
          },
          ageGroups: [ageGroup],
          divisions: ['Open', 'AAA', 'AA'],
          totalTeams: 64,
          type: 'tournament',
          format: 'Pool Play + Single Elimination',
          guaranteedGames: 4,
          externalRefs: {
            pgUrl: `https://perfectgame.org/tournaments/${ageGroup}/texas-state`,
            diamondKinesisUrl: 'https://diamondkinetics.com/tournament/123'
          }
        };

        return [mockTournament];
      },
      {
        retries: 3,
        minTimeout: 2000,
        maxTimeout: 10000
      }
    );
  }

  /**
   * Fetch player profiles
   */
  async fetchPlayerProfiles(params: {
    graduationYear?: number;
    state?: string;
    position?: string;
    minRating?: number;
  }): Promise<PlayerProfile[]> {
    console.log(`👤 Fetching Perfect Game player profiles...`);

    const players: PlayerProfile[] = [];

    // Implementation would fetch from PG player database
    // with proper authorization if required

    return players;
  }

  /**
   * Fetch showcase data
   */
  async fetchShowcases(params: {
    state?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Showcase[]> {
    console.log(`🎯 Fetching Perfect Game showcases...`);

    const showcases: Showcase[] = [];

    // Implementation would fetch showcase schedules and results

    return showcases;
  }

  /**
   * Fetch team rankings
   */
  async fetchTeamRankings(ageGroup: string, state?: string): Promise<TeamRanking[]> {
    console.log(`🏆 Fetching Perfect Game team rankings for ${ageGroup}...`);

    const rankings: TeamRanking[] = [];

    // Implementation would fetch current team rankings

    return rankings;
  }

  /**
   * Fetch recruiting updates
   */
  async fetchRecruitingUpdates(params: {
    graduationYear: number;
    state?: string;
    recentDays?: number;
  }): Promise<any[]> {
    console.log(`🎓 Fetching recruiting updates for class of ${params.graduationYear}...`);

    const updates: any[] = [];

    // Implementation would fetch recent commits and offers

    return updates;
  }

  /**
   * Normalize all data to canonical format
   */
  normalize(data: {
    tournaments: Tournament[];
    players: PlayerProfile[];
    showcases: Showcase[];
    rankings: TeamRanking[];
  }) {
    return {
      league: 'perfect-game',
      season: new Date().getFullYear(),
      lastUpdated: new Date().toISOString(),
      data: {
        tournaments: data.tournaments.map(t => TournamentSchema.parse(t)),
        players: data.players.map(p => PlayerProfileSchema.parse(p)),
        showcases: data.showcases.map(s => ShowcaseSchema.parse(s)),
        rankings: data.rankings.map(r => TeamRankingSchema.parse(r))
      },
      metadata: {
        source: 'Perfect Game USA',
        coverage: 'Youth Baseball Tournaments & Showcases (14U+)',
        totalTournaments: data.tournaments.length,
        totalPlayers: data.players.length,
        totalShowcases: data.showcases.length
      }
    };
  }

  /**
   * Validate data quality
   */
  validate(data: any): boolean {
    try {
      if (data.tournaments) {
        data.tournaments.forEach((t: any) => TournamentSchema.parse(t));
      }
      if (data.players) {
        data.players.forEach((p: any) => PlayerProfileSchema.parse(p));
      }
      if (data.showcases) {
        data.showcases.forEach((s: any) => ShowcaseSchema.parse(s));
      }
      if (data.rankings) {
        data.rankings.forEach((r: any) => TeamRankingSchema.parse(r));
      }
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }
}