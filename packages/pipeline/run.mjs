#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const league = process.argv[2];
if (!league) {
  console.error('Usage: node run.mjs <league>');
  process.exit(1);
}

async function runLeague(leagueName) {
  const currentSeason = new Date().getFullYear();
  const dataDir = path.join(__dirname, '../../data');
  const leagueDir = path.join(dataDir, leagueName, String(currentSeason));

  await fs.ensureDir(leagueDir);

  let adapter;

  switch (leagueName) {
    case 'nfl': {
      const { NFLAdapter } = await import('@blazesportsintel/source-nfl');
      adapter = new NFLAdapter();
      break;
    }
    case 'mlb': {
      const { MLBAdapter } = await import('@blazesportsintel/source-mlb');
      adapter = new MLBAdapter();
      break;
    }
    default:
      console.error(`Unknown league: ${leagueName}`);
      process.exit(1);
  }

  console.log(`Processing ${leagueName.toUpperCase()}...`);

  try {
    const teams = await adapter.fetchTeams(currentSeason);
    const schedule = await adapter.fetchSchedule(currentSeason);
    const standings = await adapter.fetchStandings(currentSeason);

    // Write data files
    await fs.writeFile(
      path.join(leagueDir, 'teams.jsonl'),
      teams.map(t => JSON.stringify(t)).join('\n')
    );
    console.log(`✓ Wrote ${teams.length} teams`);

    await fs.writeFile(
      path.join(leagueDir, 'schedules.jsonl'),
      schedule.map(g => JSON.stringify(g)).join('\n')
    );
    console.log(`✓ Wrote ${schedule.length} games`);

    await fs.writeFile(
      path.join(leagueDir, 'standings.jsonl'),
      standings.map(s => JSON.stringify(s)).join('\n')
    );
    console.log(`✓ Wrote ${standings.length} standings rows`);

    // Metadata
    const metadata = {
      league: leagueName,
      season: currentSeason,
      lastUpdated: new Date().toISOString(),
      asOf: new Date().toISOString().split('T')[0],
      sources: [`${leagueName}.com`],
      recordCounts: {
        teams: teams.length,
        games: schedule.length,
        standings: standings.length
      },
      version: '1.0.0'
    };

    await fs.writeFile(
      path.join(leagueDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    console.log('✓ Wrote metadata');

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

runLeague(league).catch(console.error);