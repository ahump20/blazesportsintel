import React from 'react';
import { SportDashboard } from '../components/SportDashboard';
import { useLiveDashboard } from '../hooks/useLiveDashboard';

export default function Baseball() {
  const feed = useLiveDashboard('baseball', 45_000);
  return <SportDashboard sport="baseball" feed={feed} />;
}
