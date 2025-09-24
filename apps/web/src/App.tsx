import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';

const API_URL = import.meta.env.PROD
  ? 'https://api.blazesportsintel.com/v1'
  : 'http://localhost:8787/v1';

// League data
const LEAGUES = [
  { key: 'nfl', name: 'NFL', sport: 'football' },
  { key: 'mlb', name: 'MLB', sport: 'baseball' },
  { key: 'ncaa_fb', name: 'NCAA Football', sport: 'football' },
  { key: 'college_bb', name: 'College Baseball', sport: 'baseball' },
  { key: 'tx_hs_fb', name: 'Texas HS Football', sport: 'football' },
  { key: 'pg_tx', name: 'Perfect Game Texas', sport: 'baseball' }
];

// Home component
function Home() {
  const [metadata, setMetadata] = useState<any>({});

  useEffect(() => {
    // Fetch metadata for each league
    LEAGUES.slice(0, 2).forEach(async (league) => {
      try {
        const res = await fetch(`${API_URL}/${league.key}/2025/metadata`);
        if (res.ok) {
          const data = await res.json();
          setMetadata((prev: any) => ({ ...prev, [league.key]: data }));
        }
      } catch (error) {
        console.error(`Error fetching metadata for ${league.key}:`, error);
      }
    });
  }, []);

  return (
    <div className="home">
      <header className="header">
        <h1>⚡ Blaze Sports Intel</h1>
        <p className="tagline">Comprehensive Sports Data Platform</p>
        <p className="as-of">Data as of: {new Date().toISOString().split('T')[0]}</p>
      </header>

      <section className="leagues">
        <h2>Available Leagues</h2>
        <div className="league-grid">
          {LEAGUES.map(league => (
            <Link key={league.key} to={`/league/${league.key}`} className="league-card">
              <h3>{league.name}</h3>
              <p className="sport-tag">{league.sport}</p>
              {metadata[league.key] && (
                <div className="stats">
                  <span>{metadata[league.key].recordCounts?.teams || 0} teams</span>
                  <span>{metadata[league.key].recordCounts?.players || 0} players</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section className="features">
        <h2>Features</h2>
        <ul>
          <li>✓ Daily updated rosters and standings</li>
          <li>✓ Verified link-outs to official sources</li>
          <li>✓ Texas high school football coverage</li>
          <li>✓ Perfect Game baseball integration</li>
          <li>✓ RESTful API access</li>
        </ul>
      </section>

      <footer className="footer">
        <p>© 2025 Blaze Intelligence | <a href="https://github.com/blazesportsintel" target="_blank">GitHub</a></p>
        <p className="compliance">Data collected in compliance with robots.txt and Terms of Service</p>
      </footer>
    </div>
  );
}

// League page component
function LeaguePage() {
  const { leagueKey } = useParams<{ leagueKey: string }>();
  const [teams, setTeams] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const league = LEAGUES.find(l => l.key === leagueKey);
  const season = new Date().getFullYear();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch teams
        const teamsRes = await fetch(`${API_URL}/${leagueKey}/${season}/teams`);
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          setTeams(teamsData);
        }

        // Fetch standings
        const standingsRes = await fetch(`${API_URL}/${leagueKey}/${season}/standings`);
        if (standingsRes.ok) {
          const standingsData = await standingsRes.json();
          setStandings(standingsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (leagueKey) {
      fetchData();
    }
  }, [leagueKey]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="league-page">
      <nav className="nav">
        <Link to="/">← Back to Home</Link>
      </nav>

      <header className="header">
        <h1>{league?.name}</h1>
        <p>{season} Season</p>
      </header>

      <section className="teams-section">
        <h2>Teams</h2>
        <div className="teams-grid">
          {teams.map(team => (
            <div key={team.id} className="team-card">
              <Link to={`/team/${team.id}`}>
                <h3>{team.name}</h3>
                {team.city && <p>{team.city}, {team.state}</p>}
                <p className="division">{team.conference} - {team.division || team.district}</p>
              </Link>

              <div className="link-outs">
                <h4>Official Links:</h4>
                {team.externalRefs?.map((ref: any, idx: number) => (
                  <a key={idx} href={ref.url} target="_blank" rel="noopener noreferrer" className="linkout">
                    {ref.source} ↗
                  </a>
                ))}
                {team.siteUrl && (
                  <a href={team.siteUrl} target="_blank" rel="noopener noreferrer" className="linkout">
                    Official Site ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {standings.length > 0 && (
        <section className="standings-section">
          <h2>Standings</h2>
          <table className="standings-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>W</th>
                <th>L</th>
                <th>PCT</th>
                <th>GB</th>
                <th>Streak</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, idx) => {
                const team = teams.find(t => t.id === row.teamId);
                return (
                  <tr key={idx}>
                    <td>{team?.name || row.teamId}</td>
                    <td>{row.wins}</td>
                    <td>{row.losses}</td>
                    <td>{row.pct.toFixed(3)}</td>
                    <td>{row.gb || '-'}</td>
                    <td>{row.streak || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

// Team page component
function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const season = new Date().getFullYear();
  const leagueKey = teamId?.split('_')[0];

  useEffect(() => {
    async function fetchData() {
      if (!teamId || !leagueKey) return;

      setLoading(true);
      try {
        // Fetch team info
        const teamsRes = await fetch(`${API_URL}/${leagueKey}/${season}/teams`);
        if (teamsRes.ok) {
          const teams = await teamsRes.json();
          const teamData = teams.find((t: any) => t.id === teamId);
          setTeam(teamData);
        }

        // Fetch roster
        const rosterRes = await fetch(`${API_URL}/${leagueKey}/${season}/roster?teamId=${teamId}`);
        if (rosterRes.ok) {
          const rosterData = await rosterRes.json();
          setRoster(rosterData);
        }

        // Fetch schedule
        const scheduleRes = await fetch(`${API_URL}/${leagueKey}/${season}/schedules?teamId=${teamId}`);
        if (scheduleRes.ok) {
          const scheduleData = await scheduleRes.json();
          setSchedule(scheduleData);
        }
      } catch (error) {
        console.error('Error fetching team data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [teamId, leagueKey]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!team) {
    return <div>Team not found</div>;
  }

  return (
    <div className="team-page">
      <nav className="nav">
        <Link to={`/league/${leagueKey}`}>← Back to {leagueKey?.toUpperCase()}</Link>
      </nav>

      <header className="header">
        <h1>{team.name}</h1>
        <p>{team.city}, {team.state}</p>
        <p>{team.conference} - {team.division}</p>
      </header>

      <section className="link-outs-section">
        <h2>Official Links</h2>
        <div className="link-outs">
          {team.externalRefs?.map((ref: any, idx: number) => (
            <a key={idx} href={ref.url} target="_blank" rel="noopener noreferrer" className="linkout-large">
              View on {ref.source} ↗
            </a>
          ))}
          {team.siteUrl && (
            <a href={team.siteUrl} target="_blank" rel="noopener noreferrer" className="linkout-large">
              Official Team Website ↗
            </a>
          )}
        </div>
      </section>

      {roster.length > 0 && (
        <section className="roster-section">
          <h2>Roster</h2>
          <table className="roster-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Position</th>
                <th>Height</th>
                <th>Weight</th>
                <th>Links</th>
              </tr>
            </thead>
            <tbody>
              {roster.map(player => (
                <tr key={player.id}>
                  <td>{player.jerseyNumber || '-'}</td>
                  <td>{player.name}</td>
                  <td>{player.position}</td>
                  <td>{player.height || '-'}</td>
                  <td>{player.weight || '-'}</td>
                  <td>
                    {player.externalRefs?.map((ref: any, idx: number) => (
                      <a key={idx} href={ref.url} target="_blank" rel="noopener noreferrer" className="player-link">
                        {ref.source} ↗
                      </a>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {schedule.length > 0 && (
        <section className="schedule-section">
          <h2>Schedule</h2>
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Opponent</th>
                <th>Location</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map(game => {
                const isHome = game.homeTeamId === teamId;
                const opponent = isHome ? game.awayTeamId : game.homeTeamId;
                const score = game.status === 'final'
                  ? `${isHome ? game.homeScore : game.awayScore}-${isHome ? game.awayScore : game.homeScore}`
                  : game.status;

                return (
                  <tr key={game.id}>
                    <td>{new Date(game.gameDate).toLocaleDateString()}</td>
                    <td>{opponent}</td>
                    <td>{isHome ? 'Home' : 'Away'}</td>
                    <td>{score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

// Main App component
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/league/:leagueKey" element={<LeaguePage />} />
        <Route path="/team/:teamId" element={<TeamPage />} />
      </Routes>
    </Router>
  );
}