/**
 * Blaze Sports Intel - Unified Schema Definitions
 * Texas-inspired sports intelligence platform
 */

import { z } from 'zod';

// ===== Base Entities =====

export const LeagueSchema = z.object({
  id: z.string(),
  slug: z.enum(['nfl', 'mlb', 'nba', 'ncaa_fb', 'ncaa_bb', 'college_baseball', 'tx_hs_fb', 'pg_baseball']),
  name: z.string(),
  sport: z.enum(['football', 'baseball', 'basketball']),
  level: z.enum(['professional', 'college', 'high_school', 'youth']),
  region: z.string().optional(),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url(),
  dataSource: z.string(),
  active: z.boolean().default(true)
});

export const SeasonSchema = z.object({
  id: z.string(),
  leagueId: z.string(),
  year: z.number(),
  type: z.enum(['regular', 'postseason', 'preseason', 'spring', 'summer', 'fall']),
  name: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  currentWeek: z.number().optional(),
  isActive: z.boolean().default(false)
});

export const TeamSchema = z.object({
  id: z.string(),
  leagueId: z.string(),
  seasonId: z.string(),
  slug: z.string(),
  name: z.string(),
  displayName: z.string(),
  abbreviation: z.string(),
  location: z.object({
    city: z.string(),
    state: z.string(),
    venue: z.string().optional()
  }),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string().optional()
  }),
  logos: z.object({
    primary: z.string().url(),
    secondary: z.string().url().optional(),
    wordmark: z.string().url().optional()
  }),
  conference: z.string().optional(),
  division: z.string().optional(),
  coachingStaff: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    photoUrl: z.string().url().optional()
  })).optional(),
  externalRefs: z.object({
    official: z.string().url(),
    espn: z.string().url().optional(),
    sportsReference: z.string().url().optional(),
    perfectGame: z.string().url().optional(),
    dctf: z.string().url().optional()
  }),
  metadata: z.record(z.any()).optional()
});

export const PlayerSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  seasonId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string(),
  jerseyNumber: z.string().optional(),
  position: z.string(),
  positionGroup: z.string().optional(),
  height: z.string().optional(),
  weight: z.number().optional(),
  birthDate: z.string().date().optional(),
  hometown: z.object({
    city: z.string(),
    state: z.string(),
    highSchool: z.string().optional()
  }).optional(),
  class: z.enum(['freshman', 'sophomore', 'junior', 'senior', 'graduate']).optional(),
  eligibility: z.object({
    yearsRemaining: z.number(),
    redshirt: z.boolean(),
    medicalRedshirt: z.boolean().optional()
  }).optional(),
  recruiting: z.object({
    stars: z.number().min(1).max(5).optional(),
    nationalRank: z.number().optional(),
    positionRank: z.number().optional(),
    stateRank: z.number().optional(),
    committedDate: z.string().date().optional(),
    otherOffers: z.array(z.string()).optional()
  }).optional(),
  nil: z.object({
    valuation: z.number().optional(),
    deals: z.number().optional(),
    socialFollowers: z.record(z.number()).optional()
  }).optional(),
  photoUrl: z.string().url().optional(),
  externalRefs: z.object({
    espn: z.string().url().optional(),
    sportsReference: z.string().url().optional(),
    perfectGame: z.string().url().optional(),
    twofourseven: z.string().url().optional(),
    rivals: z.string().url().optional()
  }),
  active: z.boolean().default(true)
});

// ===== Game & Schedule =====

export const GameSchema = z.object({
  id: z.string(),
  leagueId: z.string(),
  seasonId: z.string(),
  week: z.number().optional(),
  gameDate: z.string().datetime(),
  gameType: z.enum(['regular', 'playoff', 'championship', 'exhibition']),
  homeTeam: z.object({
    id: z.string(),
    name: z.string(),
    abbreviation: z.string(),
    score: z.number().optional(),
    record: z.object({
      wins: z.number(),
      losses: z.number(),
      ties: z.number().optional()
    }).optional()
  }),
  awayTeam: z.object({
    id: z.string(),
    name: z.string(),
    abbreviation: z.string(),
    score: z.number().optional(),
    record: z.object({
      wins: z.number(),
      losses: z.number(),
      ties: z.number().optional()
    }).optional()
  }),
  venue: z.object({
    name: z.string(),
    city: z.string(),
    state: z.string(),
    capacity: z.number().optional()
  }),
  weather: z.object({
    temperature: z.number(),
    conditions: z.string(),
    wind: z.string().optional()
  }).optional(),
  status: z.enum(['scheduled', 'in_progress', 'final', 'postponed', 'cancelled']),
  period: z.string().optional(),
  clock: z.string().optional(),
  broadcast: z.array(z.string()).optional(),
  attendance: z.number().optional(),
  odds: z.object({
    spread: z.number(),
    overUnder: z.number(),
    moneylineHome: z.number(),
    moneylineAway: z.number()
  }).optional(),
  externalRefs: z.object({
    espn: z.string().url().optional(),
    official: z.string().url().optional()
  })
});

// ===== Statistics =====

export const StandingSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  seasonId: z.string(),
  conference: z.string().optional(),
  division: z.string().optional(),
  rank: z.number(),
  wins: z.number(),
  losses: z.number(),
  ties: z.number().optional(),
  winPercentage: z.number(),
  gamesBack: z.number().optional(),
  conferenceRecord: z.object({
    wins: z.number(),
    losses: z.number()
  }).optional(),
  divisionRecord: z.object({
    wins: z.number(),
    losses: z.number()
  }).optional(),
  homeRecord: z.object({
    wins: z.number(),
    losses: z.number()
  }),
  awayRecord: z.object({
    wins: z.number(),
    losses: z.number()
  }),
  streak: z.string(),
  lastTen: z.object({
    wins: z.number(),
    losses: z.number()
  }).optional(),
  pointsFor: z.number().optional(),
  pointsAgainst: z.number().optional(),
  differential: z.number().optional()
});

export const PlayerStatsSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  gameId: z.string().optional(),
  seasonId: z.string(),
  statsType: z.enum(['game', 'season', 'career']),

  // Baseball Stats
  batting: z.object({
    ab: z.number(),
    r: z.number(),
    h: z.number(),
    rbi: z.number(),
    bb: z.number(),
    so: z.number(),
    avg: z.number(),
    obp: z.number(),
    slg: z.number(),
    ops: z.number(),
    hr: z.number(),
    sb: z.number()
  }).optional(),

  pitching: z.object({
    w: z.number(),
    l: z.number(),
    era: z.number(),
    g: z.number(),
    gs: z.number(),
    sv: z.number(),
    ip: z.number(),
    h: z.number(),
    r: z.number(),
    er: z.number(),
    bb: z.number(),
    so: z.number(),
    whip: z.number()
  }).optional(),

  // Football Stats
  passing: z.object({
    attempts: z.number(),
    completions: z.number(),
    yards: z.number(),
    touchdowns: z.number(),
    interceptions: z.number(),
    rating: z.number()
  }).optional(),

  rushing: z.object({
    attempts: z.number(),
    yards: z.number(),
    average: z.number(),
    touchdowns: z.number(),
    long: z.number()
  }).optional(),

  receiving: z.object({
    receptions: z.number(),
    yards: z.number(),
    average: z.number(),
    touchdowns: z.number(),
    targets: z.number()
  }).optional(),

  defense: z.object({
    tackles: z.number(),
    assists: z.number(),
    sacks: z.number(),
    interceptions: z.number(),
    forcedFumbles: z.number(),
    passDeflections: z.number()
  }).optional(),

  // Basketball Stats
  basketball: z.object({
    points: z.number(),
    rebounds: z.number(),
    assists: z.number(),
    steals: z.number(),
    blocks: z.number(),
    turnovers: z.number(),
    fouls: z.number(),
    minutes: z.number(),
    fgm: z.number(),
    fga: z.number(),
    fgPct: z.number(),
    threePm: z.number(),
    threePa: z.number(),
    threePct: z.number(),
    ftm: z.number(),
    fta: z.number(),
    ftPct: z.number()
  }).optional()
});

// ===== Recruiting & NIL =====

export const RecruitingProfileSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  graduationYear: z.number(),
  position: z.string(),
  height: z.string(),
  weight: z.number(),
  fortyTime: z.number().optional(),
  benchPress: z.number().optional(),
  squat: z.number().optional(),
  vertical: z.number().optional(),
  broadJump: z.number().optional(),
  shuttleTime: z.number().optional(),
  threeConeDrill: z.number().optional(),
  gpa: z.number().optional(),
  satScore: z.number().optional(),
  actScore: z.number().optional(),
  highlights: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    views: z.number().optional()
  })),
  offers: z.array(z.object({
    schoolId: z.string(),
    schoolName: z.string(),
    date: z.string().date(),
    status: z.enum(['offered', 'visiting', 'committed', 'signed', 'declined'])
  })),
  rankings: z.object({
    composite: z.number().optional(),
    twofourseven: z.number().optional(),
    rivals: z.number().optional(),
    espn: z.number().optional(),
    on3: z.number().optional()
  }),
  socialMedia: z.object({
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    tiktok: z.string().optional()
  }),
  perfectGameProfile: z.object({
    pgId: z.string(),
    pgGrade: z.number().optional(),
    velocity: z.number().optional(),
    exitVelocity: z.number().optional()
  }).optional()
});

export const NILValuationSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  timestamp: z.string().datetime(),
  valuation: z.number(),
  methodology: z.enum(['social', 'performance', 'market', 'composite']),
  factors: z.object({
    socialReach: z.number(),
    engagementRate: z.number(),
    performanceScore: z.number(),
    marketSize: z.number(),
    brandFit: z.number()
  }),
  deals: z.array(z.object({
    brandName: z.string(),
    dealType: z.enum(['endorsement', 'appearance', 'social', 'merchandise', 'other']),
    estimatedValue: z.number().optional(),
    duration: z.string().optional()
  })),
  projectedGrowth: z.number(),
  comparables: z.array(z.string())
});

// ===== Export Types =====

export type League = z.infer<typeof LeagueSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type Game = z.infer<typeof GameSchema>;
export type Standing = z.infer<typeof StandingSchema>;
export type PlayerStats = z.infer<typeof PlayerStatsSchema>;
export type RecruitingProfile = z.infer<typeof RecruitingProfileSchema>;
export type NILValuation = z.infer<typeof NILValuationSchema>;