import React from 'react';
import type { TacticalAngle } from '../types';

type TacticalAnglesProps = {
  angles: TacticalAngle[];
};

export function TacticalAngles({ angles }: TacticalAnglesProps) {
  if (!angles.length) {
    return null;
  }

  return (
    <section className="panel tactical-angles">
      <header className="panel__header">
        <h3>Tactical angles</h3>
        <span className="panel__meta">Coaching levers & counters</span>
      </header>
      <ul className="tactical-angles__list">
        {angles.map((angle) => (
          <li key={angle.id} className="tactical-angles__item">
            <div className="tactical-angles__heading">
              <strong>{angle.title}</strong>
              <span className="tactical-angles__confidence">Confidence {angle.confidence}%</span>
            </div>
            <p className="tactical-angles__summary">{angle.summary}</p>
            <span className="tactical-angles__stat">Key stat: {angle.stat}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
