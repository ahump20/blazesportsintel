# Secret Rotation Runbook (Blaze Sports Intel)

Date: 2025-09-25 (America/Chicago)

Scope:
- Cloudflare: API Token, R2 Access/Secret keys
- Netlify: Auth Token, Site ID (verify not leaked)
- Third-party APIs: SPORTS DATA IO, CollegeFootballData, etc.

Cloudflare R2:
1) Create new API Token scoped to R2 if using API token, or create new Access Key on the R2 bucket.
2) Update GitHub Action secrets:
   - R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT
3) Invalidate old keys immediately.

Cloudflare API Token:
1) Create a new token with least privilege (R2:Edit if needed).
2) Revoke the old token.

Netlify:
1) Generate a new Personal Access Token if exposed.
2) Update NETLIFY_AUTH_TOKEN in GitHub Secrets.
3) Keep NETLIFY_SITE_ID secret as well.

Git history cleanup:
- Preferred:
  git filter-repo --path .env --invert-paths
- Or BFG:
  bfg --delete-files .env
  bfg --replace-text replacements.txt

Post-rotation validation:
- Confirm new deploy succeeds.
- Attempt a known-old key to ensure it fails.

Notes:
- Never store secrets in repo or .env committed files.
- Use environment-scoped secrets in CI/CD.
