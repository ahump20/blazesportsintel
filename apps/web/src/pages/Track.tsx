import React from 'react';
import { SportDashboard } from '../components/SportDashboard';
import { useLiveDashboard } from '../hooks/useLiveDashboard';

export default function Track() {
  const feed = useLiveDashboard('track', 75_000);
  return <SportDashboard sport="track" feed={feed} />;
}
