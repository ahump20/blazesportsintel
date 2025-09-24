#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dynamically import adapters after build
async function runPipeline() {
  const currentSeason = new Date().getFullYear();
  const dataDir = path.join(__dirname, '../../data');

  // Ensure data directory exists
  await fs.ensureDir(dataDir);

  // Import adapters
  const { NFLAdapter } = await import('@blazesportsintel/source-nfl');
  const { MLBAdapter } = await import('@blazesportsintel/source-mlb');

  const adapters = [
    { name: 'nfl', adapter: new NFLAdapter() },
    { name: 'mlb', adapter: new MLBAdapter() }
  ];

  for (const { name, adapter } of adapters) {
    console.log(`\nProcessing ${name.toUpperCase()}...`);

    const leagueDir = path.join(dataDir, name, String(currentSeason));
    await fs.ensureDir(leagueDir);

    try {
      // Fetch data
      const teams = await adapter.fetchTeams(currentSeason);
      const schedule = await adapter.fetchSchedule(currentSeason);
      const standings = await adapter.fetchStandings(currentSeason);

      // Write teams
      const teamsFile = path.join(leagueDir, 'teams.jsonl');
      await fs.writeFile(
        teamsFile,
        teams.map(t => JSON.stringify(t)).join('\n')
      );
      console.log(`  ✓ Wrote ${teams.length} teams`);

      // Write schedule
      const scheduleFile = path.join(leagueDir, 'schedules.jsonl');
      await fs.writeFile(
        scheduleFile,
        schedule.map(g => JSON.stringify(g)).join('\n')
      );
      console.log(`  ✓ Wrote ${schedule.length} games`);

      // Write standings
      const standingsFile = path.join(leagueDir, 'standings.jsonl');
      await fs.writeFile(
        standingsFile,
        standings.map(s => JSON.stringify(s)).join('\n')
      );
      console.log(`  ✓ Wrote ${standings.length} standings rows`);

      // Fetch rosters for each team
      const allPlayers = [];
      for (const team of teams) {
        const players = await adapter.fetchRosters(team.id, currentSeason);
        allPlayers.push(...players);
      }

      // Write players
      const playersFile = path.join(leagueDir, 'players.jsonl');
      await fs.writeFile(
        playersFile,
        allPlayers.map(p => JSON.stringify(p)).join('\n')
      );
      console.log(`  ✓ Wrote ${allPlayers.length} players`);

      // Write metadata
      const metadata = {
        league: name,
        season: currentSeason,
        lastUpdated: new Date().toISOString(),
        asOf: new Date().toISOString().split('T')[0],
        sources: [`${name}.com`, 'espn.com'],
        recordCounts: {
          teams: teams.length,
          players: allPlayers.length,
          games: schedule.length,
          standings: standings.length
        },
        version: '1.0.0'
      };

      const metadataFile = path.join(leagueDir, 'metadata.json');
      await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
      console.log(`  ✓ Wrote metadata`);

    } catch (error) {
      console.error(`  ✗ Error processing ${name}:`, error.message);
    }
  }

  console.log('\n✅ Pipeline complete!');
}

runPipeline().catch(console.error);