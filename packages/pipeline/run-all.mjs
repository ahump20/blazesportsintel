#!/usr/bin/env node
import { spawn } from 'child_process';
import { promisify } from 'util';

const exec = promisify(spawn);
const LEAGUES = ['nfl', 'mlb', 'ncaa_fb', 'college_bb', 'tx_hs_fb', 'pg_tx'];

async function refreshAll() {
  console.log('🏆 BLAZE SPORTS INTEL - FULL DATA REFRESH');
  console.log('==========================================');
  const startTime = Date.now();
  
  const results = [];
  for (const league of LEAGUES) {
    try {
      console.log(`\n📊 Refreshing ${league.toUpperCase()}...`);
      await new Promise((resolve, reject) => {
        const child = spawn('node', ['packages/pipeline/run.mjs', league], {
          stdio: 'inherit'
        });
        child.on('close', code => {
          if (code === 0) resolve();
          else reject(new Error(`${league} failed with code ${code}`));
        });
      });
      results.push({ league, status: 'success' });
    } catch (error) {
      console.error(`❌ ${league} failed:`, error.message);
      results.push({ league, status: 'failed', error: error.message });
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n==========================================');
  console.log('📈 REFRESH SUMMARY:');
  results.forEach(r => {
    const icon = r.status === 'success' ? '✅' : '❌';
    console.log(`${icon} ${r.league}: ${r.status}`);
  });
  console.log(`⏱️  Total time: ${duration}s`);
}

refreshAll().catch(console.error);
