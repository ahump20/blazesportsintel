import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';

const USER_AGENT = 'BlazeSportsIntelBot/1.0';

// NFL teams with metadata
const NFL_TEAMS = [
  { id: 'ari', name: 'Arizona Cardinals', city: 'Arizona', conference: 'NFC', division: 'NFC West' },
  { id: 'atl', name: 'Atlanta Falcons', city: 'Atlanta', conference: 'NFC', division: 'NFC South' },
  { id: 'buf', name: 'Buffalo Bills', city: 'Buffalo', conference: 'AFC', division: 'AFC East' },
  { id: 'car', name: 'Carolina Panthers', city: 'Carolina', conference: 'NFC', division: 'NFC South' },
  { id: 'chi', name: 'Chicago Bears', city: 'Chicago', conference: 'NFC', division: 'NFC North' },
  { id: 'cin', name: 'Cincinnati Bengals', city: 'Cincinnati', conference: 'AFC', division: 'AFC North' },
  { id: 'cle', name: 'Cleveland Browns', city: 'Cleveland', conference: 'AFC', division: 'AFC North' },
  { id: 'dal', name: 'Dallas Cowboys', city: 'Dallas', conference: 'NFC', division: 'NFC East' },
  { id: 'den', name: 'Denver Broncos', city: 'Denver', conference: 'AFC', division: 'AFC West' },
  { id: 'det', name: 'Detroit Lions', city: 'Detroit', conference: 'NFC', division: 'NFC North' },
  { id: 'gb', name: 'Green Bay Packers', city: 'Green Bay', conference: 'NFC', division: 'NFC North' },
  { id: 'hou', name: 'Houston Texans', city: 'Houston', conference: 'AFC', division: 'AFC South' },
  { id: 'ind', name: 'Indianapolis Colts', city: 'Indianapolis', conference: 'AFC', division: 'AFC South' },
  { id: 'jax', name: 'Jacksonville Jaguars', city: 'Jacksonville', conference: 'AFC', division: 'AFC South' },
  { id: 'kc', name: 'Kansas City Chiefs', city: 'Kansas City', conference: 'AFC', division: 'AFC West' },
  { id: 'lv', name: 'Las Vegas Raiders', city: 'Las Vegas', conference: 'AFC', division: 'AFC West' },
  { id: 'lac', name: 'Los Angeles Chargers', city: 'Los Angeles', conference: 'AFC', division: 'AFC West' },
  { id: 'lar', name: 'Los Angeles Rams', city: 'Los Angeles', conference: 'NFC', division: 'NFC West' },
  { id: 'mia', name: 'Miami Dolphins', city: 'Miami', conference: 'AFC', division: 'AFC East' },
  { id: 'min', name: 'Minnesota Vikings', city: 'Minnesota', conference: 'NFC', division: 'NFC North' },
  { id: 'ne', name: 'New England Patriots', city: 'New England', conference: 'AFC', division: 'AFC East' },
  { id: 'no', name: 'New Orleans Saints', city: 'New Orleans', conference: 'NFC', division: 'NFC South' },
  { id: 'nyg', name: 'New York Giants', city: 'New York', conference: 'NFC', division: 'NFC East' },
  { id: 'nyj', name: 'New York Jets', city: 'New York', conference: 'AFC', division: 'AFC East' },
  { id: 'phi', name: 'Philadelphia Eagles', city: 'Philadelphia', conference: 'NFC', division: 'NFC East' },
  { id: 'pit', name: 'Pittsburgh Steelers', city: 'Pittsburgh', conference: 'AFC', division: 'AFC North' },
  { id: 'sf', name: 'San Francisco 49ers', city: 'San Francisco', conference: 'NFC', division: 'NFC West' },
  { id: 'sea', name: 'Seattle Seahawks', city: 'Seattle', conference: 'NFC', division: 'NFC West' },
  { id: 'tb', name: 'Tampa Bay Buccaneers', city: 'Tampa Bay', conference: 'NFC', division: 'NFC South' },
  { id: 'ten', name: 'Tennessee Titans', city: 'Tennessee', conference: 'AFC', division: 'AFC South' },
  { id: 'was', name: 'Washington Commanders', city: 'Washington', conference: 'NFC', division: 'NFC East' }
];

export async function refresh({ asOf, dataDir }) {
  console.log('🏈 NFL Data Refresh starting...');
  
  await fs.mkdir(dataDir, { recursive: true });
  
  const metadata = {
    league: 'nfl',
    asOf,
    refreshTime: new Date().toISOString(),
    source: 'NFL.com + Pro Football Reference',
    season: 2025
  };
  
  // Create teams with external references
  const teams = NFL_TEAMS.map(team => ({
    id: `nfl_${team.id}`,
    leagueKey: 'nfl',
    season: 2025,
    name: team.name,
    nickname: team.name.split(' ').slice(-1)[0],
    city: team.city,
    state: '',
    conference: team.conference,
    division: team.division,
    externalRefs: [
      {
        source: 'nfl.com',
        id: team.id,
        url: `https://www.nfl.com/teams/${team.id}`
      },
      {
        source: 'pro-football-reference',
        id: team.id.toUpperCase(),
        url: `https://www.pro-football-reference.com/teams/${team.id}/2024.htm`
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
  
  console.log(`✅ NFL: ${teams.length} teams`);
  
  return {
    teams: teams.length,
    metadata
  };
}
