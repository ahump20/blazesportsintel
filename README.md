# Blaze Sports Intel - The Deep South Sports Authority

## Texas Football & SEC Analytics Platform

Comprehensive sports intelligence platform covering Texas high school football, Perfect Game baseball, NCAA, NFL, and MLB data.

## Architecture Overview

```
blazesportsintel/
├── data-pipelines/       # Sport-specific data processing
├── api/                  # REST & GraphQL endpoints
├── scrapers/             # Data collection adapters
├── processors/           # Data transformation & aggregation
├── storage/              # CloudFlare R2, Redis, Historical data
├── automation/           # Cron jobs & monitoring
└── web/                  # blazesportsintel.com frontend
```

## Data Coverage

### Texas High School Football
- **UIL Coverage**: All classifications (6A through 1A)
- **Dave Campbell's Texas Football**: Official integration
- **MaxPreps**: Supplemental statistics
- **Historical Records**: Complete archives since 2020

### Perfect Game Baseball
- **Texas Tournaments**: 14U through 18U
- **Player Profiles**: Comprehensive scouting data
- **Rankings**: Team and individual rankings
- **Commitment Tracking**: College commitment monitoring

### NCAA Football & Baseball
- **Power 5 Conferences**: Complete coverage
- **Group of 5**: Full statistics
- **Texas Focus**: Enhanced coverage for Texas schools
- **Recruiting**: 247Sports, Rivals integration

### Professional Sports
- **NFL**: All 32 teams with enhanced Cowboys/Texans coverage
- **MLB**: Complete league coverage with Astros/Rangers focus
- **Real-time Updates**: Live game data and transactions
- **Historical Stats**: Complete archives

## Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Refresh all data pipelines
pnpm refresh:all

# Deploy to production
pnpm deploy
```

## API Endpoints

### REST API
```
GET /api/v1/teams/{sport}/{league}/{team}
GET /api/v1/players/{sport}/{id}
GET /api/v1/games/{sport}/live
GET /api/v1/standings/{sport}/{league}
GET /api/v1/stats/{sport}/{category}
POST /api/v1/webhooks/update
```

### GraphQL
```
query {
  team(sport: "football", league: "nfl", id: "DAL") {
    name
    standings
    roster
    schedule
  }
}
```

## Daily Operations

### Automated Refresh Schedule (US/Central)
- **3:00 AM**: Full roster updates
- **6:00 AM**: Standings refresh
- **Every 30 min**: Live game updates
- **Hourly**: Injury reports
- **Real-time**: Transactions & news

### Data Quality
- Duplicate detection
- Source verification
- Historical consistency checks
- Link validation

## Technology Stack

- **Backend**: Node.js/TypeScript
- **Data Processing**: Python
- **Edge Computing**: CloudFlare Workers
- **Storage**: R2 (media), D1 (structured), Redis (cache)
- **Frontend**: React/Next.js
- **CI/CD**: GitHub Actions

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# CloudFlare
CF_ACCOUNT_ID=your_account_id
CF_API_TOKEN=your_api_token
R2_BUCKET=blaze-sportsintel

# APIs (Optional)
CFBD_API_KEY=college_football_data_key
PERFECTGAME_COOKIE=pg_auth_cookie
DCTF_COOKIE=dave_campbells_cookie

# Site
SITE_URL=https://blazesportsintel.com
TIMEZONE=America/Chicago
```

## Deployment

### Production (blazesportsintel.com)
```bash
pnpm deploy
```

### Staging Environment
```bash
pnpm deploy:staging
```

## Monitoring

- Health checks: `/api/health`
- Metrics dashboard: `/admin/metrics`
- Log aggregation: CloudFlare Analytics

## Compliance

- Respects robots.txt
- Official public endpoints only
- No paywall bypassing
- Link-outs to official sources
- Identifies as BlazeSportsIntelBot/1.0

## Support

- Documentation: [docs.blazesportsintel.com](https://docs.blazesportsintel.com)
- Issues: [GitHub Issues](https://github.com/blazeintelligence/blazesportsintel)
- Contact: support@blazesportsintel.com

## License

MIT License - See LICENSE file

---

Built with integrity by **Blaze Intelligence** - Turning Data into Dominance