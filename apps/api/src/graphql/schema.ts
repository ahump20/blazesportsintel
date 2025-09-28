/**
 * =============================================================================
 * BLAZE SPORTS INTELLIGENCE - GRAPHQL SCHEMA DEFINITION
 * =============================================================================
 * Comprehensive GraphQL schema for sports data and analytics
 * Optimized for real-time queries and complex sports relationships
 * =============================================================================
 */

import { gql } from 'graphql-tag';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # =============================================================================
  # CORE SPORTS TYPES
  # =============================================================================

  type Team {
    id: ID!
    name: String!
    city: String!
    sport: Sport!
    league: String!
    conference: String
    division: String
    logo: String
    colors: TeamColors
    founded: Int
    stadium: Stadium
    record: TeamRecord
    performance: TeamPerformance
    players: [Player!]!
    games: [Game!]!
    stats: TeamStats
    lastUpdated: DateTime!
  }

  type TeamColors {
    primary: String!
    secondary: String!
    accent: String
  }

  type Stadium {
    id: ID!
    name: String!
    city: String!
    state: String!
    capacity: Int
    surface: String
    roof: String
    coordinates: Coordinates
  }

  type Coordinates {
    latitude: Float!
    longitude: Float!
  }

  type TeamRecord {
    wins: Int!
    losses: Int!
    ties: Int
    winPercentage: Float!
    gamesBack: Float
    streak: String!
    homeRecord: Record
    awayRecord: Record
    divisionRecord: Record
    conferenceRecord: Record
  }

  type Record {
    wins: Int!
    losses: Int!
    ties: Int
    winPercentage: Float!
  }

  type TeamPerformance {
    offense: PerformanceMetrics
    defense: PerformanceMetrics
    specialTeams: PerformanceMetrics
    overall: Float!
    trend: PerformanceTrend!
    lastGame: GamePerformance
    seasonHighlights: [String!]!
  }

  type PerformanceMetrics {
    rating: Float!
    rank: Int
    percentile: Float
    keyStats: [KeyStat!]!
  }

  type KeyStat {
    name: String!
    value: Float!
    unit: String
    rank: Int
    percentile: Float
  }

  type PerformanceTrend {
    direction: TrendDirection!
    magnitude: Float!
    period: String!
    description: String!
  }

  enum TrendDirection {
    UP
    DOWN
    STABLE
    VOLATILE
  }

  type GamePerformance {
    gameId: ID!
    date: DateTime!
    opponent: String!
    result: GameResult!
    score: Score!
    keyStats: [KeyStat!]!
    highlights: [String!]!
  }

  type GameResult {
    outcome: GameOutcome!
    margin: Int!
    overtime: Boolean!
    notes: String
  }

  enum GameOutcome {
    WIN
    LOSS
    TIE
    POSTPONED
    CANCELLED
  }

  type Score {
    home: Int!
    away: Int!
    quarters: [QuarterScore!]
  }

  type QuarterScore {
    quarter: Int!
    home: Int!
    away: Int!
  }

  type TeamStats {
    season: SeasonStats
    career: CareerStats
    game: GameStats
    advanced: AdvancedStats
  }

  type SeasonStats {
    year: Int!
    games: Int!
    stats: JSON!
  }

  type CareerStats {
    totalGames: Int!
    stats: JSON!
  }

  type GameStats {
    gameId: ID!
    stats: JSON!
  }

  type AdvancedStats {
    efficiency: Float
    pace: Float
    strengthOfSchedule: Float
    pythagoreanWins: Float
    expectedWins: Float
  }

  # =============================================================================
  # PLAYER TYPES
  # =============================================================================

  type Player {
    id: ID!
    name: String!
    position: String!
    number: Int
    team: Team!
    height: String
    weight: Int
    age: Int
    experience: Int
    college: String
    hometown: String
    contract: Contract
    stats: PlayerStats
    performance: PlayerPerformance
    injuries: [Injury!]!
    transactions: [Transaction!]!
    lastUpdated: DateTime!
  }

  type Contract {
    value: Float
    years: Int
    guaranteed: Float
    expires: DateTime
    status: ContractStatus!
  }

  enum ContractStatus {
    ACTIVE
    EXPIRED
    OPTION
    RESTRICTED
    UNRESTRICTED
  }

  type PlayerStats {
    season: SeasonStats
    career: CareerStats
    game: GameStats
    advanced: AdvancedStats
    splits: PlayerSplits
  }

  type PlayerSplits {
    home: JSON
    away: JSON
    vsLeft: JSON
    vsRight: JSON
    clutch: JSON
    situational: JSON
  }

  type PlayerPerformance {
    overall: Float!
    offense: PerformanceMetrics
    defense: PerformanceMetrics
    trend: PerformanceTrend!
    projections: PlayerProjections
    fantasy: FantasyMetrics
    analytics: PlayerAnalytics
  }

  type PlayerProjections {
    nextGame: JSON
    restOfSeason: JSON
    career: JSON
    confidence: Float!
  }

  type FantasyMetrics {
    points: Float
    rank: Int
    value: Float
    trend: String
    ownership: Float
  }

  type PlayerAnalytics {
    efficiency: Float
    impact: Float
    consistency: Float
    clutch: Float
    potential: Float
  }

  type Injury {
    id: ID!
    type: String!
    bodyPart: String!
    severity: InjurySeverity!
    status: InjuryStatus!
    date: DateTime!
    expectedReturn: DateTime
    gamesMissed: Int
    description: String
  }

  enum InjurySeverity {
    MINOR
    MODERATE
    MAJOR
    SEASON_ENDING
  }

  enum InjuryStatus {
    ACTIVE
    QUESTIONABLE
    DOUBTFUL
    OUT
    IR
    PUP
  }

  type Transaction {
    id: ID!
    type: TransactionType!
    date: DateTime!
    from: String
    to: String
    details: String
    status: TransactionStatus!
  }

  enum TransactionType {
    TRADE
    SIGNING
    RELEASE
    WAIVER
    INJURY_RESERVE
    ACTIVATION
    SUSPENSION
  }

  enum TransactionStatus {
    PENDING
    COMPLETED
    CANCELLED
    VOIDED
  }

  # =============================================================================
  # GAME TYPES
  # =============================================================================

  type Game {
    id: ID!
    date: DateTime!
    homeTeam: Team!
    awayTeam: Team!
    venue: Stadium!
    status: GameStatus!
    score: Score
    weather: Weather
    officials: [Official!]!
    stats: GameStats
    plays: [Play!]!
    highlights: [Highlight!]!
    recap: String
    lastUpdated: DateTime!
  }

  enum GameStatus {
    SCHEDULED
    IN_PROGRESS
    FINAL
    POSTPONED
    CANCELLED
    SUSPENDED
  }

  type Weather {
    temperature: Int
    condition: String
    windSpeed: Int
    windDirection: String
    humidity: Int
    precipitation: Float
  }

  type Official {
    id: ID!
    name: String!
    position: String!
    experience: Int
  }

  type GameStats {
    home: TeamGameStats
    away: TeamGameStats
    game: JSON
  }

  type TeamGameStats {
    team: Team!
    stats: JSON!
  }

  type Play {
    id: ID!
    quarter: Int
    time: String
    down: Int
    distance: Int
    yardLine: Int
    description: String
    type: PlayType!
    result: PlayResult!
    players: [Player!]!
    stats: JSON
  }

  enum PlayType {
    PASS
    RUSH
    KICK
    PUNT
    FIELD_GOAL
    TOUCHDOWN
    SAFETY
    PENALTY
    TIMEOUT
    CHALLENGE
  }

  type PlayResult {
    yards: Int
    success: Boolean
    turnover: Boolean
    score: Boolean
    description: String
  }

  type Highlight {
    id: ID!
    title: String!
    description: String!
    videoUrl: String
    timestamp: DateTime!
    players: [Player!]!
    type: HighlightType!
    importance: Int!
  }

  enum HighlightType {
    TOUCHDOWN
    INTERCEPTION
    SACK
    CATCH
    RUN
    KICK
    PENALTY
    INJURY
    CELEBRATION
  }

  # =============================================================================
  # SPORTS-SPECIFIC TYPES
  # =============================================================================

  enum Sport {
    FOOTBALL
    BASKETBALL
    BASEBALL
    SOCCER
    HOCKEY
    TENNIS
    GOLF
    TRACK_AND_FIELD
    SWIMMING
    GYMNASTICS
  }

  # =============================================================================
  # ANALYTICS & FEATURES
  # =============================================================================

  type FeatureResult {
    name: String!
    value: Float!
    confidence: Float!
    computationTime: Int!
    dataQuality: Float!
    source: String!
    timestamp: DateTime!
    metadata: JSON
  }

  type AnalyticsDashboard {
    team: Team!
    features: [FeatureResult!]!
    performance: TeamPerformance!
    trends: [PerformanceTrend!]!
    projections: Projections!
    lastUpdated: DateTime!
  }

  type Projections {
    nextGame: GameProjection
    season: SeasonProjection
    playoffs: PlayoffProjection
  }

  type GameProjection {
    winProbability: Float!
    score: ProjectedScore!
    keyFactors: [String!]!
    confidence: Float!
  }

  type ProjectedScore {
    home: Int!
    away: Int!
    spread: Float!
    total: Float!
  }

  type SeasonProjection {
    wins: Int!
    losses: Int!
    playoffProbability: Float!
    championshipProbability: Float!
    keyMetrics: [KeyStat!]!
  }

  type PlayoffProjection {
    seed: Int
    probability: Float!
    path: [String!]!
    challenges: [String!]!
  }

  # =============================================================================
  # QUERY TYPES
  # =============================================================================

  type Query {
    # Team queries
    team(id: ID!): Team
    teams(sport: Sport, league: String, conference: String, division: String): [Team!]!
    teamStandings(sport: Sport!, league: String, conference: String, division: String): [Team!]!
    
    # Player queries
    player(id: ID!): Player
    players(teamId: ID, position: String, sport: Sport): [Player!]!
    playerStats(playerId: ID!, season: Int, gameId: ID): PlayerStats
    
    # Game queries
    game(id: ID!): Game
    games(teamId: ID, date: DateTime, status: GameStatus): [Game!]!
    liveGames: [Game!]!
    upcomingGames(teamId: ID, days: Int): [Game!]!
    
    # Analytics queries
    teamAnalytics(teamId: ID!): AnalyticsDashboard
    playerAnalytics(playerId: ID!): PlayerPerformance
    featureResult(featureName: String!, teamId: ID): FeatureResult
    featureResults(teamId: ID!): [FeatureResult!]!
    
    # Search queries
    search(query: String!, type: SearchType): [SearchResult!]!
    
    # Health and status
    health: HealthStatus
    systemStatus: SystemStatus
  }

  enum SearchType {
    TEAM
    PLAYER
    GAME
    ALL
  }

  type SearchResult {
    type: SearchType!
    id: ID!
    name: String!
    description: String
    relevance: Float!
  }

  type HealthStatus {
    status: String!
    timestamp: DateTime!
    services: [ServiceStatus!]!
    performance: PerformanceMetrics
  }

  type ServiceStatus {
    name: String!
    status: String!
    latency: Int
    uptime: Float
    lastCheck: DateTime!
  }

  type SystemStatus {
    version: String!
    uptime: Int!
    memory: MemoryStatus
    database: DatabaseStatus
    cache: CacheStatus
    api: ApiStatus
  }

  type MemoryStatus {
    used: String!
    total: String!
    percentage: Float!
  }

  type DatabaseStatus {
    connected: Boolean!
    latency: Int!
    queries: Int!
    errors: Int!
  }

  type CacheStatus {
    connected: Boolean!
    hitRate: Float!
    keys: Int!
    memory: String!
  }

  type ApiStatus {
    requests: Int!
    errors: Int!
    averageResponseTime: Float!
    uptime: Float!
  }

  # =============================================================================
  # MUTATION TYPES
  # =============================================================================

  type Mutation {
    # Data updates
    updateTeamStats(teamId: ID!, stats: JSON!): Team!
    updatePlayerStats(playerId: ID!, stats: JSON!): Player!
    updateGameScore(gameId: ID!, score: Score!): Game!
    
    # Feature computation
    computeFeature(featureName: String!, teamId: ID!, input: JSON!): FeatureResult!
    computeFeatures(teamId: ID!): [FeatureResult!]!
    
    # Cache management
    clearCache(pattern: String): Boolean!
    refreshData(teamId: ID!): Boolean!
    
    # System operations
    triggerUpdate(teamId: ID!): Boolean!
    recalculateAnalytics(teamId: ID!): Boolean!
  }

  # =============================================================================
  # SUBSCRIPTION TYPES
  # =============================================================================

  type Subscription {
    # Real-time updates
    gameUpdates(gameId: ID!): Game!
    teamUpdates(teamId: ID!): Team!
    playerUpdates(playerId: ID!): Player!
    
    # Analytics updates
    featureUpdates(teamId: ID!): FeatureResult!
    performanceUpdates(teamId: ID!): TeamPerformance!
    
    # System updates
    systemAlerts: SystemAlert!
    healthUpdates: HealthStatus!
  }

  type SystemAlert {
    id: ID!
    type: AlertType!
    severity: AlertSeverity!
    message: String!
    timestamp: DateTime!
    resolved: Boolean!
  }

  enum AlertType {
    PERFORMANCE
    ERROR
    WARNING
    INFO
    MAINTENANCE
  }

  enum AlertSeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }
`;

// =============================================================================
// RESOLVER TYPES
// =============================================================================

export interface ResolverContext {
  user?: any;
  redis: any;
  ip: string;
  userAgent: string;
}

export interface TeamResolver {
  id: string;
  name: string;
  city: string;
  sport: string;
  league: string;
  conference?: string;
  division?: string;
  logo?: string;
  colors?: {
    primary: string;
    secondary: string;
    accent?: string;
  };
  founded?: number;
  stadium?: any;
  record?: any;
  performance?: any;
  players?: any[];
  games?: any[];
  stats?: any;
  lastUpdated: string;
}

export interface PlayerResolver {
  id: string;
  name: string;
  position: string;
  number?: number;
  team: any;
  height?: string;
  weight?: number;
  age?: number;
  experience?: number;
  college?: string;
  hometown?: string;
  contract?: any;
  stats?: any;
  performance?: any;
  injuries?: any[];
  transactions?: any[];
  lastUpdated: string;
}

export interface GameResolver {
  id: string;
  date: string;
  homeTeam: any;
  awayTeam: any;
  venue: any;
  status: string;
  score?: any;
  weather?: any;
  officials?: any[];
  stats?: any;
  plays?: any[];
  highlights?: any[];
  recap?: string;
  lastUpdated: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function createGraphQLSchema() {
  return {
    typeDefs,
    resolvers: {
      // Resolvers would be implemented here
      Query: {
        team: () => null,
        teams: () => [],
        player: () => null,
        players: () => [],
        game: () => null,
        games: () => [],
        teamAnalytics: () => null,
        health: () => null
      },
      Mutation: {
        updateTeamStats: () => null,
        computeFeature: () => null,
        clearCache: () => false
      },
      Subscription: {
        gameUpdates: () => null,
        teamUpdates: () => null,
        featureUpdates: () => null
      }
    }
  };
}

export default typeDefs;