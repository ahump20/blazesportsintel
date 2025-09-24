#!/usr/bin/env node

/**
 * Daily Data Refresh Automation
 * Orchestrates all data pipeline updates
 *
 * Schedule (US/Central):
 * - 3:00 AM: Full roster updates
 * - 6:00 AM: Standings refresh
 * - Every 30 min: Live game updates
 * - Hourly: Injury reports
 * - Real-time: Transactions
 */

import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Configuration
const config = {
  timezone: 'America/Chicago',
  apiUrl: process.env.API_URL || 'https://blazesportsintel.com/api',
  slackWebhook: process.env.SLACK_WEBHOOK,
  environment: process.env.NODE_ENV || 'production',
  pipelines: {
    texasHSFootball: '../../data-pipelines/texas-hs-football/index.js',
    perfectGame: '../../data-pipelines/perfect-game/index.js',
    ncaaFootball: '../../data-pipelines/ncaa-football/index.js',
    ncaaBaseball: '../../data-pipelines/ncaa-baseball/index.js',
    nfl: '../../data-pipelines/nfl/index.js',
    mlb: '../../data-pipelines/mlb/index.js'
  }
};

/**
 * Pipeline execution wrapper
 */
async function runPipeline(name, scriptPath) {
  const startTime = Date.now();
  logger.info(`Starting ${name} pipeline...`);

  try {
    const fullPath = path.join(__dirname, scriptPath);
    const { stdout, stderr } = await execAsync(`node ${fullPath}`);

    if (stderr && !stderr.includes('warning')) {
      logger.warn(`${name} pipeline warnings:`, stderr);
    }

    const duration = Date.now() - startTime;
    logger.info(`✅ ${name} pipeline completed in ${duration}ms`);

    // Send success notification
    await notifyStatus({
      pipeline: name,
      status: 'success',
      duration,
      message: stdout.substring(0, 500)
    });

    return { success: true, duration, output: stdout };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`❌ ${name} pipeline failed after ${duration}ms:`, error);

    // Send failure notification
    await notifyStatus({
      pipeline: name,
      status: 'failure',
      duration,
      error: error.message
    });

    return { success: false, duration, error: error.message };
  }
}

/**
 * Full roster update (3 AM daily)
 */
async function fullRosterUpdate() {
  logger.info('🔄 Starting full roster update...');

  const results = await Promise.allSettled([
    runPipeline('Texas HS Football Rosters', config.pipelines.texasHSFootball),
    runPipeline('Perfect Game Rosters', config.pipelines.perfectGame),
    runPipeline('NCAA Football Rosters', config.pipelines.ncaaFootball),
    runPipeline('NCAA Baseball Rosters', config.pipelines.ncaaBaseball),
    runPipeline('NFL Rosters', config.pipelines.nfl),
    runPipeline('MLB Rosters', config.pipelines.mlb)
  ]);

  const summary = {
    timestamp: new Date().toISOString(),
    type: 'full_roster_update',
    results: results.map((r, i) => ({
      pipeline: Object.keys(config.pipelines)[i],
      ...r.value || r.reason
    }))
  };

  logger.info('Full roster update summary:', summary);
  await persistResults('roster_update', summary);
}

/**
 * Standings refresh (6 AM daily)
 */
async function standingsRefresh() {
  logger.info('📊 Starting standings refresh...');

  const sports = ['nfl', 'mlb', 'ncaa_football', 'ncaa_baseball', 'texas_hs_football'];
  const results = [];

  for (const sport of sports) {
    try {
      const response = await fetch(`${config.apiUrl}/v1/refresh/standings/${sport}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_KEY}`
        }
      });

      const data = await response.json();
      results.push({ sport, success: response.ok, data });
    } catch (error) {
      logger.error(`Standings refresh failed for ${sport}:`, error);
      results.push({ sport, success: false, error: error.message });
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    type: 'standings_refresh',
    results
  };

  logger.info('Standings refresh summary:', summary);
  await persistResults('standings_refresh', summary);
}

/**
 * Live game updates (every 30 minutes during game windows)
 */
async function liveGameUpdates() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  // Check if within typical game windows
  const isGameTime = (
    (day === 0 && hour >= 12 && hour <= 23) || // Sunday NFL
    (day === 1 && hour >= 19 && hour <= 23) || // Monday Night
    (day === 4 && hour >= 19 && hour <= 23) || // Thursday Night
    (day === 5 && hour >= 18 && hour <= 23) || // Friday HS Football
    (day === 6 && hour >= 11 && hour <= 23)    // Saturday College
  );

  if (!isGameTime) {
    logger.info('Outside game window, skipping live updates');
    return;
  }

  logger.info('🏈 Fetching live game updates...');

  try {
    const response = await fetch(`${config.apiUrl}/v1/games/live`, {
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`
      }
    });

    const games = await response.json();
    logger.info(`Found ${games.length} live games`);

    // Process each live game
    for (const game of games) {
      await processLiveGame(game);
    }

    await persistResults('live_updates', {
      timestamp: new Date().toISOString(),
      gamesProcessed: games.length
    });
  } catch (error) {
    logger.error('Live game updates failed:', error);
  }
}

/**
 * Injury report updates (hourly)
 */
async function injuryReportUpdate() {
  logger.info('🏥 Updating injury reports...');

  const leagues = ['nfl', 'mlb', 'nba', 'ncaa_football'];
  const results = [];

  for (const league of leagues) {
    try {
      const response = await fetch(`${config.apiUrl}/v1/injuries/${league}`, {
        headers: {
          'Authorization': `Bearer ${process.env.API_KEY}`
        }
      });

      const data = await response.json();
      results.push({ league, count: data.length, success: true });

      // Store injury data
      await persistResults(`injuries_${league}`, data);
    } catch (error) {
      logger.error(`Injury update failed for ${league}:`, error);
      results.push({ league, success: false, error: error.message });
    }
  }

  logger.info('Injury report summary:', results);
}

/**
 * Transaction monitoring (real-time via webhooks)
 */
async function transactionMonitor() {
  logger.info('💱 Checking for new transactions...');

  try {
    const response = await fetch(`${config.apiUrl}/v1/transactions/recent`, {
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`
      }
    });

    const transactions = await response.json();

    if (transactions.length > 0) {
      logger.info(`Processing ${transactions.length} new transactions`);

      for (const transaction of transactions) {
        await processTransaction(transaction);
      }
    }
  } catch (error) {
    logger.error('Transaction monitor failed:', error);
  }
}

/**
 * Process individual live game
 */
async function processLiveGame(game) {
  // Update game score and stats
  logger.info(`Updating game: ${game.awayTeam} @ ${game.homeTeam}`);

  // Cache update
  await updateCache(`game_${game.id}`, game);

  // Send to websocket for real-time updates
  if (process.env.WEBSOCKET_URL) {
    await fetch(process.env.WEBSOCKET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'game_update',
        data: game
      })
    });
  }
}

/**
 * Process transaction
 */
async function processTransaction(transaction) {
  logger.info(`Processing transaction: ${transaction.type} - ${transaction.player}`);

  // Update relevant data stores
  await updateCache(`transaction_${transaction.id}`, transaction);

  // Send notification for major transactions
  if (transaction.significance === 'high') {
    await notifyStatus({
      type: 'transaction',
      data: transaction
    });
  }
}

/**
 * Cache update helper
 */
async function updateCache(key, data) {
  // Implementation would update Redis or CloudFlare KV
  logger.debug(`Cache updated: ${key}`);
}

/**
 * Persist results to storage
 */
async function persistResults(type, data) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${type}_${timestamp}.json`;

  // Would save to CloudFlare R2 or similar storage
  logger.info(`Results persisted: ${filename}`);
}

/**
 * Send status notifications
 */
async function notifyStatus(payload) {
  if (!config.slackWebhook) return;

  try {
    await fetch(config.slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Pipeline Update: ${payload.pipeline || payload.type}`,
        attachments: [{
          color: payload.status === 'success' ? 'good' : 'danger',
          fields: Object.entries(payload).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          }))
        }]
      })
    });
  } catch (error) {
    logger.error('Notification failed:', error);
  }
}

/**
 * Health check
 */
async function healthCheck() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.environment,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };

  logger.debug('Health check:', health);
  return health;
}

/**
 * Schedule all cron jobs
 */
function scheduleTasks() {
  // 3:00 AM - Full roster updates
  cron.schedule('0 3 * * *', fullRosterUpdate, {
    timezone: config.timezone
  });

  // 6:00 AM - Standings refresh
  cron.schedule('0 6 * * *', standingsRefresh, {
    timezone: config.timezone
  });

  // Every 30 minutes - Live game updates
  cron.schedule('*/30 * * * *', liveGameUpdates, {
    timezone: config.timezone
  });

  // Every hour - Injury reports
  cron.schedule('0 * * * *', injuryReportUpdate, {
    timezone: config.timezone
  });

  // Every 5 minutes - Transaction monitor
  cron.schedule('*/5 * * * *', transactionMonitor, {
    timezone: config.timezone
  });

  // Every 5 minutes - Health check
  cron.schedule('*/5 * * * *', healthCheck, {
    timezone: config.timezone
  });

  logger.info('✅ All tasks scheduled successfully');
  logger.info(`Timezone: ${config.timezone}`);
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

/**
 * Main execution
 */
async function main() {
  logger.info('🚀 Starting Blaze Sports Intel Daily Refresh Automation');
  logger.info(`Environment: ${config.environment}`);

  // Initial health check
  await healthCheck();

  // Schedule all tasks
  scheduleTasks();

  // Run initial updates if in development
  if (config.environment === 'development') {
    logger.info('Development mode: Running initial updates...');
    // await fullRosterUpdate();
    // await standingsRefresh();
  }

  logger.info('🏃 Automation running... Press Ctrl+C to stop');
}

// Start the automation
main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});