#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');

async function seedData() {
  console.log('🌱 Seeding initial data...\n');

  // Create data directories
  const leagues = ['nfl', 'mlb', 'ncaa_fb', 'college_bb', 'tx_hs_fb', 'pg_tx'];
  const season = new Date().getFullYear();

  for (const league of leagues) {
    const leagueDir = path.join(dataDir, league, String(season));
    await fs.ensureDir(leagueDir);

    // Create metadata
    const metadata = {
      league,
      season,
      lastUpdated: new Date().toISOString(),
      asOf: '2025-09-22',
      sources: [`${league}.com`],
      recordCounts: {
        teams: 0,
        players: 0,
        games: 0,
        standings: 0
      },
      version: '1.0.0'
    };

    await fs.writeJSON(path.join(leagueDir, 'metadata.json'), metadata, { spaces: 2 });

    // Create empty JSONL files
    await fs.writeFile(path.join(leagueDir, 'teams.jsonl'), '');
    await fs.writeFile(path.join(leagueDir, 'players.jsonl'), '');
    await fs.writeFile(path.join(leagueDir, 'schedules.jsonl'), '');
    await fs.writeFile(path.join(leagueDir, 'standings.jsonl'), '');

    console.log(`✓ Created seed structure for ${league.toUpperCase()}`);
  }

  console.log('\n✅ Seed data created successfully!');
}

seedData().catch(console.error);