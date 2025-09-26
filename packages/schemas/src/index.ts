/**
 * Blaze Sports Intelligence - Canonical Data Schemas
 * TypeScript schemas for all sports entities
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const ExternalRefSchema = z.object({
  type: z.string(),
  id: z.string(),
  url: z.string().url().optional()
});

export const LocationSchema = z.object({
  city: z.string(),
  state: z.string(),
  country: z.string().default('USA'),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

export const ContactSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  socialMedia: z.object({
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    tiktok: z.string().optional(),
    youtube: z.string().optional()
  }).optional()
});

// ============================================================================
// LEAGUE SCHEMA
// ============================================================================

export const LeagueSchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string().optional(),
  sport: z.enum(['football', 'baseball', 'basketball', 'track']),
  level: z.enum(['professional', 'college', 'high-school', 'youth']),
  jurisdiction: z.string(), // e.g., 'Texas', 'NCAA', 'MLB'
  website: z.string().url().optional(),
  established: z.number().optional(),
  commissioner: z.string().optional(),
  seasonType: z.enum(['annual', 'academic', 'calendar']),
  externalRefs: z.array(ExternalRefSchema)
});

// ============================================================================
// SEASON SCHEMA
// ============================================================================

export const SeasonSchema = z.object({
  id: z.string(),
  leagueId: z.string(),
  year: z.number(),
  startDate: z.string(), // ISO 8601
  endDate: z.string(), // ISO 8601
  isActive: z.boolean(),
  type: z.enum(['regular', 'preseason', 'postseason', 'tournament']),
  divisions: z.array(z.string()).optional(),
  totalTeams: z.number(),
  totalGames: z.number().optional(),
  playoffFormat: z.string().optional()
});

// ============================================================================
// TEAM SCHEMA
// ============================================================================

export const TeamSchema = z.object({
  id: z.string(),
  leagueId: z.string(),
  name: z.string(),
  displayName: z.string(),
  abbreviation: z.string().optional(),
  nickname: z.string().optional(), // e.g., "Cardinals", "Longhorns"
  mascot: z.string().optional(),

  // Location
  location: LocationSchema,
  venue: z.string().optional(),
  venueCapacity: z.number().optional(),

  // Organization
  conference: z.string().optional(),
  division: z.string().optional(),
  district: z.string().optional(), // For high school
  classification: z.string().optional(), // e.g., "6A-I", "Division I"

  // Branding
  colors: z.array(z.string()).optional(),
  logo: z.string().url().optional(),

  // Leadership
  headCoach: z.string().optional(),
  assistantCoaches: z.array(z.string()).optional(),
  athleticDirector: z.string().optional(),

  // Contact
  contact: ContactSchema.optional(),

  // Metadata
  founded: z.number().optional(),
  enrollment: z.number().optional(), // For schools
  isActive: z.boolean().default(true),

  externalRefs: z.array(ExternalRefSchema)
});

// ============================================================================
// STAFF SCHEMA
// ============================================================================

export const StaffSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string(),
  role: z.enum(['head-coach', 'assistant-coach', 'coordinator', 'trainer', 'manager']),
  specialization: z.string().optional(), // e.g., "Offensive Coordinator", "Pitching Coach"
  experience: z.number().optional(), // Years
  previousPositions: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  externalRefs: z.array(ExternalRefSchema)
});

// ============================================================================
// PLAYER SCHEMA
// ============================================================================

export const PlayerSchema = z.object({
  id: z.string(),
  teamId: z.string(),

  // Identity
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string(),
  jerseyNumber: z.number().optional(),

  // Position
  primaryPosition: z.string(),
  secondaryPositions: z.array(z.string()).optional(),

  // Physical
  height: z.string().optional(), // e.g., "6-2"
  weight: z.number().optional(),
  age: z.number().optional(),
  birthDate: z.string().optional(),
  birthPlace: LocationSchema.optional(),

  // Academic (for students)
  graduationYear: z.number().optional(),
  classification: z.enum(['Freshman', 'Sophomore', 'Junior', 'Senior']).optional(),
  gpa: z.number().optional(),

  // Athletic Info
  batsThrows: z.string().optional(), // e.g., "R/R", "L/L" (baseball)
  experience: z.number().optional(), // Years
  eligibilityRemaining: z.number().optional(),

  // Status
  isActive: z.boolean().default(true),
  injuryStatus: z.string().optional(),

  // Performance
  currentSeasonStats: z.record(z.union([z.string(), z.number()])).optional(),
  careerStats: z.record(z.union([z.string(), z.number()])).optional(),

  externalRefs: z.array(ExternalRefSchema)
});

// ============================================================================
// GAME SCHEMA
// ============================================================================

export const GameSchema = z.object({
  id: z.string(),
  leagueId: z.string(),
  seasonId: z.string(),

  // Basic Info
  date: z.string(), // ISO 8601
  time: z.string().optional(),
  week: z.number().optional(),
  gameNumber: z.number().optional(),

  // Teams
  homeTeamId: z.string(),
  awayTeamId: z.string(),

  // Venue
  venue: z.string(),
  venueId: z.string().optional(),
  location: LocationSchema.optional(),

  // Status
  status: z.enum(['scheduled', 'delayed', 'in-progress', 'final', 'cancelled', 'postponed']),
  period: z.string().optional(), // e.g., "3rd Quarter", "7th Inning"
  clock: z.string().optional(),

  // Score
  homeScore: z.number().nullable().optional(),
  awayScore: z.number().nullable().optional(),

  // Game Type
  gameType: z.enum(['exhibition', 'regular', 'conference', 'district', 'playoff', 'championship']),
  importance: z.enum(['low', 'medium', 'high', 'critical']).optional(),

  // Conditions
  weather: z.object({
    temperature: z.number().optional(),
    condition: z.string().optional(),
    windSpeed: z.number().optional(),
    windDirection: z.string().optional(),
    humidity: z.number().optional()
  }).optional(),

  // Attendance
  attendance: z.number().optional(),

  // Media
  broadcast: z.object({
    tv: z.string().optional(),
    radio: z.string().optional(),
    stream: z.string().optional()
  }).optional(),

  // Officials
  officials: z.array(z.object({
    name: z.string(),
    position: z.string()
  })).optional(),

  externalRefs: z.array(ExternalRefSchema)
});

// ============================================================================
// STANDINGS SCHEMA
// ============================================================================

export const StandingRowSchema = z.object({
  teamId: z.string(),

  // Position
  rank: z.number(),

  // Record
  wins: z.number(),
  losses: z.number(),
  ties: z.number().default(0),
  winPercentage: z.number(),

  // Context
  conferenceWins: z.number().optional(),
  conferenceLosses: z.number().optional(),
  districtWins: z.number().optional(),
  districtLosses: z.number().optional(),
  divisionWins: z.number().optional(),
  divisionLosses: z.number().optional(),

  // Position Metrics
  gamesBack: z.number().optional(),
  pointsFor: z.number().optional(),
  pointsAgainst: z.number().optional(),
  pointDifferential: z.number().optional(),

  // Streak
  streak: z.string().optional(), // e.g., "W3", "L1"
  last10: z.string().optional(), // e.g., "7-3"

  // Advanced
  strengthOfSchedule: z.number().optional(),
  rpi: z.number().optional(), // Ratings Percentage Index

  // Playoff Status
  playoffPosition: z.enum(['qualified', 'contention', 'eliminated']).optional(),

  lastUpdated: z.string()
});

// ============================================================================
// STATLINE SCHEMA
// ============================================================================

export const StatlineSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  gameId: z.string(),
  teamId: z.string(),

  // Context
  sport: z.enum(['football', 'baseball', 'basketball', 'track']),
  statType: z.enum(['game', 'season', 'career']),

  // Statistics (flexible - sport-specific)
  stats: z.record(z.union([z.string(), z.number(), z.boolean()])),

  // Advanced Metrics
  advancedStats: z.record(z.union([z.string(), z.number()])).optional(),

  // Performance Rating
  performanceGrade: z.string().optional(), // e.g., "A+", "B-"

  lastUpdated: z.string()
});

// ============================================================================
// LINKOUT SCHEMA
// ============================================================================

export const LinkoutSchema = z.object({
  id: z.string(),
  entityId: z.string(),
  entityType: z.enum(['team', 'player', 'game', 'league']),

  // Link Details
  title: z.string(),
  url: z.string().url(),
  description: z.string().optional(),

  // Source
  source: z.string(), // e.g., "Baseball Reference", "Dave Campbell's"
  sourceType: z.enum(['official', 'stats', 'news', 'social', 'recruiting']),

  // Metadata
  isVerified: z.boolean().default(false),
  lastChecked: z.string().optional(),

  // Priority for display
  priority: z.number().default(1), // 1-10, higher = more important

  externalRefs: z.array(ExternalRefSchema)
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ExternalRef = z.infer<typeof ExternalRefSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type League = z.infer<typeof LeagueSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type Staff = z.infer<typeof StaffSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type Game = z.infer<typeof GameSchema>;
export type StandingRow = z.infer<typeof StandingRowSchema>;
export type Statline = z.infer<typeof StatlineSchema>;
export type Linkout = z.infer<typeof LinkoutSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const validateEntity = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const isValidEntity = <T>(schema: z.ZodSchema<T>, data: unknown): boolean => {
  try {
    schema.parse(data);
    return true;
  } catch {
    return false;
  }
};