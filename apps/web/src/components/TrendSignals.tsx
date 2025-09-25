import React from 'react';
import type { TrendSignal } from '../types';

type TrendSignalsProps = {
  signals: TrendSignal[];
};

function formatDelta(delta: number): string {
  if (delta === 0) {
    return '0';
  }
  const abs = Math.abs(delta);
  const precision = abs >= 10 ? 1 : 2;
  const formatted = abs.toFixed(precision);
  return `${delta > 0 ? '+' : '-'}${formatted}`;
}

export function TrendSignals({ signals }: TrendSignalsProps) {
  if (!signals.length) {
    return null;
  }

  return (
    <section className="panel trend-signals">
      <header className="panel__header">
        <h3>Trend monitor</h3>
        <span className="panel__meta">Current vs baseline</span>
      </header>
      <div className="trend-signals__table" role="table">
        <div className="trend-signals__row trend-signals__row--head" role="row">
          <span role="columnheader">Signal</span>
          <span role="columnheader">Now</span>
          <span role="columnheader">Baseline</span>
          <span role="columnheader">Δ</span>
        </div>
        {signals.map((signal) => (
          <div key={signal.id} className={`trend-signals__row trend-signals__row--${signal.direction}`} role="row">
            <span role="cell">{signal.label}</span>
            <span role="cell">{signal.current}</span>
            <span role="cell">{signal.baseline}</span>
            <span role="cell" className="trend-signals__delta">
              {formatDelta(signal.delta)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
