import { BaseAdapter, fetchWithRetry } from '@blazesportsintel/etl';
import { Team, Player, ScheduleGame, StandingRow, validators } from '@blazesportsintel/schema';

export class MLBAdapter extends BaseAdapter {
  private readonly baseUrl = 'https://statsapi.mlb.com/api/v1';

  constructor() {
    super('mlb');
  }

  async discover() {
    return {
      league: 'mlb',
      seasons: [2024, 2025],
      teams: 30
    };
  }

  async fetchTeams(season: number): Promise<Team[]> {
    const url = `${this.baseUrl}/teams?sportId=1&season=${season}`;
    const data = await fetchWithRetry(url);

    const teams: Team[] = [];

    for (const team of data.teams) {
      const normalized: Team = {
        id: `mlb_${team.id}`,
        leagueKey: 'mlb',
        season,
        name: team.name,
        nickname: team.teamName,
        city: team.locationName,
        state: team.venue?.state?.abbreviation,
        conference: team.league?.name, // AL/NL
        division: team.division?.name,
        siteUrl: team.officialSiteUrl || `https://www.mlb.com/${team.teamCode}`,
        externalRefs: [
          {
            source: 'mlb',
            id: String(team.id),
            url: `https://www.mlb.com/${team.teamCode}`,
            verified: true
          },
          {
            source: 'baseball-reference',
            id: team.abbreviation,
            url: `https://www.baseball-reference.com/teams/${team.abbreviation}/${season}.shtml`,
            verified: false
          }
        ]
      };
      teams.push(normalized);
    }

    return teams;
  }

  async fetchRosters(teamId: string, season: number): Promise<Player[]> {
    const mlbId = teamId.replace('mlb_', '');
    const url = `${this.baseUrl}/teams/${mlbId}/roster?season=${season}`;

    try {
      const data = await fetchWithRetry(url);
      const players: Player[] = [];

      for (const player of data.roster || []) {
        const normalized: Player = {
          id: `mlb_player_${player.person.id}`,
          teamId,
          name: player.person.fullName,
          position: player.position.abbreviation,
          jerseyNumber: player.jerseyNumber,
          bats: this.mapBatsThrows(player.person.batSide?.code),
          throws: this.mapBatsThrows(player.person.pitchHand?.code),
          height: player.person.height,
          weight: player.person.weight,
          dob: player.person.birthDate,
          hometown: `${player.person.birthCity || ''}, ${player.person.birthStateProvince || ''} ${player.person.birthCountry || ''}`.trim(),
          externalRefs: [
            {
              source: 'mlb',
              id: String(player.person.id),
              url: `https://www.mlb.com/player/${player.person.id}`,
              verified: true
            },
            {
              source: 'baseball-reference',
              id: player.person.nameSlug,
              url: `https://www.baseball-reference.com/players/${player.person.nameSlug?.[0]}/${player.person.nameSlug}.shtml`,
              verified: false
            }
          ]
        };
        players.push(normalized);
      }

      return players;
    } catch (error) {
      console.error(`Error fetching roster for team ${teamId}:`, error);
      return [];
    }
  }

  async fetchSchedule(season: number): Promise<ScheduleGame[]> {
    const url = `${this.baseUrl}/schedule?sportId=1&season=${season}&gameType=R`;
    const data = await fetchWithRetry(url);

    const games: ScheduleGame[] = [];

    for (const date of data.dates || []) {
      for (const game of date.games || []) {
        const normalized: ScheduleGame = {
          id: `mlb_game_${game.gamePk}`,
          leagueKey: 'mlb',
          season,
          gameDate: game.gameDate,
          homeTeamId: `mlb_${game.teams.home.team.id}`,
          awayTeamId: `mlb_${game.teams.away.team.id}`,
          homeScore: game.teams.home.score,
          awayScore: game.teams.away.score,
          venue: game.venue?.name,
          venueCity: game.venue?.location?.city,
          venueState: game.venue?.location?.state,
          status: this.mapGameStatus(game.status.detailedState),
          inning: game.linescore?.currentInning,
          externalIds: {
            mlb: String(game.gamePk)
          }
        };
        games.push(normalized);
      }
    }

    return games;
  }

  async fetchStandings(season: number): Promise<StandingRow[]> {
    const url = `${this.baseUrl}/standings?leagueId=103,104&season=${season}`;
    const data = await fetchWithRetry(url);

    const standings: StandingRow[] = [];

    for (const record of data.records || []) {
      for (const team of record.teamRecords || []) {
        const standing: StandingRow = {
          teamId: `mlb_${team.team.id}`,
          season,
          wins: team.wins,
          losses: team.losses,
          pct: parseFloat(team.winningPercentage),
          gb: team.gamesBack !== '-' ? parseFloat(team.gamesBack) : undefined,
          divisionRank: parseInt(team.divisionRank),
          last10: `${team.records?.splitRecords?.find((r: any) => r.type === 'last10')?.wins || 0}-${team.records?.splitRecords?.find((r: any) => r.type === 'last10')?.losses || 0}`,
          streak: team.streak?.streakCode,
          runsFor: team.runsScored,
          runsAgainst: team.runsAllowed
        };
        standings.push(standing);
      }
    }

    return standings;
  }

  normalize(data: any, type: string): any {
    return data;
  }

  validate(data: any, type: string): boolean {
    try {
      switch (type) {
        case 'team':
          validators.team.parse(data);
          return true;
        case 'player':
          validators.player.parse(data);
          return true;
        case 'schedule':
          validators.scheduleGame.parse(data);
          return true;
        case 'standings':
          validators.standingRow.parse(data);
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error(`Validation error for ${type}:`, error);
      return false;
    }
  }

  private mapBatsThrows(code?: string): 'L' | 'R' | 'S' | undefined {
    if (!code) return undefined;
    if (code === 'L') return 'L';
    if (code === 'R') return 'R';
    if (code === 'S') return 'S';
    return undefined;
  }

  private mapGameStatus(status: string): 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'cancelled' {
    const statusMap: Record<string, any> = {
      'Scheduled': 'scheduled',
      'Pre-Game': 'scheduled',
      'In Progress': 'in_progress',
      'Live': 'in_progress',
      'Final': 'final',
      'Game Over': 'final',
      'Postponed': 'postponed',
      'Cancelled': 'cancelled'
    };
    return statusMap[status] || 'scheduled';
  }
}