const { promises: fs } = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  try {
    const { league, season } = event.queryStringParameters || {};
    
    if (!league) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'League parameter required' })
      };
    }

    const validLeagues = ['nfl', 'mlb', 'ncaa_fb', 'college_bb', 'tx_hs_fb', 'pg_tx'];
    if (!validLeagues.includes(league)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid league' })
      };
    }

    const dataPath = path.join(process.cwd(), 'data', league, 'teams.jsonl');
    
    try {
      const data = await fs.readFile(dataPath, 'utf8');
      const teams = data.trim().split('\n').map(line => JSON.parse(line));
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          league,
          season: season || 2025,
          teams,
          count: teams.length,
          asOf: new Date().toISOString()
        })
      };
    } catch (fileError) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'Data not found',
          league,
          message: 'Run data refresh to populate teams data'
        })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
