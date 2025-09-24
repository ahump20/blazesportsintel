import fetch from 'node-fetch';
import { load } from 'cheerio';
import pLimit from 'p-limit';
import pRetry from 'p-retry';
import robotsParser from 'robots-parser';
import { LeagueKeyType } from '@blazesportsintel/schema';

const USER_AGENT = process.env.BLAZE_USER_AGENT || 'BlazeSportsIntelBot/1.0';

// Rate limiting
const limit = pLimit(3); // Max 3 concurrent requests

// Cache for robots.txt
const robotsCache = new Map<string, any>();

export interface FetchOptions {
  headers?: Record<string, string>;
  retries?: number;
  timeout?: number;
}

// Check robots.txt compliance
export async function checkRobots(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

    if (!robotsCache.has(robotsUrl)) {
      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': USER_AGENT }
      });
      const robotsTxt = await response.text();
      const robots = robotsParser(robotsUrl, robotsTxt);
      robotsCache.set(robotsUrl, robots);
    }

    const robots = robotsCache.get(robotsUrl);
    return robots.isAllowed(url, USER_AGENT) ?? true;
  } catch {
    // If we can't fetch robots.txt, assume allowed
    return true;
  }
}

// Fetch with retries and rate limiting
export async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<any> {
  // Check robots.txt
  const allowed = await checkRobots(url);
  if (!allowed) {
    throw new Error(`Blocked by robots.txt: ${url}`);
  }

  return limit(() =>
    pRetry(
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);

        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': USER_AGENT,
              ...options.headers
            },
            signal: controller.signal
          });

          clearTimeout(timeout);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            return await response.json();
          } else {
            return await response.text();
          }
        } catch (error) {
          clearTimeout(timeout);
          throw error;
        }
      },
      {
        retries: options.retries || 3,
        minTimeout: 1000,
        maxTimeout: 10000
      }
    )
  );
}

// HTML parsing helper
export function parseHtml(html: string) {
  return load(html);
}

// Sleep for rate limiting
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Base adapter class
export abstract class BaseAdapter {
  protected league: LeagueKeyType;

  constructor(league: LeagueKeyType) {
    this.league = league;
  }

  abstract discover(): Promise<any>;
  abstract fetchTeams(season: number): Promise<any[]>;
  abstract fetchRosters(teamId: string, season: number): Promise<any[]>;
  abstract fetchSchedule(season: number): Promise<any[]>;
  abstract fetchStandings(season: number): Promise<any[]>;
  abstract normalize(data: any, type: string): any;
  abstract validate(data: any, type: string): boolean;

  async persist(data: any[], type: string, season: number): Promise<void> {
    // Implementation in pipeline package
    console.log(`Persisting ${data.length} ${type} records for ${this.league} season ${season}`);
  }

  async publish(season: number): Promise<void> {
    // Implementation in pipeline package
    console.log(`Publishing data for ${this.league} season ${season}`);
  }

  report(): any {
    return {
      league: this.league,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
  }
}

// Utility functions for data normalization
export function normalizeDate(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return dateStr;
  }
}

export function normalizeTeamName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function extractIdFromUrl(url: string, pattern: RegExp): string | null {
  const match = url.match(pattern);
  return match ? match[1] : null;
}

// Link-out builder
export function buildLinkout(entityId: string, entityType: string, url: string, label: string, sourceType: string) {
  return {
    entityId,
    entityType,
    label,
    url,
    sourceType,
    verified: false,
    lastChecked: new Date().toISOString()
  };
}