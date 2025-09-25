import React from 'react';
import type { PlayerSpotlight } from '../types';
import { TrendSparkline } from './TrendSparkline';

type PlayerSpotlightsProps = {
  spotlights: PlayerSpotlight[];
  accent: string;
};

export function PlayerSpotlights({ spotlights, accent }: PlayerSpotlightsProps) {
  if (!spotlights.length) {
    return null;
  }

  return (
    <section className="panel spotlights">
      <header className="panel__header">
        <h3>Player spotlight</h3>
        <span className="panel__meta">Form + projection outlook</span>
      </header>
      <div className="spotlights__grid">
        {spotlights.map((player) => (
          <article key={player.id} className="spotlight-card">
            <header className="spotlight-card__header">
              <div>
                <h4>{player.name}</h4>
                <span className="spotlight-card__meta">
                  {player.team} • {player.position}
                </span>
              </div>
              {player.age ? <span className="spotlight-card__age">Age {player.age}</span> : null}
            </header>
            <TrendSparkline data={player.trendSpark} accent={accent} id={player.id} />
            <p className="spotlight-card__projection">{player.projection}</p>
            <ul className="spotlight-card__metrics">
              {player.metrics.map((metric) => (
                <li key={`${player.id}-${metric.label}`}>
                  <span className="spotlight-card__metric-label">{metric.label}</span>
                  <span className="spotlight-card__metric-value">{metric.value}</span>
                  <span className="spotlight-card__metric-context">{metric.context}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
