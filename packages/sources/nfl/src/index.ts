import { BaseAdapter, fetchWithRetry, parseHtml, buildLinkout } from '@blazesportsintel/etl';
import { Team, Player, Staff, ScheduleGame, StandingRow, validators } from '@blazesportsintel/schema';

export class NFLAdapter extends BaseAdapter {
  private readonly baseUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

  constructor() {
    super('nfl');
  }

  async discover() {
    return {
      league: 'nfl',
      seasons: [2024, 2025],
      teams: 32
    };
  }

  async fetchTeams(season: number): Promise<Team[]> {
    const url = `${this.baseUrl}/teams?limit=32`;
    const data = await fetchWithRetry(url);

    const teams: Team[] = [];

    for (const team of data.sports[0].leagues[0].teams) {
      const normalized: Team = {
        id: `nfl_${team.team.id}`,
        leagueKey: 'nfl',
        season,
        name: team.team.displayName,
        nickname: team.team.nickname || team.team.name,
        city: team.team.location,
        state: this.getStateFromCity(team.team.location),
        conference: team.team.groups?.conference?.name,
        division: team.team.groups?.division?.name,
        siteUrl: team.team.links?.[0]?.href,
        externalRefs: [
          {
            source: 'espn',
            id: team.team.id,
            url: team.team.links?.[0]?.href,
            verified: true
          },
          {
            source: 'nfl.com',
            id: team.team.abbreviation,
            url: `https://www.nfl.com/teams/${team.team.slug}/`,
            verified: false
          },
          {
            source: 'pro-football-reference',
            id: team.team.abbreviation.toLowerCase(),
            url: `https://www.pro-football-reference.com/teams/${team.team.abbreviation.toLowerCase()}/`,
            verified: false
          }
        ]
      };
      teams.push(normalized);
    }

    return teams;
  }

  async fetchRosters(teamId: string, season: number): Promise<Player[]> {
    const espnId = teamId.replace('nfl_', '');
    const url = `${this.baseUrl}/teams/${espnId}/roster`;

    try {
      const data = await fetchWithRetry(url);
      const players: Player[] = [];

      if (data.athletes) {
        for (const group of data.athletes) {
          for (const athlete of group.items) {
            const player: Player = {
              id: `nfl_player_${athlete.id}`,
              teamId,
              name: athlete.displayName,
              position: athlete.position.abbreviation,
              jerseyNumber: athlete.jersey,
              height: athlete.displayHeight,
              weight: athlete.displayWeight ? parseInt(athlete.displayWeight) : undefined,
              dob: athlete.dateOfBirth,
              hometown: `${athlete.birthPlace?.city || ''}, ${athlete.birthPlace?.state || ''}`.trim(),
              externalRefs: [
                {
                  source: 'espn',
                  id: athlete.id,
                  url: athlete.links?.[0]?.href,
                  verified: true
                }
              ]
            };
            players.push(player);
          }
        }
      }

      return players;
    } catch (error) {
      console.error(`Error fetching roster for team ${teamId}:`, error);
      return [];
    }
  }

  async fetchSchedule(season: number): Promise<ScheduleGame[]> {
    const weeks = 18; // Regular season weeks
    const games: ScheduleGame[] = [];

    for (let week = 1; week <= weeks; week++) {
      const url = `${this.baseUrl}/scoreboard?week=${week}&seasontype=2&season=${season}`;

      try {
        const data = await fetchWithRetry(url);

        if (data.events) {
          for (const event of data.events) {
            const game: ScheduleGame = {
              id: `nfl_game_${event.id}`,
              leagueKey: 'nfl',
              season,
              gameDate: event.date,
              homeTeamId: `nfl_${event.competitions[0].competitors.find((c: any) => c.homeAway === 'home').id}`,
              awayTeamId: `nfl_${event.competitions[0].competitors.find((c: any) => c.homeAway === 'away').id}`,
              homeScore: event.competitions[0].competitors.find((c: any) => c.homeAway === 'home').score?.value,
              awayScore: event.competitions[0].competitors.find((c: any) => c.homeAway === 'away').score?.value,
              venue: event.competitions[0].venue?.fullName,
              venueCity: event.competitions[0].venue?.address?.city,
              venueState: event.competitions[0].venue?.address?.state,
              status: this.mapGameStatus(event.status.type.name),
              week,
              externalIds: {
                espn: event.id
              }
            };
            games.push(game);
          }
        }
      } catch (error) {
        console.error(`Error fetching schedule for week ${week}:`, error);
      }
    }

    return games;
  }

  async fetchStandings(season: number): Promise<StandingRow[]> {
    const url = `${this.baseUrl}/standings?season=${season}`;
    const data = await fetchWithRetry(url);

    const standings: StandingRow[] = [];

    if (data.children) {
      for (const conference of data.children) {
        for (const division of conference.children || []) {
          for (const team of division.standings.entries) {
            const standing: StandingRow = {
              teamId: `nfl_${team.team.id}`,
              season,
              wins: team.stats.find((s: any) => s.name === 'wins')?.value || 0,
              losses: team.stats.find((s: any) => s.name === 'losses')?.value || 0,
              ties: team.stats.find((s: any) => s.name === 'ties')?.value || 0,
              pct: team.stats.find((s: any) => s.name === 'winPercent')?.value || 0,
              divisionRank: team.stats.find((s: any) => s.name === 'divisionRank')?.value,
              conferenceRank: team.stats.find((s: any) => s.name === 'conferenceRank')?.value,
              pointsFor: team.stats.find((s: any) => s.name === 'pointsFor')?.value,
              pointsAgainst: team.stats.find((s: any) => s.name === 'pointsAgainst')?.value,
              streak: team.stats.find((s: any) => s.name === 'streak')?.displayValue
            };
            standings.push(standing);
          }
        }
      }
    }

    return standings;
  }

  async fetchStaff(teamId: string, season: number): Promise<Staff[]> {
    // NFL.com or team sites would be scraped here for coaching staff
    // For now, return empty array with link-outs
    return [];
  }

  normalize(data: any, type: string): any {
    // Already normalized in fetch methods
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
        case 'staff':
          validators.staff.parse(data);
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

  private getStateFromCity(city: string): string {
    const cityStateMap: Record<string, string> = {
      'Arizona': 'AZ',
      'Atlanta': 'GA',
      'Baltimore': 'MD',
      'Buffalo': 'NY',
      'Carolina': 'NC',
      'Chicago': 'IL',
      'Cincinnati': 'OH',
      'Cleveland': 'OH',
      'Dallas': 'TX',
      'Denver': 'CO',
      'Detroit': 'MI',
      'Green Bay': 'WI',
      'Houston': 'TX',
      'Indianapolis': 'IN',
      'Jacksonville': 'FL',
      'Kansas City': 'MO',
      'Las Vegas': 'NV',
      'Los Angeles': 'CA',
      'Miami': 'FL',
      'Minnesota': 'MN',
      'New England': 'MA',
      'New Orleans': 'LA',
      'New York': 'NY',
      'Philadelphia': 'PA',
      'Pittsburgh': 'PA',
      'San Francisco': 'CA',
      'Seattle': 'WA',
      'Tampa Bay': 'FL',
      'Tennessee': 'TN',
      'Washington': 'DC'
    };

    for (const [cityName, state] of Object.entries(cityStateMap)) {
      if (city.includes(cityName)) {
        return state;
      }
    }
    return '';
  }

  private mapGameStatus(status: string): 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'cancelled' {
    const statusMap: Record<string, any> = {
      'STATUS_SCHEDULED': 'scheduled',
      'STATUS_IN_PROGRESS': 'in_progress',
      'STATUS_FINAL': 'final',
      'STATUS_POSTPONED': 'postponed',
      'STATUS_CANCELED': 'cancelled'
    };
    return statusMap[status] || 'scheduled';
  }
}