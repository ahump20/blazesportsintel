#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');

async function validateData() {
  console.log('🔍 Validating data integrity...\n');

  let totalErrors = 0;
  let totalWarnings = 0;

  const leagues = ['nfl', 'mlb', 'ncaa_fb', 'college_bb', 'tx_hs_fb', 'pg_tx'];

  for (const league of leagues) {
    const leagueDir = path.join(dataDir, league);

    if (!await fs.pathExists(leagueDir)) {
      console.log(`⚠️  ${league.toUpperCase()}: No data directory found`);
      totalWarnings++;
      continue;
    }

    const seasons = await fs.readdir(leagueDir);

    for (const season of seasons) {
      const seasonDir = path.join(leagueDir, season);
      const stats = await fs.stat(seasonDir);

      if (!stats.isDirectory()) continue;

      console.log(`\n📊 ${league.toUpperCase()} - Season ${season}:`);

      // Check for required files
      const requiredFiles = ['metadata.json', 'teams.jsonl', 'standings.jsonl', 'schedules.jsonl'];
      const optionalFiles = ['players.jsonl', 'staff.jsonl', 'stats_season.jsonl', 'depthcharts.jsonl'];

      for (const file of requiredFiles) {
        const filePath = path.join(seasonDir, file);
        if (await fs.pathExists(filePath)) {
          const stats = await fs.stat(filePath);
          const size = (stats.size / 1024).toFixed(2);
          console.log(`  ✓ ${file} (${size} KB)`);
        } else {
          console.log(`  ✗ ${file} - MISSING`);
          totalErrors++;
        }
      }

      for (const file of optionalFiles) {
        const filePath = path.join(seasonDir, file);
        if (await fs.pathExists(filePath)) {
          const stats = await fs.stat(filePath);
          const size = (stats.size / 1024).toFixed(2);
          console.log(`  ○ ${file} (${size} KB)`);
        }
      }

      // Validate metadata
      const metadataPath = path.join(seasonDir, 'metadata.json');
      if (await fs.pathExists(metadataPath)) {
        try {
          const metadata = await fs.readJSON(metadataPath);

          // Check data freshness
          const lastUpdated = new Date(metadata.lastUpdated);
          const daysSinceUpdate = Math.floor((Date.now() - lastUpdated) / (1000 * 60 * 60 * 24));

          if (daysSinceUpdate > 1) {
            console.log(`  ⚠️  Data is ${daysSinceUpdate} days old`);
            totalWarnings++;
          } else {
            console.log(`  ✓ Data freshness: Updated ${daysSinceUpdate === 0 ? 'today' : 'yesterday'}`);
          }

          // Show record counts
          if (metadata.recordCounts) {
            console.log(`  📈 Records: ${JSON.stringify(metadata.recordCounts)}`);
          }
        } catch (error) {
          console.log(`  ✗ Invalid metadata.json: ${error.message}`);
          totalErrors++;
        }
      }

      // Validate JSONL files
      const jsonlFiles = ['teams.jsonl', 'players.jsonl', 'schedules.jsonl', 'standings.jsonl'];

      for (const file of jsonlFiles) {
        const filePath = path.join(seasonDir, file);
        if (await fs.pathExists(filePath)) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.trim().split('\n').filter(Boolean);
            let validLines = 0;
            let invalidLines = 0;

            for (let i = 0; i < lines.length; i++) {
              try {
                JSON.parse(lines[i]);
                validLines++;
              } catch {
                invalidLines++;
                if (invalidLines === 1) {
                  console.log(`  ⚠️  ${file}: Line ${i + 1} is invalid JSON`);
                }
              }
            }

            if (invalidLines > 0) {
              console.log(`  ⚠️  ${file}: ${invalidLines}/${lines.length} invalid lines`);
              totalWarnings++;
            }
          } catch (error) {
            console.log(`  ✗ Error reading ${file}: ${error.message}`);
            totalErrors++;
          }
        }
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Validation Summary:');
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Warnings: ${totalWarnings}`);

  if (totalErrors > 0) {
    console.log('\n❌ Validation failed with errors');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('\n⚠️  Validation passed with warnings');
  } else {
    console.log('\n✅ All validations passed!');
  }
}

validateData().catch(console.error);