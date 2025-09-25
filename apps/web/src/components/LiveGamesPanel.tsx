import React from 'react';
import type { LiveGame } from '../types';
import { formatEventDate, formatLocalTime } from '../utils/time';

type LiveGamesPanelProps = {
  games: LiveGame[];
  accent: string;
};

function statusLabel(game: LiveGame): string {
  if (game.status === 'live') {
    return `LIVE${game.clock ? ` • ${game.clock}` : ''}`;
  }
  if (game.status === 'final') {
    return 'Final';
  }
  return `Starts ${formatLocalTime(game.startTime)}`;
}

function formatWinProb(value: number): string {
  return `${Math.round(value)}%`;
}

export function LiveGamesPanel({ games, accent }: LiveGamesPanelProps) {
  if (!games.length) {
    return null;
  }

  return (
    <section className="panel live-games">
      <header className="panel__header">
        <h3>Live board</h3>
        <span className="panel__meta">{games.length} tracked matchups</span>
      </header>
      <div className="live-games__list">
        {games.map((game) => (
          <article key={game.id} className={`live-game live-game--${game.status}`}>
            <div className="live-game__top">
              <div>
                <span className="live-game__matchup">{game.matchup}</span>
                <span className="live-game__league">{game.league}</span>
              </div>
              <span className={`live-game__status live-game__status--${game.status}`}>{statusLabel(game)}</span>
            </div>
            <div className="live-game__meta">
              <span>{formatEventDate(game.startTime)}</span>
              <span>{game.venue}</span>
              <span>{game.broadcast}</span>
            </div>
            <div className="live-game__scores">
              {[game.teams.away, game.teams.home].map((team, idx) => (
                <div key={team.abbreviation} className="live-game__team">
                  <div className="live-game__team-label">
                    <span className="live-game__team-name">{team.name}</span>
                    <span className="live-game__team-record">{team.record}</span>
                  </div>
                  <span className="live-game__score">{team.score}</span>
                  <span className="live-game__prob">Win {formatWinProb(team.winProb)}</span>
                </div>
              ))}
            </div>
            <div className="live-game__prob-bar" aria-hidden="true">
              <span
                className="live-game__prob-away"
                style={{ width: `${game.teams.away.winProb}%`, background: 'rgba(255,255,255,0.12)' }}
              />
              <span
                className="live-game__prob-home"
                style={{ width: `${game.teams.home.winProb}%`, background: accent }}
              />
            </div>
            <ul className="live-game__performers">
              {game.topPerformers.map((perf) => (
                <li key={`${game.id}-${perf.team}-${perf.name}`}>
                  <span className="live-game__performer-name">{perf.name}</span>
                  <span className="live-game__performer-note">
                    {perf.metric}: {perf.value}
                  </span>
                  <span className={`live-game__performer-trend live-game__performer-trend--${perf.trend}`}>{perf.trend}</span>
                  <span className="live-game__performer-meta">{perf.note}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
