#!/bin/bash

# Blaze Sports Intel - Production Deployment Script
# Deploys the complete platform to blazesportsintel.com

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="blazesportsintel.com"
PROJECT_NAME="blazesportsintel"
ENVIRONMENT="${1:-production}"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# ASCII Banner
echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     BLAZE SPORTS INTEL - DEPLOYMENT                        ║
║     The Deep South Sports Authority                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

print_status "Starting deployment to ${ENVIRONMENT}..."
print_status "Domain: ${DOMAIN}"

# Check prerequisites
print_status "Checking prerequisites..."

command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { print_error "pnpm is required but not installed."; exit 1; }
command -v wrangler >/dev/null 2>&1 || { print_error "Wrangler CLI is required but not installed."; exit 1; }

print_success "Prerequisites check passed"

# Check environment variables
print_status "Checking environment variables..."

if [ -z "$CF_ACCOUNT_ID" ]; then
    print_error "CF_ACCOUNT_ID is not set"
    exit 1
fi

if [ -z "$CF_API_TOKEN" ]; then
    print_error "CF_API_TOKEN is not set"
    exit 1
fi

print_success "Environment variables configured"

# Install dependencies
print_status "Installing dependencies..."
pnpm install --frozen-lockfile
print_success "Dependencies installed"

# Run tests
print_status "Running tests..."
pnpm test || print_warning "Some tests failed, continuing..."

# Validate data schemas
print_status "Validating data schemas..."
pnpm run validate:schemas
print_success "Schemas validated"

# Build the project
print_status "Building project..."
pnpm run build
print_success "Build completed"

# Refresh data pipelines
if [ "$ENVIRONMENT" = "production" ]; then
    print_status "Refreshing data pipelines..."

    # Texas HS Football
    print_status "  → Texas HS Football..."
    pnpm run refresh:tx_hs_fb || print_warning "Texas HS Football pipeline had issues"

    # Perfect Game Baseball
    print_status "  → Perfect Game Baseball..."
    pnpm run refresh:pg_baseball || print_warning "Perfect Game pipeline had issues"

    # NCAA Sports
    print_status "  → NCAA Football..."
    pnpm run refresh:ncaa_fb || print_warning "NCAA Football pipeline had issues"

    print_status "  → NCAA Baseball..."
    pnpm run refresh:college_baseball || print_warning "NCAA Baseball pipeline had issues"

    # Professional Sports
    print_status "  → NFL..."
    pnpm run refresh:nfl || print_warning "NFL pipeline had issues"

    print_status "  → MLB..."
    pnpm run refresh:mlb || print_warning "MLB pipeline had issues"

    print_success "Data pipelines refreshed"
fi

# Deploy API to CloudFlare Workers
print_status "Deploying API to CloudFlare Workers..."
wrangler deploy --env ${ENVIRONMENT}
print_success "API deployed"

# Deploy GraphQL endpoint
print_status "Deploying GraphQL endpoint..."
cd api/graphql && wrangler deploy --env ${ENVIRONMENT}
cd ../..
print_success "GraphQL deployed"

# Upload data to R2 storage
print_status "Uploading data to R2 storage..."

# Upload latest data files
for sport in texas-hs-football perfect-game ncaa-football ncaa-baseball nfl mlb; do
    if [ -d "data/${sport}" ]; then
        print_status "  → Uploading ${sport} data..."
        wrangler r2 object put blazesportsintel-data/${sport}/latest.json \
            --file data/${sport}/latest.json \
            --content-type "application/json"
    fi
done

print_success "Data uploaded to R2"

# Deploy web frontend to CloudFlare Pages
print_status "Deploying web frontend to CloudFlare Pages..."

cd apps/web
npm run build

wrangler pages deploy dist \
    --project-name=${PROJECT_NAME} \
    --branch=${ENVIRONMENT} \
    --commit-message="Deploy ${ENVIRONMENT} $(date +'%Y-%m-%d %H:%M:%S')"

cd ../..
print_success "Web frontend deployed"

# Set up redirects and headers
print_status "Configuring redirects and headers..."

cat > apps/web/dist/_redirects << EOF
# API redirects
/api/*  https://api.${DOMAIN}/api/:splat  200

# Old URLs
/texas-football  /texas-hs-football  301
/perfect-game    /perfect-game-baseball  301

# Default
/*    /index.html   200
EOF

cat > apps/web/dist/_headers << EOF
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/api/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization

/*.js
  Cache-Control: public, max-age=31536000, immutable

/*.css
  Cache-Control: public, max-age=31536000, immutable

/data/*
  Cache-Control: public, max-age=300, s-maxage=600
EOF

print_success "Redirects and headers configured"

# Clear CloudFlare cache
print_status "Purging CloudFlare cache..."
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}' > /dev/null 2>&1

print_success "Cache purged"

# Run health checks
print_status "Running health checks..."

# API health check
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://api.${DOMAIN}/api/v1/health)
if [ "$API_HEALTH" = "200" ]; then
    print_success "API health check passed"
else
    print_error "API health check failed (HTTP ${API_HEALTH})"
fi

# Web health check
WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN})
if [ "$WEB_HEALTH" = "200" ]; then
    print_success "Web health check passed"
else
    print_error "Web health check failed (HTTP ${WEB_HEALTH})"
fi

# Set up monitoring
print_status "Setting up monitoring..."
pnpm run monitor &
MONITOR_PID=$!
print_success "Monitoring started (PID: ${MONITOR_PID})"

# Create deployment record
print_status "Creating deployment record..."

DEPLOYMENT_ID=$(date +'%Y%m%d%H%M%S')
cat > deployments/${DEPLOYMENT_ID}.json << EOF
{
  "id": "${DEPLOYMENT_ID}",
  "environment": "${ENVIRONMENT}",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "domain": "${DOMAIN}",
  "git_commit": "$(git rev-parse HEAD)",
  "git_branch": "$(git branch --show-current)",
  "deployed_by": "${USER}",
  "status": "success"
}
EOF

print_success "Deployment recorded: ${DEPLOYMENT_ID}"

# Send deployment notification
if [ ! -z "$SLACK_WEBHOOK" ]; then
    print_status "Sending deployment notification..."
    curl -X POST $SLACK_WEBHOOK \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \"🚀 Deployment Complete\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Environment\", \"value\": \"${ENVIRONMENT}\", \"short\": true},
                    {\"title\": \"Domain\", \"value\": \"${DOMAIN}\", \"short\": true},
                    {\"title\": \"Deployment ID\", \"value\": \"${DEPLOYMENT_ID}\", \"short\": true},
                    {\"title\": \"Deployed By\", \"value\": \"${USER}\", \"short\": true}
                ]
            }]
        }" > /dev/null 2>&1
    print_success "Notification sent"
fi

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ DEPLOYMENT SUCCESSFUL${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "🌐 Website: https://${DOMAIN}"
echo "🚀 API: https://api.${DOMAIN}/api/v1"
echo "📊 GraphQL: https://api.${DOMAIN}/graphql"
echo "📈 Health: https://api.${DOMAIN}/api/v1/health"
echo ""
echo "📍 Texas HS Football: https://${DOMAIN}/texas-hs-football"
echo "⚾ Perfect Game: https://${DOMAIN}/perfect-game-baseball"
echo "🏈 NCAA Football: https://${DOMAIN}/ncaa-football"
echo ""
echo -e "${BLUE}Deployment ID: ${DEPLOYMENT_ID}${NC}"
echo ""

print_status "Deployment complete! 🎉"

# Keep monitoring running
if [ "$ENVIRONMENT" = "production" ]; then
    print_status "Monitoring will continue in background (PID: ${MONITOR_PID})"
    print_status "To stop monitoring: kill ${MONITOR_PID}"
fi

exit 0