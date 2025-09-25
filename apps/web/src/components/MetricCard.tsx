import React from 'react';
import type { MetricSummary } from '../types';
import { TrendSparkline } from './TrendSparkline';

type MetricCardProps = {
  metric: MetricSummary;
  accent: string;
};

function formatChange(change: number): string {
  if (change === 0) {
    return '0';
  }
  const abs = Math.abs(change);
  const precision = abs >= 10 ? 0 : abs >= 1 ? 1 : 2;
  const value = abs.toFixed(precision);
  return `${change > 0 ? '+' : '-'}${value}`;
}

export function MetricCard({ metric, accent }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${metric.trend}`}>
      <header className="metric-card__header">
        <span className="metric-card__label">{metric.label}</span>
        <span className="metric-card__trend">{metric.trend === 'up' ? 'Rising' : metric.trend === 'down' ? 'Falling' : 'Stable'}</span>
      </header>
      <strong className="metric-card__value">{metric.value}</strong>
      <div className="metric-card__change" style={{ color: accent }}>
        Δ {formatChange(metric.change)}
      </div>
      <p className="metric-card__context">{metric.context}</p>
      <TrendSparkline data={metric.sparkline} accent={accent} />
    </article>
  );
}
