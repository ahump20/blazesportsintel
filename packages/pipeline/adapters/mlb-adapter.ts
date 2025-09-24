/**
 * MLB Data Adapter - St. Louis Cardinals Emphasis
 * Official MLB Stats API Integration
 */

import { z } from 'zod';
import fetch from 'node-fetch';
import { Team, Player, Game, Standing, PlayerStats } from '../../schema';

const MLB_API_BASE = process.env.MLB_API_BASE || 'https://statsapi.mlb.com/api/v1';

export class MLBAdapter {
  private userAgent = process.env.BLAZE_USER_AGENT || 'BlazeSportsIntelBot/1.0';

  async discover(): Promise<{ teams: string[], seasons: string[] }> {
    const teamsResponse = await this.fetch('/teams?sportId=1&season=2025');
    const teams = teamsResponse.teams.map((t: any) => t.id.toString());

    return {
      teams,
      seasons: ['2025', '2024', '2023']
    };
  }

  async fetchTeam(teamId: string, season: string): Promise<Team> {
    const response = await this.fetch(`/teams/${teamId}?season=${season}`);
    const team = response.teams[0];

    // Special emphasis on Cardinals
    const isCardinals = team.name === 'St. Louis Cardinals';

    return {
      id: team.id.toString(),
      leagueId: 'mlb',
      seasonId: `mlb-${season}`,
      slug: team.fileCode,
      name: team.teamName,
      displayName: team.name,
      abbreviation: team.abbreviation,
      location: {
        city: team.locationName,
        state: team.venue?.state || 'MO',
        venue: team.venue?.name
      },
      colors: {
        primary: isCardinals ? '#C41E3A' : (team.teamColor || '#000000'),
        secondary: isCardinals ? '#0C2340' : (team.secondaryColor || '#FFFFFF'),
        accent: isCardinals ? '#FEDB00' : undefined
      },
      logos: {
        primary: `https://www.mlbstatic.com/team-logos/${team.id}.svg`,
        secondary: undefined,
        wordmark: undefined
      },
      division: team.division?.name,
      conference: team.league?.name,
      externalRefs: {
        official: team.link ? `https://mlb.com${team.link}` : `https://www.mlb.com/${team.fileCode}`,
        espn: `https://www.espn.com/mlb/team/_/name/${team.abbreviation.toLowerCase()}`,
        sportsReference: `https://www.baseball-reference.com/teams/${team.abbreviation}/${season}.shtml`
      },
      metadata: isCardinals ? {
        emphasis: 'primary',
        championships: 11,
        lastChampionship: 2011,
        notableAlumni: ['Stan Musial', 'Bob Gibson', 'Ozzie Smith', 'Albert Pujols']
      } : {}
    };
  }

  async fetchRoster(teamId: string, season: string): Promise<Player[]> {
    const response = await this.fetch(`/teams/${teamId}/roster?season=${season}`);

    return response.roster.map((p: any) => ({
      id: p.person.id.toString(),
      teamId: teamId,
      seasonId: `mlb-${season}`,
      firstName: p.person.firstName,
      lastName: p.person.lastName,
      displayName: p.person.fullName,
      jerseyNumber: p.jerseyNumber,
      position: p.position.abbreviation,
      positionGroup: p.position.type,
      height: p.person.height,
      weight: p.person.weight,
      birthDate: p.person.birthDate,
      hometown: p.person.birthCity ? {
        city: p.person.birthCity,
        state: p.person.birthStateProvince || '',
        highSchool: undefined
      } : undefined,
      photoUrl: `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,d_people:generic:headshot:67:current.png/v1/people/${p.person.id}/headshot/67/current`,
      externalRefs: {
        espn: `https://www.espn.com/mlb/player/_/id/${p.person.id}`,
        sportsReference: `https://www.baseball-reference.com/players/${p.person.lastName[0].toLowerCase()}/${p.person.lastName.slice(0, 5).toLowerCase()}${p.person.firstName.slice(0, 2).toLowerCase()}01.shtml`
      },
      active: p.status.code === 'A'
    }));
  }

  async fetchSchedule(teamId: string, season: string): Promise<Game[]> {
    const response = await this.fetch(
      `/schedule?teamId=${teamId}&season=${season}&sportId=1&gameType=R,F,D,L,W`
    );

    const games: Game[] = [];

    for (const date of response.dates || []) {
      for (const game of date.games || []) {
        games.push({
          id: game.gamePk.toString(),
          leagueId: 'mlb',
          seasonId: `mlb-${season}`,
          gameDate: game.gameDate,
          gameType: this.mapGameType(game.gameType),
          homeTeam: {
            id: game.teams.home.team.id.toString(),
            name: game.teams.home.team.name,
            abbreviation: game.teams.home.team.abbreviation,
            score: game.teams.home.score,
            record: game.teams.home.leagueRecord ? {
              wins: game.teams.home.leagueRecord.wins,
              losses: game.teams.home.leagueRecord.losses,
              ties: 0
            } : undefined
          },
          awayTeam: {
            id: game.teams.away.team.id.toString(),
            name: game.teams.away.team.name,
            abbreviation: game.teams.away.team.abbreviation,
            score: game.teams.away.score,
            record: game.teams.away.leagueRecord ? {
              wins: game.teams.away.leagueRecord.wins,
              losses: game.teams.away.leagueRecord.losses,
              ties: 0
            } : undefined
          },
          venue: {
            name: game.venue?.name || 'TBD',
            city: game.venue?.location?.city || '',
            state: game.venue?.location?.state || ''
          },
          status: this.mapGameStatus(game.status.statusCode),
          period: game.linescore?.currentInning?.toString(),
          broadcast: game.broadcasts?.map((b: any) => b.name),
          attendance: game.attendance,
          externalRefs: {
            official: `https://www.mlb.com/gameday/${game.gamePk}`,
            espn: `https://www.espn.com/mlb/game/_/gameId/${game.gamePk}`
          }
        });
      }
    }

    return games;
  }

  async fetchStandings(division?: string): Promise<Standing[]> {
    const endpoint = division
      ? `/standings?leagueId=103,104&season=2025&standingsTypes=regularSeason&hydrate=division`
      : `/standings?leagueId=103,104&season=2025`;

    const response = await this.fetch(endpoint);
    const standings: Standing[] = [];

    for (const record of response.records || []) {
      for (const teamRecord of record.teamRecords || []) {
        standings.push({
          id: `${teamRecord.team.id}-2025`,
          teamId: teamRecord.team.id.toString(),
          seasonId: 'mlb-2025',
          division: record.division?.name,
          conference: record.league?.name,
          rank: teamRecord.divisionRank ? parseInt(teamRecord.divisionRank) : 0,
          wins: teamRecord.wins,
          losses: teamRecord.losses,
          ties: 0,
          winPercentage: parseFloat(teamRecord.winningPercentage),
          gamesBack: teamRecord.gamesBack ? parseFloat(teamRecord.gamesBack) : undefined,
          divisionRecord: teamRecord.records?.divisionRecords?.[0] ? {
            wins: teamRecord.records.divisionRecords[0].wins,
            losses: teamRecord.records.divisionRecords[0].losses
          } : undefined,
          homeRecord: {
            wins: teamRecord.records?.splitRecords?.find((r: any) => r.type === 'home')?.wins || 0,
            losses: teamRecord.records?.splitRecords?.find((r: any) => r.type === 'home')?.losses || 0
          },
          awayRecord: {
            wins: teamRecord.records?.splitRecords?.find((r: any) => r.type === 'away')?.wins || 0,
            losses: teamRecord.records?.splitRecords?.find((r: any) => r.type === 'away')?.losses || 0
          },
          streak: teamRecord.streak?.streakCode || '',
          lastTen: teamRecord.records?.splitRecords?.find((r: any) => r.type === 'lastTen') ? {
            wins: teamRecord.records.splitRecords.find((r: any) => r.type === 'lastTen').wins,
            losses: teamRecord.records.splitRecords.find((r: any) => r.type === 'lastTen').losses
          } : undefined,
          pointsFor: teamRecord.runsScored,
          pointsAgainst: teamRecord.runsAllowed,
          differential: teamRecord.runDifferential
        });
      }
    }

    return standings;
  }

  async fetchPlayerStats(playerId: string, season: string): Promise<PlayerStats> {
    const response = await this.fetch(
      `/people/${playerId}/stats?stats=season&season=${season}&group=hitting,pitching`
    );

    const stats = response.stats?.[0];
    if (!stats) throw new Error(`No stats found for player ${playerId}`);

    const statLine = stats.splits?.[0]?.stat;

    return {
      id: `${playerId}-${season}`,
      playerId,
      seasonId: `mlb-${season}`,
      statsType: 'season',
      batting: stats.group === 'hitting' ? {
        ab: statLine.atBats,
        r: statLine.runs,
        h: statLine.hits,
        rbi: statLine.rbi,
        bb: statLine.baseOnBalls,
        so: statLine.strikeOuts,
        avg: parseFloat(statLine.avg),
        obp: parseFloat(statLine.obp),
        slg: parseFloat(statLine.slg),
        ops: parseFloat(statLine.ops),
        hr: statLine.homeRuns,
        sb: statLine.stolenBases
      } : undefined,
      pitching: stats.group === 'pitching' ? {
        w: statLine.wins,
        l: statLine.losses,
        era: parseFloat(statLine.era),
        g: statLine.gamesPlayed,
        gs: statLine.gamesStarted,
        sv: statLine.saves,
        ip: parseFloat(statLine.inningsPitched),
        h: statLine.hits,
        r: statLine.runs,
        er: statLine.earnedRuns,
        bb: statLine.baseOnBalls,
        so: statLine.strikeOuts,
        whip: parseFloat(statLine.whip)
      } : undefined
    };
  }

  private async fetch(endpoint: string): Promise<any> {
    const response = await fetch(`${MLB_API_BASE}${endpoint}`, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`MLB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private mapGameType(type: string): Game['gameType'] {
    switch (type) {
      case 'R': return 'regular';
      case 'F':
      case 'D':
      case 'L':
      case 'W': return 'playoff';
      case 'C': return 'championship';
      default: return 'exhibition';
    }
  }

  private mapGameStatus(code: string): Game['status'] {
    switch (code) {
      case 'S':
      case 'P': return 'scheduled';
      case 'I':
      case 'MA':
      case 'MG':
      case 'MB':
      case 'MT': return 'in_progress';
      case 'F':
      case 'O':
      case 'C': return 'final';
      case 'D': return 'postponed';
      case 'CI':
      case 'CE':
      case 'CR': return 'cancelled';
      default: return 'scheduled';
    }
  }

  normalize(data: any): any {
    // Data is already normalized by individual fetch methods
    return data;
  }

  validate(data: any): boolean {
    // Use zod schemas for validation
    try {
      if (data.teams) {
        data.teams.forEach((team: any) => Team.parse(team));
      }
      if (data.players) {
        data.players.forEach((player: any) => Player.parse(player));
      }
      if (data.games) {
        data.games.forEach((game: any) => Game.parse(game));
      }
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }

  async persist(data: any, outputPath: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Write JSONL format
    const jsonlPath = path.join(outputPath, 'mlb', new Date().toISOString().split('T')[0]);
    await fs.mkdir(jsonlPath, { recursive: true });

    for (const [key, items] of Object.entries(data)) {
      if (Array.isArray(items)) {
        const content = items.map(item => JSON.stringify(item)).join('\n');
        await fs.writeFile(path.join(jsonlPath, `${key}.jsonl`), content);
      }
    }
  }

  async report(): Promise<{ status: string; metrics: any }> {
    return {
      status: 'healthy',
      metrics: {
        lastUpdate: new Date().toISOString(),
        adapter: 'MLB',
        dataSource: MLB_API_BASE,
        emphasis: 'St. Louis Cardinals'
      }
    };
  }
}