import { useEffect, useMemo, useState } from 'react';
import { mockDashboards } from '../data/mockData';
import { loadSportDashboard } from '../services/api';
import type { DashboardFeed, SportKey } from '../types';

const DEFAULT_REFRESH_MS = 60_000;

export function useLiveDashboard(sport: SportKey, refreshMs = DEFAULT_REFRESH_MS): DashboardFeed {
  const fallback = useMemo(() => mockDashboards[sport], [sport]);

  const [feed, setFeed] = useState<DashboardFeed>(() => ({
    data: fallback,
    source: 'fallback',
    lastUpdated: new Date().toISOString(),
    status: 'loading',
  }));

  useEffect(() => {
    let active = true;

    setFeed({
      data: mockDashboards[sport],
      source: 'fallback',
      lastUpdated: new Date().toISOString(),
      status: 'loading',
      error: undefined,
    });

    async function hydrate() {
      const result = await loadSportDashboard(sport);
      if (!active) {
        return;
      }

      setFeed({
        data: result.data,
        source: result.source,
        lastUpdated: new Date().toISOString(),
        status: result.source === 'remote' ? 'ready' : result.error ? 'error' : 'ready',
        error: result.error,
      });
    }

    void hydrate();

    if (refreshMs <= 0) {
      return () => {
        active = false;
      };
    }

    const interval = window.setInterval(() => {
      void hydrate();
    }, refreshMs);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sport, refreshMs]);

  return feed;
}
