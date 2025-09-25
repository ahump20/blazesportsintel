import { mockDashboards } from '../data/mockData';
import type { SportDashboardData, SportKey } from '../types';

const DEFAULT_API_BASE = 'https://api.blazesportsintel.com/v1';
const REQUEST_TIMEOUT_MS = 4000;

const sportPath: Record<SportKey, string> = {
  baseball: 'baseball',
  football: 'football',
  basketball: 'basketball',
  track: 'track',
};

function getApiBase(): string {
  const configured = (import.meta.env.VITE_API_BASE as string | undefined)?.trim();
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/$/, '');
  }
  return DEFAULT_API_BASE;
}

function isSportDashboardData(value: unknown): value is SportDashboardData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SportDashboardData>;
  return (
    typeof candidate.sport === 'string' &&
    Array.isArray(candidate.metrics) &&
    Array.isArray(candidate.liveGames) &&
    Array.isArray(candidate.playerSpotlights) &&
    Array.isArray(candidate.predictiveModels) &&
    Array.isArray(candidate.upcomingEvents) &&
    Array.isArray(candidate.intelStream) &&
    Array.isArray(candidate.tacticalAngles) &&
    Array.isArray(candidate.trendSignals)
  );
}

function mergeWithFallback(remote: SportDashboardData, fallback: SportDashboardData): SportDashboardData {
  return {
    ...fallback,
    ...remote,
    hero: { ...fallback.hero, ...remote.hero },
    metrics: remote.metrics?.length ? remote.metrics : fallback.metrics,
    liveGames: remote.liveGames?.length ? remote.liveGames : fallback.liveGames,
    playerSpotlights: remote.playerSpotlights?.length ? remote.playerSpotlights : fallback.playerSpotlights,
    predictiveModels: remote.predictiveModels?.length ? remote.predictiveModels : fallback.predictiveModels,
    upcomingEvents: remote.upcomingEvents?.length ? remote.upcomingEvents : fallback.upcomingEvents,
    intelStream: remote.intelStream?.length ? remote.intelStream : fallback.intelStream,
    tacticalAngles: remote.tacticalAngles?.length ? remote.tacticalAngles : fallback.tacticalAngles,
    trendSignals: remote.trendSignals?.length ? remote.trendSignals : fallback.trendSignals,
    generatedAt: remote.generatedAt ?? fallback.generatedAt,
  };
}

export async function loadSportDashboard(
  sport: SportKey,
): Promise<{ data: SportDashboardData; source: 'remote' | 'fallback'; error?: string }> {
  const fallback = mockDashboards[sport];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const url = `${getApiBase()}/dashboard/${sportPath[sport]}`;

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Feed returned HTTP ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    if (!isSportDashboardData(payload)) {
      throw new Error('Feed payload missing required fields');
    }

    return {
      data: mergeWithFallback(payload, fallback),
      source: 'remote',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown dashboard error';
    console.warn(`[feed] using fallback for ${sport}: ${message}`);
    return {
      data: fallback,
      source: 'fallback',
      error: message,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
