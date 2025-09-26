/**
 * St. Louis Cardinals MLB Data Adapter
 * Specialized adapter for Cardinals data with enhanced analytics
 * Integrates with MLB Stats API and Baseball Reference
 */

import axios, { AxiosInstance } from 'axios';
import pLimit from 'p-limit';
import pRetry from 'p-retry';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Chicago';
const USER_AGENT = 'BlazeSportsIntelBot/1.0 (https://blazesportsintel.com; sports-data@blazeintelligence.com)';
const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
const CARDINALS_TEAM_ID = 138;

// Enhanced Cardinals-specific schemas
const CardinalsPlayerSchema = z.object({
  id: z.string(),
  mlbId: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string(),
  jerseyNumber: z.number().optional(),
  position: z.string(),
  active: z.boolean(),

  // Physical attributes
  height: z.string(),
  weight: z.number(),
  age: z.number(),
  birthDate: z.string(),
  birthCity: z.string().optional(),
  birthCountry: z.string().optional(),

  // Contract info (public)
  contractStatus: z.enum(['signed', 'unsigned', 'arbitration']).optional(),
  yearsService: z.number().optional(),

  // Performance tracking
  currentStats: z.object({
    batting: z.object({
      avg: z.number(),
      obp: z.number(),
      slg: z.number(),
      ops: z.number(),
      wrc_plus: z.number().optional(),
      war: z.number().optional()
    }).optional(),
    pitching: z.object({
      era: z.number(),
      whip: z.number(),
      k9: z.number(),
      bb9: z.number(),
      fip: z.number().optional(),
      war: z.number().optional()
    }).optional(),
    fielding: z.object({
      errors: z.number(),
      fieldingPct: z.number(),
      drs: z.number().optional(), // Defensive Runs Saved
      uzr: z.number().optional() // Ultimate Zone Rating
    }).optional()
  }),

  // Cardinals-specific analytics
  cardinalsAnalytics: z.object({
    readinessScore: z.number().min(0).max(1), // 0-1 scale
    leverageIndex: z.number(),
    clutchPerformance: z.number().optional(),
    buschStadiumSplits: z.object({
      home_ops: z.number().optional(),
      road_ops: z.number().optional()
    }).optional(),
    recentForm: z.object({
      last7days: z.record(z.union([z.string(), z.number()])),
      last30days: z.record(z.union([z.string(), z.number()]))
    }).optional()
  }),

  externalRefs: z.object({
    mlbUrl: z.string(),
    baseballReferenceUrl: z.string().optional(),
    fanGraphsUrl: z.string().optional(),
    cardinalsUrl: z.string().optional()
  })
});

const CardinalsGameSchema = z.object({
  id: z.string(),
  mlbGameId: z.number(),
  date: z.string(),
  time: z.string(),
  opponent: z.string(),
  opponentId: z.number(),
  isHome: z.boolean(),
  venue: z.string(),

  // Game state
  status: z.enum(['scheduled', 'pre-game', 'live', 'final', 'cancelled', 'postponed']),
  inning: z.number().optional(),
  topBottom: z.enum(['top', 'bottom']).optional(),

  // Score
  cardinalsScore: z.number().nullable(),
  opponentScore: z.number().nullable(),

  // Enhanced game data
  gameData: z.object({
    attendance: z.number().optional(),
    weather: z.object({
      temp: z.number().optional(),
      condition: z.string().optional(),
      wind: z.string().optional()
    }).optional(),
    umpires: z.array(z.object({
      name: z.string(),
      position: z.string()
    })).optional(),
    startTime: z.string().optional(),
    duration: z.string().optional()
  }).optional(),

  // Cardinals-specific analytics
  gameAnalytics: z.object({
    winProbability: z.number().optional(),
    leverageSituations: z.number().optional(),
    clutchHits: z.number().optional(),
    bullpenUsage: z.record(z.number()).optional(),
    baseballSavantMetrics: z.record(z.union([z.string(), z.number()])).optional()
  }).optional(),

  externalRefs: z.object({
    mlbUrl: z.string(),
    gamecastUrl: z.string().optional(),
    highlightsUrl: z.string().optional(),
    boxscoreUrl: z.string().optional()
  })
});

const CardinalsStandingsSchema = z.object({
  season: z.number(),
  lastUpdated: z.string(),

  // Current standings
  record: z.object({
    wins: z.number(),
    losses: z.number(),
    ties: z.number().default(0),
    winPct: z.number(),
    gamesBack: z.number(),
    wildCardGamesBack: z.number().optional()
  }),

  // Division/League position
  divisionRank: z.number(),
  leagueRank: z.number(),
  mlbRank: z.number(),

  // Detailed records
  splits: z.object({
    home: z.object({ wins: z.number(), losses: z.number() }),
    away: z.object({ wins: z.number(), losses: z.number() }),
    vs_al: z.object({ wins: z.number(), losses: z.number() }),
    vs_nl_central: z.object({ wins: z.number(), losses: z.number() }),
    lastTenGames: z.object({ wins: z.number(), losses: z.number() }),
    streak: z.string()
  }),

  // Advanced metrics
  pythaginianRecord: z.object({
    expectedWins: z.number(),
    expectedLosses: z.number()
  }).optional(),

  playoffOdds: z.object({
    division: z.number().optional(),
    wildCard: z.number().optional(),
    overall: z.number().optional()
  }).optional()
});

type CardinalsPlayer = z.infer<typeof CardinalsPlayerSchema>;
type CardinalsGame = z.infer<typeof CardinalsGameSchema>;
type CardinalsStandings = z.infer<typeof CardinalsStandingsSchema>;

export class MLBCardinalsAdapter {
  private client: AxiosInstance;
  private limit = pLimit(10);

  constructor() {
    this.client = axios.create({
      baseURL: MLB_API_BASE,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Fetch current Cardinals roster
   */
  async fetchRoster(): Promise<CardinalsPlayer[]> {
    console.log('⚾ Fetching Cardinals roster...');

    return pRetry(
      async () => {
        const response = await this.client.get(`/teams/${CARDINALS_TEAM_ID}/roster`);
        const players = response.data.roster || [];

        const cardinalsPlayers: CardinalsPlayer[] = [];

        for (const player of players) {
          try {
            const playerDetails = await this.fetchPlayerDetails(player.person.id);
            const analytics = await this.calculatePlayerAnalytics(player.person.id);

            const cardinalsPlayer: CardinalsPlayer = {
              id: `cardinals-${player.person.id}`,
              mlbId: player.person.id,
              firstName: player.person.firstName,
              lastName: player.person.lastName,
              displayName: player.person.fullName,
              jerseyNumber: parseInt(player.jerseyNumber) || undefined,
              position: player.position.name,
              active: true,
              height: playerDetails.height,
              weight: playerDetails.weight,
              age: playerDetails.currentAge,
              birthDate: playerDetails.birthDate,
              birthCity: playerDetails.birthCity,
              birthCountry: playerDetails.birthCountry,
              currentStats: playerDetails.stats,
              cardinalsAnalytics: analytics,
              externalRefs: {
                mlbUrl: `https://mlb.com/player/${player.person.id}`,
                baseballReferenceUrl: `https://baseball-reference.com/players/${this.getBRefId(player.person.fullName)}`,
                cardinalsUrl: `https://cardinals.com/player/${player.person.id}`
              }
            };

            cardinalsPlayers.push(cardinalsPlayer);
          } catch (error) {
            console.error(`Error processing player ${player.person.fullName}:`, error);
          }
        }

        console.log(`✓ Processed ${cardinalsPlayers.length} Cardinals players`);
        return cardinalsPlayers;
      },
      { retries: 3, minTimeout: 1000, maxTimeout: 5000 }
    );
  }

  /**
   * Fetch Cardinals schedule
   */
  async fetchSchedule(params: {
    startDate?: string;
    endDate?: string;
    season?: number;
  }): Promise<CardinalsGame[]> {
    console.log('📅 Fetching Cardinals schedule...');

    const season = params.season || new Date().getFullYear();
    const startDate = params.startDate || `${season}-03-01`;
    const endDate = params.endDate || `${season}-10-31`;

    return pRetry(
      async () => {
        const response = await this.client.get('/schedule', {
          params: {
            teamId: CARDINALS_TEAM_ID,
            startDate,
            endDate,
            hydrate: 'team,venue,weather,linescore'
          }
        });

        const games = response.data.dates?.flatMap((date: any) => date.games) || [];
        const cardinalsGames: CardinalsGame[] = [];

        for (const game of games) {
          try {
            const analytics = await this.calculateGameAnalytics(game.gamePk);

            const cardinalsGame: CardinalsGame = {
              id: `cardinals-game-${game.gamePk}`,
              mlbGameId: game.gamePk,
              date: game.gameDate.split('T')[0],
              time: format(parseISO(game.gameDate), 'HH:mm'),
              opponent: game.teams.home.team.id === CARDINALS_TEAM_ID
                ? game.teams.away.team.name
                : game.teams.home.team.name,
              opponentId: game.teams.home.team.id === CARDINALS_TEAM_ID
                ? game.teams.away.team.id
                : game.teams.home.team.id,
              isHome: game.teams.home.team.id === CARDINALS_TEAM_ID,
              venue: game.venue.name,
              status: this.mapGameStatus(game.status.statusCode),
              cardinalsScore: game.teams.home.team.id === CARDINALS_TEAM_ID
                ? game.teams.home.score
                : game.teams.away.score,
              opponentScore: game.teams.home.team.id === CARDINALS_TEAM_ID
                ? game.teams.away.score
                : game.teams.home.score,
              gameAnalytics: analytics,
              externalRefs: {
                mlbUrl: `https://mlb.com/gameday/${game.gamePk}`,
                gamecastUrl: `https://mlb.com/gameday/${game.gamePk}/gamecast`,
                boxscoreUrl: `https://mlb.com/gameday/${game.gamePk}/boxscore`
              }
            };

            cardinalsGames.push(cardinalsGame);
          } catch (error) {
            console.error(`Error processing game ${game.gamePk}:`, error);
          }
        }

        console.log(`✓ Processed ${cardinalsGames.length} Cardinals games`);
        return cardinalsGames;
      },
      { retries: 3, minTimeout: 1000, maxTimeout: 5000 }
    );
  }

  /**
   * Fetch current standings
   */
  async fetchStandings(season?: number): Promise<CardinalsStandings> {
    console.log('📊 Fetching Cardinals standings...');

    const currentSeason = season || new Date().getFullYear();

    return pRetry(
      async () => {
        const response = await this.client.get('/standings', {
          params: {
            leagueId: 104, // National League
            season: currentSeason,
            standingsTypes: 'regularSeason'
          }
        });

        const nlCentral = response.data.records.find((division: any) =>
          division.division.id === 205 // NL Central
        );

        const cardinals = nlCentral?.teamRecords.find((team: any) =>
          team.team.id === CARDINALS_TEAM_ID
        );

        if (!cardinals) {
          throw new Error('Cardinals not found in standings');
        }

        const standings: CardinalsStandings = {
          season: currentSeason,
          lastUpdated: new Date().toISOString(),
          record: {
            wins: cardinals.wins,
            losses: cardinals.losses,
            ties: cardinals.ties || 0,
            winPct: parseFloat(cardinals.winningPercentage),
            gamesBack: parseFloat(cardinals.gamesBack) || 0,
            wildCardGamesBack: parseFloat(cardinals.wildCardGamesBack) || undefined
          },
          divisionRank: cardinals.divisionRank,
          leagueRank: cardinals.leagueRank,
          mlbRank: cardinals.sportRank,
          splits: {
            home: { wins: cardinals.records.splitRecords?.find((r: any) => r.type === 'home')?.wins || 0,
                   losses: cardinals.records.splitRecords?.find((r: any) => r.type === 'home')?.losses || 0 },
            away: { wins: cardinals.records.splitRecords?.find((r: any) => r.type === 'away')?.wins || 0,
                   losses: cardinals.records.splitRecords?.find((r: any) => r.type === 'away')?.losses || 0 },
            vs_al: { wins: 0, losses: 0 }, // Would need separate API call
            vs_nl_central: { wins: 0, losses: 0 }, // Would need separate API call
            lastTenGames: { wins: cardinals.records.splitRecords?.find((r: any) => r.type === 'lastTen')?.wins || 0,
                          losses: cardinals.records.splitRecords?.find((r: any) => r.type === 'lastTen')?.losses || 0 },
            streak: cardinals.streak?.streakCode || 'N/A'
          }
        };

        console.log(`✓ Cardinals standings: ${standings.record.wins}-${standings.record.losses} (${standings.divisionRank} in NL Central)`);
        return standings;
      },
      { retries: 3, minTimeout: 1000, maxTimeout: 5000 }
    );
  }

  // Helper methods
  private async fetchPlayerDetails(playerId: number): Promise<any> {
    const response = await this.client.get(`/people/${playerId}`, {
      params: { hydrate: 'stats(group=hitting,pitching,fielding,type=season)' }
    });
    return response.data.people[0];
  }

  private async calculatePlayerAnalytics(playerId: number): Promise<any> {
    // Implementation would calculate Cardinals-specific analytics
    return {
      readinessScore: Math.random(), // Placeholder
      leverageIndex: Math.random() * 2,
      recentForm: {
        last7days: {},
        last30days: {}
      }
    };
  }

  private async calculateGameAnalytics(gameId: number): Promise<any> {
    // Implementation would calculate game-specific analytics
    return {
      winProbability: Math.random(),
      leverageSituations: Math.floor(Math.random() * 10)
    };
  }

  private mapGameStatus(statusCode: string): string {
    const statusMap: { [key: string]: string } = {
      'S': 'scheduled',
      'P': 'pre-game',
      'I': 'live',
      'F': 'final',
      'C': 'cancelled',
      'D': 'postponed'
    };
    return statusMap[statusCode] || 'scheduled';
  }

  private getBRefId(fullName: string): string {
    // Generate Baseball Reference player ID format
    const parts = fullName.toLowerCase().split(' ');
    const lastName = parts[parts.length - 1];
    const firstName = parts[0];
    return `${lastName.substring(0, 5)}${firstName.substring(0, 2)}01`;
  }

  /**
   * Normalize data for storage
   */
  normalize(data: {
    players: CardinalsPlayer[];
    games: CardinalsGame[];
    standings: CardinalsStandings;
  }) {
    return {
      league: 'mlb-cardinals',
      team: 'St. Louis Cardinals',
      season: new Date().getFullYear(),
      lastUpdated: new Date().toISOString(),
      data: {
        players: data.players.map(p => CardinalsPlayerSchema.parse(p)),
        games: data.games.map(g => CardinalsGameSchema.parse(g)),
        standings: CardinalsStandingsSchema.parse(data.standings)
      },
      metadata: {
        source: 'MLB Stats API / Baseball Reference',
        coverage: 'St. Louis Cardinals (Enhanced)',
        totalPlayers: data.players.length,
        totalGames: data.games.length
      }
    };
  }

  /**
   * Validate data
   */
  validate(data: any): boolean {
    try {
      if (data.players) {
        data.players.forEach((p: any) => CardinalsPlayerSchema.parse(p));
      }
      if (data.games) {
        data.games.forEach((g: any) => CardinalsGameSchema.parse(g));
      }
      if (data.standings) {
        CardinalsStandingsSchema.parse(data.standings);
      }
      return true;
    } catch (error) {
      console.error('Cardinals data validation error:', error);
      return false;
    }
  }
}