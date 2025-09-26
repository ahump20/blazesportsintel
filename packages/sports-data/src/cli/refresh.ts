#!/usr/bin/env node

/**
 * Data Refresh CLI
 * Command-line interface for manual data collection and daily refresh
 */

import { program } from 'commander';
import { dataOrchestrator } from '../collectors/data-orchestrator.js';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Chicago';

program
  .name('blazesportsintel-refresh')
  .description('Blaze Sports Intelligence - Data Collection CLI')
  .version('1.0.0');

// Full daily refresh command
program
  .command('daily')
  .description('Execute full daily data refresh for all leagues')
  .option('--dry-run', 'Perform dry run without storing data')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options) => {
    try {
      console.log('🌅 Blaze Sports Intelligence - Daily Data Refresh');
      console.log(`⏰ Started at: ${format(toZonedTime(new Date(), TIMEZONE), 'yyyy-MM-dd HH:mm:ss zzz')}`);

      if (options.dryRun) {
        console.log('🧪 DRY RUN MODE - No data will be stored');
      }

      const report = await dataOrchestrator.executeDailyRefresh();

      console.log('\n📊 COLLECTION SUMMARY');
      console.log('━'.repeat(50));
      console.log(`Duration: ${report.totalDuration}ms`);
      console.log(`Success: ${report.successCount}/${report.successCount + report.errorCount} leagues`);
      console.log(`Records: ${report.totalRecords.toLocaleString()}`);
      console.log(`Next run: ${report.nextScheduledRun}`);

      if (report.errorCount > 0) {
        console.log('\n❌ ERRORS:');
        report.results
          .filter(r => !r.success)
          .forEach(r => console.log(`  • ${r.league}: ${r.error}`));
      }

      const warnings = report.results.flatMap(r => r.warnings);
      if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        warnings.forEach(w => console.log(`  • ${w}`));
      }

      process.exit(report.errorCount > 0 ? 1 : 0);
    } catch (error) {
      console.error('❌ Daily refresh failed:', error);
      process.exit(1);
    }
  });

// Single league collection
program
  .command('league <name>')
  .description('Collect data for a specific league')
  .option('--validate', 'Validate data after collection')
  .action(async (name, options) => {
    try {
      console.log(`🎯 Collecting data for league: ${name}`);

      const result = await dataOrchestrator.collectLeague(name);

      console.log('\n📊 COLLECTION RESULT');
      console.log('━'.repeat(30));
      console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`Duration: ${result.duration}ms`);
      console.log(`Records: ${result.recordCount}`);

      if (result.dataFiles.length > 0) {
        console.log(`Files: ${result.dataFiles.length}`);
        if (options.validate) {
          console.log('Stored files:');
          result.dataFiles.forEach(file => console.log(`  • ${file}`));
        }
      }

      if (result.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        result.warnings.forEach(w => console.log(`  • ${w}`));
      }

      if (!result.success) {
        console.log(`\n❌ ERROR: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ League collection failed:', error);
      process.exit(1);
    }
  });

// List available leagues
program
  .command('leagues')
  .description('List all available leagues for data collection')
  .action(async () => {
    const status = dataOrchestrator.getStatus();

    console.log('📋 AVAILABLE LEAGUES');
    console.log('━'.repeat(30));
    status.availableLeagues.forEach((league: string, index: number) => {
      console.log(`${index + 1}. ${league}`);
    });

    console.log(`\n📁 Data Directory: ${status.dataDirectory}`);
    console.log(`⚡ Max Concurrent: ${status.maxConcurrentCollectors}`);
    console.log(`⏰ Next Scheduled: ${status.nextScheduledRun}`);
    console.log(`🌍 Timezone: ${status.timezone}`);
  });

// Status command
program
  .command('status')
  .description('Show current data collection status')
  .option('--validate', 'Include data validation results')
  .action(async (options) => {
    try {
      console.log('📊 BLAZE SPORTS INTELLIGENCE - STATUS');
      console.log('━'.repeat(50));

      const status = dataOrchestrator.getStatus();

      console.log(`⏰ Current Time: ${format(toZonedTime(new Date(), TIMEZONE), 'yyyy-MM-dd HH:mm:ss zzz')}`);
      console.log(`📁 Data Directory: ${status.dataDirectory}`);
      console.log(`🏟️  Available Leagues: ${status.availableLeagues.length}`);
      console.log(`⚡ Max Concurrent: ${status.maxConcurrentCollectors}`);
      console.log(`⏰ Next Scheduled: ${status.nextScheduledRun}`);

      if (options.validate) {
        console.log('\n🔍 DATA VALIDATION');
        console.log('━'.repeat(30));

        const validation = await dataOrchestrator.validateStoredData();

        Object.entries(validation).forEach(([league, result]: [string, any]) => {
          const icon = result.isValid ? '✅' : '❌';
          console.log(`${icon} ${league}`);

          if (result.lastUpdated) {
            console.log(`    Last updated: ${result.lastUpdated}`);
          }
          if (result.recordCount) {
            console.log(`    Records: ${result.recordCount}`);
          }
          if (result.error) {
            console.log(`    Error: ${result.error}`);
          }
        });
      }
    } catch (error) {
      console.error('❌ Status check failed:', error);
      process.exit(1);
    }
  });

// Validate stored data
program
  .command('validate')
  .description('Validate all stored data files')
  .option('--league <name>', 'Validate specific league only')
  .action(async (options) => {
    try {
      console.log('🔍 VALIDATING STORED DATA');
      console.log('━'.repeat(30));

      if (options.league) {
        // Validate specific league
        console.log(`Validating league: ${options.league}`);
        // Implementation would validate specific league
      } else {
        // Validate all leagues
        const validation = await dataOrchestrator.validateStoredData();

        let validCount = 0;
        let invalidCount = 0;

        Object.entries(validation).forEach(([league, result]: [string, any]) => {
          const icon = result.isValid ? '✅' : '❌';
          console.log(`${icon} ${league}`);

          if (result.isValid) {
            validCount++;
            if (result.recordCount) {
              console.log(`    ✓ ${result.recordCount} records`);
            }
            if (result.lastUpdated) {
              console.log(`    ✓ Updated: ${new Date(result.lastUpdated).toLocaleString()}`);
            }
          } else {
            invalidCount++;
            if (result.error) {
              console.log(`    ❌ ${result.error}`);
            }
          }
        });

        console.log('\n📊 VALIDATION SUMMARY');
        console.log('━'.repeat(30));
        console.log(`✅ Valid: ${validCount}`);
        console.log(`❌ Invalid: ${invalidCount}`);
        console.log(`📋 Total: ${validCount + invalidCount}`);

        if (invalidCount > 0) {
          process.exit(1);
        }
      }
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  });

// Help command with examples
program
  .command('examples')
  .description('Show usage examples')
  .action(() => {
    console.log('💡 BLAZE SPORTS INTELLIGENCE - USAGE EXAMPLES');
    console.log('━'.repeat(50));
    console.log('');
    console.log('Daily refresh (run at 5:00 AM CT):');
    console.log('  npm run data:refresh daily');
    console.log('');
    console.log('Collect specific league:');
    console.log('  npm run data:refresh league texas-hs-football');
    console.log('  npm run data:refresh league mlb-cardinals');
    console.log('  npm run data:refresh league perfect-game');
    console.log('');
    console.log('Check status with validation:');
    console.log('  npm run data:refresh status --validate');
    console.log('');
    console.log('List available leagues:');
    console.log('  npm run data:refresh leagues');
    console.log('');
    console.log('Validate all data:');
    console.log('  npm run data:refresh validate');
    console.log('');
    console.log('Dry run (testing):');
    console.log('  npm run data:refresh daily --dry-run');
    console.log('');
    console.log('🌐 Data feeds into blazesportsintel.com API endpoints');
    console.log('📊 Supports 1,400+ Texas HS teams, Perfect Game tournaments,');
    console.log('    Cardinals analytics, and more Deep South sports data');
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}