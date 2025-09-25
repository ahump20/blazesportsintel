import React from 'react';
import type { IntelPulseItem } from '../types';
import { timeAgo } from '../utils/time';

type IntelStreamProps = {
  items: IntelPulseItem[];
};

const impactLabel: Record<IntelPulseItem['impact'], string> = {
  high: 'High impact',
  medium: 'Medium impact',
  low: 'Low impact',
};

export function IntelStream({ items }: IntelStreamProps) {
  if (!items.length) {
    return null;
  }

  const sorted = [...items].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  return (
    <section className="panel intel-stream">
      <header className="panel__header">
        <h3>Intel stream</h3>
        <span className="panel__meta">Realtime notes • last {sorted.length} signals</span>
      </header>
      <ul className="intel-stream__list">
        {sorted.map((item) => (
          <li key={item.id} className={`intel-stream__item intel-stream__item--${item.impact}`}>
            <div className="intel-stream__time">{timeAgo(item.timestamp)}</div>
            <div className="intel-stream__content">
              <strong className="intel-stream__headline">{item.headline}</strong>
              <p className="intel-stream__detail">{item.detail}</p>
            </div>
            <span className="intel-stream__impact">{impactLabel[item.impact]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
