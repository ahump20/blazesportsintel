export type BaseballGame = {
  sport: 'baseball';
  team: string;
  opponent: string;
  date: string; // YYYY-MM-DD
};

export type FootballGame = {
  sport: 'football';
  team: string;
  opponent: string;
  date: string;
};

export type BasketballGame = {
  sport: 'basketball';
  team: string;
  opponent: string;
  date: string;
};

export type TrackEvent = {
  sport: 'track_and_field';
  meet: string;
  event: string;
  date: string;
};
