import { z } from 'zod';

// Core entity schemas
export const LeagueSchema = z.object({
  key: z.enum(['nfl', 'mlb', 'ncaa_fb', 'college_bb', 'tx_hs_fb', 'pg_tx']),
  name: z.string(),
  level: z.string(),
  governingBody: z.string(),
  asOf: z.string().datetime()
});

export const SeasonSchema = z.object({
  leagueKey: LeagueSchema.shape.key,
  year: z.number(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  status: z.enum(['preseason', 'regular', 'postseason', 'offseason']),
  asOf: z.string().datetime()
});

export const TeamSchema = z.object({
  id: z.string(),
  leagueKey: LeagueSchema.shape.key,
  season: z.number(),
  name: z.string(),
  nickname: z.string(),
  city: z.string(),
  state: z.string(),
  conference: z.string().optional(),
  division: z.string().optional(),
  district: z.string().optional(),
  siteUrl: z.string().url().optional(),
  social: z.record(z.string()).optional(),
  externalRefs: z.array(z.object({
    source: z.string(),
    id: z.string(),
    url: z.string().url()
  })),
  asOf: z.string().datetime()
});

export const StaffSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  role: z.string(),
  name: z.string(),
  headCoach: z.boolean(),
  hireDate: z.string().date().optional(),
  externalRefs: z.array(z.object({
    source: z.string(),
    url: z.string().url()
  })),
  asOf: z.string().datetime()
});

export const PlayerSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  name: z.string(),
  position: z.string(),
  classOrLevel: z.string(),
  jersey: z.string().optional(),
  bats: z.enum(['R', 'L', 'S']).optional(),
  throws: z.enum(['R', 'L']).optional(),
  height: z.string().optional(),
  weight: z.number().optional(),
  dob: z.string().date().optional(),
  hometown: z.string().optional(),
  externalRefs: z.array(z.object({
    source: z.string(),
    id: z.string(),
    url: z.string().url()
  })),
  asOf: z.string().datetime()
});

export const ScheduleGameSchema = z.object({
  id: z.string(),
  leagueKey: LeagueSchema.shape.key,
  season: z.number(),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  startTime: z.string().datetime(),
  venue: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'final', 'postponed', 'cancelled']),
  externalIds: z.record(z.string()),
  asOf: z.string().datetime()
});

export const StandingRowSchema = z.object({
  teamId: z.string(),
  wins: z.number(),
  losses: z.number(),
  ties: z.number().optional(),
  pct: z.number(),
  gb: z.number().optional(),
  confRecord: z.string().optional(),
  divisionRank: z.number().optional(),
  last10: z.string().optional(),
  streak: z.string().optional(),
  asOf: z.string().datetime()
});

export const LinkoutSchema = z.object({
  entityId: z.string(),
  label: z.string(),
  url: z.string().url(),
  sourceType: z.enum(['official', 'reference', 'recruiting']),
  verified: z.boolean(),
  asOf: z.string().datetime()
});

// Type exports
export type League = z.infer<typeof LeagueSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type Staff = z.infer<typeof StaffSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type ScheduleGame = z.infer<typeof ScheduleGameSchema>;
export type StandingRow = z.infer<typeof StandingRowSchema>;
export type Linkout = z.infer<typeof LinkoutSchema>;
