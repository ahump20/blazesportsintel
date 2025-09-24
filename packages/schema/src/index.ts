import { z } from 'zod';

// League types
export const LeagueKey = z.enum([
  'nfl',
  'mlb',
  'ncaa_fb',
  'college_bb',
  'tx_hs_fb',
  'pg_tx'
]);

export const LeagueSchema = z.object({
  key: LeagueKey,
  name: z.string(),
  level: z.enum(['professional', 'college', 'high_school', 'youth']),
  governingBody: z.string(),
  sport: z.enum(['football', 'baseball'])
});

// Season schema
export const SeasonSchema = z.object({
  leagueKey: LeagueKey,
  year: z.number(),
  startDate: z.string(), // ISO date
  endDate: z.string(),
  status: z.enum(['upcoming', 'active', 'completed'])
});

// External references for link-outs
export const ExternalRefSchema = z.object({
  source: z.string(),
  id: z.string(),
  url: z.string().url().optional(),
  verified: z.boolean().default(false)
});

// Team schema
export const TeamSchema = z.object({
  id: z.string(),
  leagueKey: LeagueKey,
  season: z.number(),
  name: z.string(),
  nickname: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  conference: z.string().optional(),
  division: z.string().optional(),
  district: z.string().optional(),
  siteUrl: z.string().url().optional(),
  social: z.object({
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional()
  }).optional(),
  externalRefs: z.array(ExternalRefSchema).default([])
});

// Staff schema
export const StaffSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  role: z.string(),
  name: z.string(),
  headCoach: z.boolean().default(false),
  hireDate: z.string().optional(),
  externalRefs: z.array(ExternalRefSchema).default([])
});

// Player schema
export const PlayerSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  name: z.string(),
  position: z.string(),
  jerseyNumber: z.string().optional(),
  classOrLevel: z.string().optional(), // FR, SO, JR, SR for college; grade for HS
  bats: z.enum(['L', 'R', 'S']).optional(), // baseball
  throws: z.enum(['L', 'R']).optional(), // baseball
  height: z.string().optional(), // e.g., "6-2"
  weight: z.number().optional(),
  dob: z.string().optional(), // ISO date
  hometown: z.string().optional(),
  highSchool: z.string().optional(),
  externalRefs: z.array(ExternalRefSchema).default([])
});

// Schedule/Game schema
export const ScheduleGameSchema = z.object({
  id: z.string(),
  leagueKey: LeagueKey,
  season: z.number(),
  gameDate: z.string(), // ISO datetime
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  homeScore: z.number().optional(),
  awayScore: z.number().optional(),
  venue: z.string().optional(),
  venueCity: z.string().optional(),
  venueState: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'final', 'postponed', 'cancelled']),
  week: z.number().optional(), // football
  inning: z.number().optional(), // baseball
  externalIds: z.record(z.string()).default({})
});

// Standings schema
export const StandingRowSchema = z.object({
  teamId: z.string(),
  season: z.number(),
  wins: z.number(),
  losses: z.number(),
  ties: z.number().optional(),
  pct: z.number(), // winning percentage
  gb: z.number().optional(), // games behind
  confRecord: z.string().optional(), // e.g., "5-3"
  divRecord: z.string().optional(),
  divisionRank: z.number().optional(),
  conferenceRank: z.number().optional(),
  last10: z.string().optional(), // e.g., "7-3"
  streak: z.string().optional(), // e.g., "W3"
  runsFor: z.number().optional(), // baseball
  runsAgainst: z.number().optional(),
  pointsFor: z.number().optional(), // football
  pointsAgainst: z.number().optional()
});

// Stats schema
export const StatlineSchema = z.object({
  entityType: z.enum(['player', 'team']),
  entityId: z.string(),
  scope: z.enum(['game', 'season', 'career']),
  gameId: z.string().optional(),
  season: z.number(),
  stats: z.record(z.union([z.string(), z.number()])), // flexible stats object
  source: z.string(),
  sourceUrl: z.string().url().optional(),
  asOf: z.string() // ISO datetime
});

// Link-out schema
export const LinkoutSchema = z.object({
  entityId: z.string(),
  entityType: z.enum(['team', 'player', 'staff', 'game']),
  label: z.string(),
  url: z.string().url(),
  sourceType: z.enum(['official', 'reference', 'recruiting', 'stats', 'news']),
  verified: z.boolean().default(false),
  lastChecked: z.string().optional()
});

// Depth chart schema
export const DepthChartSchema = z.object({
  teamId: z.string(),
  season: z.number(),
  week: z.number().optional(),
  positions: z.record(z.array(z.object({
    playerId: z.string(),
    depth: z.number() // 1 = starter, 2 = backup, etc.
  })))
});

// Metadata schema for tracking data freshness
export const MetadataSchema = z.object({
  league: LeagueKey,
  season: z.number(),
  lastUpdated: z.string(), // ISO datetime
  asOf: z.string(), // data currency date
  sources: z.array(z.string()),
  recordCounts: z.record(z.number()),
  version: z.string()
});

// Export types
export type League = z.infer<typeof LeagueSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type Staff = z.infer<typeof StaffSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type ScheduleGame = z.infer<typeof ScheduleGameSchema>;
export type StandingRow = z.infer<typeof StandingRowSchema>;
export type Statline = z.infer<typeof StatlineSchema>;
export type Linkout = z.infer<typeof LinkoutSchema>;
export type DepthChart = z.infer<typeof DepthChartSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type LeagueKeyType = z.infer<typeof LeagueKey>;

// Validator utilities
export const validators = {
  league: LeagueSchema,
  season: SeasonSchema,
  team: TeamSchema,
  staff: StaffSchema,
  player: PlayerSchema,
  scheduleGame: ScheduleGameSchema,
  standingRow: StandingRowSchema,
  statline: StatlineSchema,
  linkout: LinkoutSchema,
  depthChart: DepthChartSchema,
  metadata: MetadataSchema
};