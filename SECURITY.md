# Security

Immediate action required (2025-09-25):
- Secrets were found in a committed .env in prior context. Treat as compromised.

Remediation checklist:
1) Rotate/revoke all tokens/keys:
   - Cloudflare API token and R2 access keys
   - Netlify auth token and site ID (if exposed anywhere)
   - Any third-party API keys (e.g., SportsDataIO, CFB Data)
2) In repo:
   - Remove any committed .env files.
   - Add/verify .env in .gitignore.
   - Replace with .env.example.
3) Purge from git history:
   - Use git filter-repo or BFG to remove secrets from all history.
4) In CI:
   - Store secrets only in GitHub Actions Secrets.
5) Validate:
   - Run node scripts/verify_env.mjs
   - Attempt old credentials to confirm invalid.

References:
- https://github.com/newren/git-filter-repo
- https://rtyley.github.io/bfg-repo-cleaner/
- https://developers.cloudflare.com/r2/api/s3/
- https://github.com/netlify/actions/tree/main/cli
