# Production Runbook

## Blaze Sports Intelligence - Operations Guide

This runbook provides step-by-step instructions for common production operations and incident response procedures.

---

## Table of Contents

1. [Deployment Procedures](#deployment-procedures)
2. [Monitoring & Alerts](#monitoring--alerts)
3. [Common Issues & Solutions](#common-issues--solutions)
4. [Database Operations](#database-operations)
5. [Rollback Procedures](#rollback-procedures)
6. [Emergency Contacts](#emergency-contacts)

---

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All tests passing in CI/CD
- [ ] Code review completed and approved
- [ ] Database migrations tested in staging
- [ ] Environment variables updated (if needed)
- [ ] Monitoring dashboards prepared
- [ ] Rollback plan documented

### Standard Deployment

```bash
# 1. Merge to main branch
git checkout main
git pull origin main

# 2. Tag the release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 3. Deploy automatically via CI/CD
# Monitor deployment at: https://github.com/ahump20/blazesportsintel/actions

# 4. Verify deployment
curl https://api.blazesportsintel.com/health
```

### Database Migrations

```bash
# Run migrations in staging first
npm run prisma:migrate:deploy

# Verify migration success
npm run prisma:studio

# Run in production (automatic via CI/CD)
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| API Response Time | > 500ms | Warning |
| API Response Time | > 1000ms | Critical |
| Error Rate | > 1% | Warning |
| Error Rate | > 5% | Critical |
| CPU Usage | > 70% | Warning |
| CPU Usage | > 90% | Critical |
| Memory Usage | > 80% | Warning |
| Database Connections | > 80% pool | Warning |

### Monitoring Tools

- **Sentry**: Error tracking and performance monitoring
  - URL: https://sentry.io/organizations/blazesportsintel
  - Alerts sent to: dev-alerts@blazesportsintel.com

- **Cloudflare Analytics**: CDN and edge metrics
  - URL: https://dash.cloudflare.com

- **Database Monitoring**: PostgreSQL metrics
  - Check connection pool usage
  - Monitor slow queries (> 1s)

---

## Common Issues & Solutions

### Issue: API Returning 500 Errors

**Symptoms:**
- Sentry showing spike in errors
- Users reporting "Internal Server Error"

**Diagnosis:**
```bash
# Check Sentry for stack traces
# Check API logs
npm run logs:api

# Check database connectivity
npm run db:status
```

**Solution:**
1. Check environment variables are set correctly
2. Verify database is accessible
3. Check Redis connection
4. Review recent deployments for changes
5. If issue persists, initiate rollback

### Issue: Slow API Response Times

**Symptoms:**
- Response times > 1000ms
- Users reporting lag

**Diagnosis:**
```bash
# Check database query performance
npm run db:slow-queries

# Check Redis status
redis-cli ping

# Review APM traces in Sentry
```

**Solution:**
1. Identify slow database queries
2. Check for N+1 query issues
3. Verify Redis caching is working
4. Consider scaling infrastructure
5. Add database indexes if needed

### Issue: Database Connection Pool Exhausted

**Symptoms:**
- "Too many connections" errors
- API timeouts

**Diagnosis:**
```bash
# Check active connections
npm run db:connections
```

**Solution:**
1. Increase connection pool size (if needed)
2. Check for connection leaks in code
3. Restart API servers to clear connections
4. Scale database if consistently high

### Issue: High Memory Usage

**Symptoms:**
- Memory usage > 80%
- Out of memory errors

**Diagnosis:**
```bash
# Check memory usage
docker stats
npm run memory:profile
```

**Solution:**
1. Check for memory leaks
2. Verify caching strategy
3. Restart affected services
4. Scale horizontally if needed

---

## Database Operations

### Backup

```bash
# Automated daily backups run at 2 AM UTC
# Manual backup:
npm run db:backup

# Verify backup
npm run db:backup:verify
```

### Restore

```bash
# Restore from latest backup
npm run db:restore:latest

# Restore from specific backup
npm run db:restore --date=2024-11-02
```

### Migrations

```bash
# Create new migration
npm run prisma:migrate:dev --name migration_name

# Apply pending migrations
npm run prisma:migrate:deploy

# Check migration status
npm run prisma:migrate:status
```

---

## Rollback Procedures

### API Rollback

```bash
# 1. Identify last known good version
git log --oneline

# 2. Revert to previous version
git revert <commit-hash>

# 3. Force deploy
git push origin main --force

# 4. Monitor deployment
# Watch CI/CD pipeline

# 5. Verify rollback
curl https://api.blazesportsintel.com/health
```

### Database Rollback

```bash
# Rollback last migration
npm run prisma:migrate:rollback

# Verify database state
npm run prisma:studio
```

### Frontend Rollback (Netlify)

1. Go to Netlify dashboard
2. Navigate to Deploys
3. Find last successful deploy
4. Click "Publish deploy"

---

## Emergency Procedures

### Total Service Outage

1. **Immediate Actions:**
   - Post status update: "Investigating service outage"
   - Check Cloudflare status
   - Check hosting provider status
   - Review error logs

2. **Communication:**
   - Update status page
   - Post on social media
   - Email affected users (if > 30 min)

3. **Investigation:**
   - Check recent deployments
   - Review monitoring dashboards
   - Check database status
   - Review error logs in Sentry

4. **Resolution:**
   - Implement fix or rollback
   - Monitor for 15 minutes
   - Update status page
   - Post-mortem within 48 hours

### Data Breach Suspected

1. **Immediate Actions:**
   - Isolate affected systems
   - Preserve logs
   - Contact security team
   - Notify legal team

2. **Do NOT:**
   - Delete logs
   - Restart systems without preserving state
   - Communicate externally without approval

---

## Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| On-Call Engineer | [Phone] | 24/7 |
| DevOps Lead | [Phone] | Business Hours |
| Database Admin | [Phone] | On-Call Rotation |
| Security Team | security@blazesportsintel.com | 24/7 |
| Hosting Support | [Provider Support] | 24/7 |

---

## Post-Incident Procedures

After any major incident:

1. **Write Post-Mortem** (within 48 hours)
   - What happened
   - Root cause
   - Impact
   - Timeline
   - Resolution
   - Prevention measures

2. **Update Runbook**
   - Add new issues encountered
   - Update procedures
   - Add monitoring alerts

3. **Team Review**
   - Share learnings
   - Update on-call procedures
   - Implement preventive measures

---

## Useful Commands

```bash
# Check service health
npm run health:check

# View logs
npm run logs:api
npm run logs:web

# Database status
npm run db:status

# Clear cache
npm run cache:clear

# Environment validation
npm run validate:env
```

---

**Last Updated:** November 2, 2025
**Version:** 1.0.0
**Maintained By:** DevOps Team
