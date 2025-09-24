#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

const LEAGUES = ['nfl', 'mlb', 'ncaa_fb', 'college_bb', 'tx_hs_fb', 'pg_tx'];

async function validate() {
  console.log('🔍 BLAZE SPORTS INTEL - DATA VALIDATION');
  console.log('=====================================');
  
  let totalErrors = 0;
  let totalWarnings = 0;
  
  for (const league of LEAGUES) {
    console.log(`\n📊 Validating ${league.toUpperCase()}...`);
    
    const dataDir = path.join('data', league);
    const metadataPath = path.join(dataDir, 'metadata.json');
    
    try {
      // Check if metadata exists
      await fs.access(metadataPath);
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      
      // Validate metadata structure
      if (!metadata.league || !metadata.asOf) {
        console.log(`❌ ${league}: Invalid metadata structure`);
        totalErrors++;
      } else {
        console.log(`✅ ${league}: Valid metadata (${metadata.asOf})`);
      }
      
      // Check for teams data
      const teamsPath = path.join(dataDir, 'teams.jsonl');
      try {
        await fs.access(teamsPath);
        const teamsData = await fs.readFile(teamsPath, 'utf8');
        const teamsCount = teamsData.trim().split('\n').length;
        console.log(`✅ ${league}: ${teamsCount} teams found`);
      } catch {
        console.log(`⚠️  ${league}: No teams data found`);
        totalWarnings++;
      }
      
    } catch (error) {
      console.log(`❌ ${league}: No data directory or metadata`);
      totalErrors++;
    }
  }
  
  console.log('\n=====================================');
  console.log(`📈 VALIDATION SUMMARY:`);
  console.log(`✅ Leagues validated: ${LEAGUES.length}`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log(`⚠️  Warnings: ${totalWarnings}`);
  
  if (totalErrors > 0) {
    console.log('\n💡 Run "pnpm run refresh:all" to populate missing data');
    process.exit(1);
  } else {
    console.log('\n🎉 All validations passed!');
  }
}

validate().catch(console.error);
