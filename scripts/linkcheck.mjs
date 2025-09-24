#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');

const USER_AGENT = 'BlazeSportsIntelBot/1.0 (Link Checker)';

async function checkUrl(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
        redirect: 'follow'
      });

      clearTimeout(timeout);

      return {
        url,
        status: response.status,
        ok: response.ok,
        redirected: response.redirected
      };
    } catch (error) {
      if (i === retries) {
        return {
          url,
          status: 0,
          ok: false,
          error: error.message
        };
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

async function checkLinks() {
  console.log('🔗 Checking external links...\n');

  const allUrls = new Set();
  const results = new Map();

  // Collect all URLs from data files
  const leagues = ['nfl', 'mlb'];

  for (const league of leagues) {
    const leagueDir = path.join(dataDir, league);

    if (!await fs.pathExists(leagueDir)) continue;

    const seasons = await fs.readdir(leagueDir);

    for (const season of seasons) {
      const seasonDir = path.join(leagueDir, season);
      const stats = await fs.stat(seasonDir);

      if (!stats.isDirectory()) continue;

      // Check teams.jsonl for external refs
      const teamsFile = path.join(seasonDir, 'teams.jsonl');
      if (await fs.pathExists(teamsFile)) {
        const content = await fs.readFile(teamsFile, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const team = JSON.parse(line);

            if (team.siteUrl) {
              allUrls.add(team.siteUrl);
            }

            if (team.externalRefs) {
              for (const ref of team.externalRefs) {
                if (ref.url) {
                  allUrls.add(ref.url);
                }
              }
            }
          } catch {
            // Skip invalid lines
          }
        }
      }

      // Check players.jsonl for external refs
      const playersFile = path.join(seasonDir, 'players.jsonl');
      if (await fs.pathExists(playersFile)) {
        const content = await fs.readFile(playersFile, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);

        for (const line of lines.slice(0, 10)) { // Check first 10 players only
          try {
            const player = JSON.parse(line);

            if (player.externalRefs) {
              for (const ref of player.externalRefs) {
                if (ref.url) {
                  allUrls.add(ref.url);
                }
              }
            }
          } catch {
            // Skip invalid lines
          }
        }
      }
    }
  }

  console.log(`Found ${allUrls.size} unique URLs to check\n`);

  // Check URLs in batches
  const urls = Array.from(allUrls);
  const batchSize = 5;
  let checked = 0;
  let valid = 0;
  let redirects = 0;
  let errors = 0;

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, Math.min(i + batchSize, urls.length));
    const promises = batch.map(url => checkUrl(url));
    const batchResults = await Promise.all(promises);

    for (const result of batchResults) {
      checked++;
      results.set(result.url, result);

      if (result.ok) {
        valid++;
        console.log(`✓ ${result.url.substring(0, 60)}...`);
      } else if (result.redirected) {
        redirects++;
        console.log(`↻ ${result.url.substring(0, 60)}... (redirected)`);
      } else {
        errors++;
        console.log(`✗ ${result.url.substring(0, 60)}... (${result.status || result.error})`);
      }

      // Progress indicator
      if (checked % 10 === 0) {
        console.log(`  Progress: ${checked}/${urls.length}`);
      }
    }

    // Rate limit
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Link Check Summary:');
  console.log(`  Total URLs: ${allUrls.size}`);
  console.log(`  Valid: ${valid} (${((valid / checked) * 100).toFixed(1)}%)`);
  console.log(`  Redirects: ${redirects}`);
  console.log(`  Errors: ${errors}`);

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: allUrls.size,
      checked,
      valid,
      redirects,
      errors
    },
    results: Object.fromEntries(results)
  };

  const reportPath = path.join(__dirname, '../linkcheck-report.json');
  await fs.writeJSON(reportPath, report, { spaces: 2 });
  console.log(`\n📄 Full report saved to: linkcheck-report.json`);

  if (errors > allUrls.size * 0.2) {
    console.log('\n⚠️  More than 20% of links are broken');
    process.exit(1);
  }
}

checkLinks().catch(console.error);