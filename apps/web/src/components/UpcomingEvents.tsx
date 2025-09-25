import React from 'react';
import type { UpcomingEvent } from '../types';
import { formatEventDate } from '../utils/time';

type UpcomingEventsProps = {
  events: UpcomingEvent[];
};

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  if (!events.length) {
    return null;
  }

  return (
    <section className="panel upcoming-events">
      <header className="panel__header">
        <h3>Upcoming schedule</h3>
        <span className="panel__meta">Priority watchlist</span>
      </header>
      <ul className="upcoming-events__list">
        {events.map((event) => (
          <li key={event.id} className="upcoming-events__item">
            <div>
              <strong className="upcoming-events__name">{event.name}</strong>
              <span className="upcoming-events__stage">{event.stage}</span>
            </div>
            <div className="upcoming-events__meta">
              <span>{formatEventDate(event.start)}</span>
              <span>{event.location}</span>
              <span>{event.watch}</span>
            </div>
            <p className="upcoming-events__story">{event.storyline}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
