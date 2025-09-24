# 🔥 Blaze Sports Intel - Unified Sports Data Repository

The definitive unified sports data repository for Texas and Deep South sports intelligence. From Friday night lights to the big leagues.

## 🏆 Coverage

- **NFL** - All 32 franchises with complete rosters and depth charts
- **MLB** - All 30 teams with 40-man rosters and minor league affiliates  
- **Texas HS Football** - UIL classifications (6A-1A) with powerhouse programs
- **Perfect Game TX** - Elite youth baseball 14U+ tournaments and showcases
- **NCAA Football** - FBS Power 5 and Group of 5 programs
- **College Baseball** - Major conference programs and statistics

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Run data refresh for all leagues
pnpm run refresh:all

# Validate data integrity
pnpm run validate

# Start development server
pnpm run dev

# Deploy to production
pnpm run deploy
```

## 📊 API Endpoints

- `GET /api/teams?league={league}` - Get teams for a league
- `GET /api/standings?league={league}` - Get current standings
- `GET /api/schedules?league={league}` - Get game schedules
- `GET /api/players/{playerId}` - Get player details

## 🔄 Automated Updates

Data refreshes automatically twice daily:
- **9:00 AM CT** - Full refresh with overnight results
- **3:00 PM CT** - Midday update for live seasons

## 🏈 Texas HS Football Authority

Built to Dave Campbell's Texas Football standard:
- All UIL classifications covered
- Powerhouse program tracking (Allen, North Shore, Westlake, etc.)
- District standings and playoff brackets
- Coaching staff and facilities data

## ⚾ Perfect Game Integration

- Texas regional tournaments 14U+
- Elite travel team tracking
- Player rankings and commitments
- Showcase performance data

## 🔗 Official Sources

All data includes verified link-outs to:
- Baseball Reference & Pro Football Reference
- MLB.com & NFL.com official sites  
- Dave Campbell's Texas Football
- Perfect Game USA
- UIL Texas official records
- 247Sports & Rivals recruiting

## 🤖 Automation

- **Daily data refresh** via GitHub Actions
- **Automatic validation** with schema checking
- **Link verification** for external sources
- **Error monitoring** and alerting

## 📜 License

MIT License - See [LICENSE](LICENSE) for details

## 🙋‍♂️ Contact

**Blaze Intelligence** - Where Data Becomes Championship Intelligence
- Website: https://blazesportsintel.com
- Email: data@blazesportsintel.com

Built with Texas pride and Deep South sports authority.
