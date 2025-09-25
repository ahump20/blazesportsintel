import React from 'react';
import { SportDashboard } from '../components/SportDashboard';
import { useLiveDashboard } from '../hooks/useLiveDashboard';

export default function Football() {
  const feed = useLiveDashboard('football', 60_000);
  return <SportDashboard sport="football" feed={feed} />;
}
