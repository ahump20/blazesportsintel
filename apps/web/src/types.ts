export type SportKey = 'baseball' | 'football' | 'basketball' | 'track';

export type TrendDirection = 'up' | 'down' | 'steady';

export type MetricSummary = {
  id: string;
  label: string;
  value: string;
  change: number;
  trend: TrendDirection;
  context: string;
  sparkline: number[];
};

export type GameTeam = {
  name: string;
  abbreviation: string;
  record: string;
  score: number;
  winProb: number;
};

export type GamePerformer = {
  name: string;
  team: string;
  metric: string;
  value: string;
  trend: TrendDirection;
  note: string;
};

export type LiveGame = {
  id: string;
  matchup: string;
  league: string;
  startTime: string;
  status: 'pre' | 'live' | 'final';
  clock?: string;
  venue: string;
  broadcast: string;
  teams: {
    home: GameTeam;
    away: GameTeam;
  };
  topPerformers: GamePerformer[];
};

export type SpotlightMetric = {
  label: string;
  value: string;
  context: string;
};

export type PlayerSpotlight = {
  id: string;
  name: string;
  team: string;
  position: string;
  age?: number;
  projection: string;
  trendSpark: number[];
  metrics: SpotlightMetric[];
};

export type PredictiveModel = {
  id: string;
  name: string;
  projection: string;
  edge: string;
  confidence: number;
  insight: string;
};

export type UpcomingEvent = {
  id: string;
  name: string;
  start: string;
  location: string;
  stage: string;
  watch: string;
  storyline: string;
};

export type IntelPulseItem = {
  id: string;
  timestamp: string;
  headline: string;
  detail: string;
  impact: 'low' | 'medium' | 'high';
};

export type TacticalAngle = {
  id: string;
  title: string;
  summary: string;
  stat: string;
  confidence: number;
};

export type TrendSignal = {
  id: string;
  label: string;
  current: string;
  baseline: string;
  delta: number;
  direction: TrendDirection;
};

export type SportDashboardData = {
  sport: SportKey;
  generatedAt: string;
  hero: {
    title: string;
    subtitle: string;
    badge: string;
    context: string;
  };
  metrics: MetricSummary[];
  liveGames: LiveGame[];
  playerSpotlights: PlayerSpotlight[];
  predictiveModels: PredictiveModel[];
  upcomingEvents: UpcomingEvent[];
  intelStream: IntelPulseItem[];
  tacticalAngles: TacticalAngle[];
  trendSignals: TrendSignal[];
};

export type DashboardFeed = {
  data: SportDashboardData;
  source: 'remote' | 'fallback';
  lastUpdated: string;
  status: 'loading' | 'ready' | 'error';
  error?: string;
};
