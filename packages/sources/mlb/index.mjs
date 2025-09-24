import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';

const MLB_API = 'https://statsapi.mlb.com/api/v1';
const USER_AGENT = 'BlazeSportsIntelBot/1.0';

async function fetchMLBData(endpoint) {
  const response = await fetch(`${MLB_API}${endpoint}`, {
    headers: { 'User-Agent': USER_AGENT }
  });
  
  if (!response.ok) {
    throw new Error(`MLB API error: ${response.status}`);
  }
  
  return response.json();
}

export async function refresh({ asOf, dataDir }) {
  console.log('⚾ MLB Data Refresh starting...');
  
  await fs.mkdir(dataDir, { recursive: true });
  
  const metadata = {
    league: 'mlb',
    asOf,
    refreshTime: new Date().toISOString(),
    source: 'MLB Stats API',
    season: 2025
  };
  
  // Fetch teams
  const teamsData = await fetchMLBData('/teams?season=2025&sportId=1');
  const teams = teamsData.teams.map(team => ({
    id: `mlb_${team.id}`,
    leagueKey: 'mlb',
    season: 2025,
    name: team.name,
    nickname: team.teamName,
    city: team.locationName || '',
    state: team.venue?.state || '',
    division: team.division?.name || '',
    externalRefs: [
      {
        source: 'mlb.com',
        id: String(team.id),
        url: `https://www.mlb.com/team/${team.fileCode}`
      },
      {
        source: 'baseball-reference',
        id: team.abbreviation,
        url: `https://www.baseball-reference.com/teams/${team.abbreviation}/2025.shtml`
      }
    ],
    asOf
  }));
  
  await fs.writeFile(
    path.join(dataDir, 'teams.jsonl'),
    teams.map(t => JSON.stringify(t)).join('\n')
  );
  
  await fs.writeFile(
    path.join(dataDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  console.log(`✅ MLB: ${teams.length} teams`);
  
  return {
    teams: teams.length,
    metadata
  };
}
