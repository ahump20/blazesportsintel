import React from 'react';
import { SportDashboard } from '../components/SportDashboard';
import { useLiveDashboard } from '../hooks/useLiveDashboard';

export default function Basketball() {
  const feed = useLiveDashboard('basketball', 60_000);
  return <SportDashboard sport="basketball" feed={feed} />;
}
