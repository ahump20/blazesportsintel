#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LEAGUES = ['nfl', 'mlb', 'ncaa_fb', 'college_bb', 'tx_hs_fb', 'pg_tx'];

async function runRefresh(league) {
  console.log(`🚀 Starting refresh for ${league}...`);
  
  try {
    // Dynamic import of the source adapter
    const adapterPath = path.join(__dirname, `../sources/${league}/index.mjs`);
    const adapter = await import(adapterPath);
    
    // Run the adapter pipeline
    const results = await adapter.refresh({
      asOf: new Date().toISOString(),
      dataDir: path.join(process.cwd(), 'data', league),
      cacheDir: path.join(process.cwd(), '.cache', league)
    });
    
    console.log(`✅ ${league} refresh complete:`, results);
    return results;
  } catch (error) {
    console.error(`❌ ${league} refresh failed:`, error.message);
    throw error;
  }
}

// Main execution
const league = process.argv[2];

if (!league || !LEAGUES.includes(league)) {
  console.error(`Usage: node run.mjs [${LEAGUES.join('|')}]`);
  process.exit(1);
}

runRefresh(league).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
