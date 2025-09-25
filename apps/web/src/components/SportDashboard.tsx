import React from 'react';
import type { DashboardFeed, SportKey } from '../types';
import { formatLocalTime } from '../utils/time';
import { IntelStream } from './IntelStream';
import { LiveGamesPanel } from './LiveGamesPanel';
import { MetricCard } from './MetricCard';
import { PlayerSpotlights } from './PlayerSpotlights';
import { PredictiveModels } from './PredictiveModels';
import { TacticalAngles } from './TacticalAngles';
import { TrendSignals } from './TrendSignals';
import { UpcomingEvents } from './UpcomingEvents';

const sportThemes: Record<SportKey, { accent: string; accentSoft: string; glow: string }> = {
  baseball: { accent: '#ff7a3d', accentSoft: 'rgba(255, 122, 61, 0.12)', glow: 'rgba(255, 122, 61, 0.18)' },
  football: { accent: '#22e0b2', accentSoft: 'rgba(34, 224, 178, 0.12)', glow: 'rgba(34, 224, 178, 0.18)' },
  basketball: { accent: '#ffc54a', accentSoft: 'rgba(255, 197, 74, 0.12)', glow: 'rgba(255, 197, 74, 0.18)' },
  track: { accent: '#ff66d8', accentSoft: 'rgba(255, 102, 216, 0.12)', glow: 'rgba(255, 102, 216, 0.18)' },
};

type SportDashboardProps = {
  sport: SportKey;
  feed: DashboardFeed;
};

export function SportDashboard({ sport, feed }: SportDashboardProps) {
  const theme = sportThemes[sport];
  const { data, status, source, lastUpdated, error } = feed;

  return (
    <div className="sport-dashboard" data-sport={sport}>
      <section className="sport-dashboard__hero" style={{ borderColor: theme.accentSoft, boxShadow: `0 24px 48px -28px ${theme.glow}` }}>
        <div>
          <span className="sport-dashboard__badge" style={{ background: theme.accentSoft, color: theme.accent }}>
            {data.hero.badge}
          </span>
          <h2>{data.hero.title}</h2>
          <p className="sport-dashboard__subtitle">{data.hero.subtitle}</p>
        </div>
        <aside className="sport-dashboard__context">
          <p>{data.hero.context}</p>
          <dl className="sport-dashboard__meta">
            <div>
              <dt>Status</dt>
              <dd className={`sport-dashboard__status sport-dashboard__status--${status}`}>
                {status === 'loading' ? 'Syncing live data…' : status === 'error' ? 'Live feed unavailable, using fallback' : 'Live data hydrated'}
              </dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{source === 'remote' ? 'Live feed' : 'Simulated fallback'}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatLocalTime(lastUpdated)}</dd>
            </div>
          </dl>
          {error ? <p className="sport-dashboard__error">{error}</p> : null}
        </aside>
      </section>

      <section className="sport-dashboard__metrics">
        {data.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} accent={theme.accent} />
        ))}
      </section>

      <div className="sport-dashboard__live-row">
        <LiveGamesPanel games={data.liveGames} accent={theme.accent} />
        <IntelStream items={data.intelStream} />
      </div>

      <div className="sport-dashboard__grid">
        <PlayerSpotlights spotlights={data.playerSpotlights} accent={theme.accent} />
        <PredictiveModels models={data.predictiveModels} accent={theme.accent} />
        <TrendSignals signals={data.trendSignals} />
        <UpcomingEvents events={data.upcomingEvents} />
        <TacticalAngles angles={data.tacticalAngles} />
      </div>
    </div>
  );
}
