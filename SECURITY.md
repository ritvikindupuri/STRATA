# Security Policy

## Reporting Security Vulnerabilities

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to the project maintainers. Include the following information:

- Type of vulnerability
- Full paths of source file(s) related to the manifestation of the vulnerability
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

We will respond to your report within 48 hours and aim to release a patch within 7 days for critical vulnerabilities.

## Security Hardening Summary

This document outlines the defensive security measures implemented in STRATA and identifies residual risks that operators should be aware of.

### What Was Hardened (PR #8)

#### 1. Secrets Management
- **Removed committed .env file from repository** - Supabase keys were previously committed to git
- **Added .env to .gitignore** - Prevents future accidental commits of environment files
- **Created .env.example** - Provides a template with placeholder values for all required environment variables
- **Note:** Supabase anon keys are low-risk (designed for public client use) but should still be in .env for best practices

#### 2. XSS Protection
- **Chart component dangerouslySetInnerHTML** - Added CSS color value sanitization to prevent XSS via malicious chart config
- **Security comment added** - Documents why the usage is safe (React-generated IDs, typed config, no user input)
- **Pattern validation** - Only allows safe CSS color patterns (hex, rgb/rgba, hsl/hsla, named colors)

#### 3. SSRF Prevention
- **Created security utility module** (`src/lib/security.ts`) with:
  - `validateExternalUrl()` - Validates URLs are HTTPS and from allowlisted domains
  - `validateAwsHostname()` - Validates AWS API hostnames match expected patterns
- **Applied to AWS credential validation** - Validates STS hostname before making AWS API calls
- **Applied to AI gateway calls** - Validates Lovable AI gateway URL before LLM requests
- **Elasticsearch connection** - Already had Zod URL validation (`.url()`)

#### 4. Prompt Injection Guardrails
- **Input truncation** - All event data sent to LLMs is truncated to 6000 characters (CloudTrail analysis) or 9000 characters (incident reports)
- **Rate limiting** - Added `RateLimiter` class for AI API calls (20 calls per minute per user)
- **Strict JSON-only responses** - System prompts enforce JSON-only output with no markdown or prose
- **Low temperature** - AI calls use temperature 0.2-0.3 for deterministic, factual responses
- **Note:** LLM output drives containment actions (IAM key deactivation), but:
  - Containment requires explicit user opt-in (`auto_response_enabled` flag)
  - Self-protection prevents disabling STRATA's own IAM credentials
  - All actions are logged to `agent_actions` table for audit

#### 5. AWS Credential Handling
- **Least privilege by default** - README documents read-only IAM policy (CloudTrail:LookupEvents, GuardDuty:List*/Get*)
- **Encrypted storage** - Secrets encrypted at rest using AES-256-GCM (`src/lib/aws/crypto.ts`)
- **Never logged** - Credentials are never logged or included in error messages
- **Server-side only** - `secret_access_key` column has RLS policy blocking all client access
- **Safe view** - `aws_connections_safe` view exposes only non-sensitive fields
- **Auto-response opt-in** - Write permissions (iam:UpdateAccessKey) only needed if user enables containment
- **Validation before storage** - STS GetCallerIdentity call verifies credentials before saving

#### 6. Row Level Security (RLS)
- **All tables protected** - Every table has `ENABLE ROW LEVEL SECURITY`
- **User isolation** - Policies enforce `auth.uid() = user_id` for SELECT/UPDATE/INSERT
- **Tables covered:**
  - `profiles` - Own profile only
  - `aws_connections` - No direct access (use `aws_connections_safe` view)
  - `findings` - Own findings only
  - `detection_rules` - Own rules only
  - `agent_actions` - Own actions only
  - `incident_reports` - Own reports only
  - `agent_runs` - Own runs only
  - `agent_sessions` - Own sessions only

#### 7. Dependency Security
- **Dependabot configured** (`.github/dependabot.yml`) - Automated weekly dependency updates
- **Grouped updates** - Separate groups for production and development dependencies
- **PR limit** - Max 10 open PRs to keep updates manageable

#### 8. GitHub Actions Security
- **Least-privilege permissions** - Workflows use minimal `permissions:` blocks
- **CI workflow** (`ci.yml`) - `contents: read` only for lint and build
- **Security workflow** (`security.yml`) - Dependency review, npm audit, secret scanning (TruffleHog)
- **No credentials in workflows** - Uses `persist-credentials: false` for checkout
- **Automated scans** - Weekly scheduled security scans

#### 9. Frontend Security Headers
- **CSP not implemented** - TanStack Start deployment to Cloudflare Pages doesn't have built-in CSP config
- **Recommendation:** Configure CSP via Cloudflare Page Rules or `_headers` file when deploying:
  ```
  /*
    Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://ylrbjzvkjnavogqirmby.supabase.co https://ai.gateway.lovable.dev;
    X-Content-Type-Options: nosniff
    X-Frame-Options: DENY
    Referrer-Policy: strict-origin-when-cross-origin
    Permissions-Policy: geolocation=(), microphone=(), camera=()
  ```

### Residual Risks & Mitigations

#### 1. LLM-Driven Containment Actions
**Risk:** Prompt injection could potentially manipulate LLM responses to trigger unintended IAM key deactivation.

**Mitigations:**
- Auto-response is **opt-in** (disabled by default)
- Self-protection: STRATA refuses to disable its own credentials
- All containment actions logged to `agent_actions` with reasoning
- Only acts on `critical` severity findings from last hour
- Validates IAM user exists in finding metadata before acting

**Recommendation:** Monitor `agent_actions` table for unexpected blocks. Consider adding a manual approval workflow for containment actions in production environments.

#### 2. Elasticsearch Cluster Access
**Risk:** If connected Elasticsearch cluster is compromised or malicious, it could inject false security events.

**Mitigations:**
- Elasticsearch integration is optional (not required for core functionality)
- URL validation ensures HTTPS only
- API key stored encrypted
- Events tagged with `source: "elasticsearch"` for traceability
- Limit 50 events per sync

**Recommendation:** Only connect trusted, internally-managed Elasticsearch clusters. Validate ES cluster authentication and network ACLs.

#### 3. Supabase Anon Key Exposure
**Risk:** Supabase anon keys were previously committed to git history.

**Mitigations:**
- Anon keys are **designed** for client-side use (low risk by design)
- RLS policies enforce user isolation - anon key cannot bypass RLS
- Service role key (high privilege) is never committed

**Recommendation:** If concerned, rotate the Supabase anon key in the Supabase dashboard and update `.env`. Consider using Supabase's "Anonymous sign-ins" restriction if not needed.

#### 4. AI API Key Security
**Risk:** Lovable API key in `.env` grants access to LLM gateway.

**Mitigations:**
- Now in `.env` (not committed) and `.gitignore`d
- Server-side only (never exposed to client)
- Rate limited (20 calls/min per user)

**Recommendation:** Rotate the Lovable API key as a precaution if it was previously exposed. Monitor usage in Lovable dashboard for anomalies.

#### 5. AWS Read-Only Permissions
**Risk:** CloudTrail and GuardDuty contain sensitive security information.

**Mitigations:**
- Credentials stored encrypted at rest (AES-256-GCM)
- Read-only by default (no write permissions unless auto-response enabled)
- User-scoped RLS ensures isolation

**Recommendation:** Use a dedicated IAM user with minimal CloudTrail/GuardDuty read permissions. Enable CloudTrail encryption and GuardDuty findings export encryption in AWS.

#### 6. No Runtime Application Security Monitoring (RASP)
**Risk:** Application lacks runtime vulnerability detection beyond static dependency scanning.

**Recommendation:** Consider integrating runtime security tools like:
- Snyk Runtime for Node.js vulnerability detection
- CloudFlare WAF if deploying to Cloudflare Pages
- Sentry for error tracking with security alert rules

#### 7. No Rate Limiting on Server Functions
**Risk:** Server functions (TanStack Start) lack per-user rate limiting.

**Mitigations:**
- AI calls have application-level rate limiting (20/min per user)
- Supabase has built-in rate limiting on database queries

**Recommendation:** Add middleware rate limiting (e.g., `@tanstack/react-start` middleware with in-memory rate limiter or Redis) for production deployments.

### Best Practices for Operators

1. **Environment Variables:**
   - Copy `.env.example` to `.env` and populate with your credentials
   - Never commit `.env` files
   - Use separate Supabase projects for dev/staging/prod

2. **AWS IAM Policy:**
   - Use the read-only policy from README for baseline deployment
   - Only add `iam:UpdateAccessKey` if enabling auto-response
   - Consider AWS Organizations SCPs to prevent privilege escalation

3. **Supabase RLS:**
   - Never disable RLS on production tables
   - Review Supabase logs for unauthorized access attempts
   - Enable MFA for Supabase dashboard access

4. **Dependency Updates:**
   - Review and merge Dependabot PRs weekly
   - Run `npm audit` locally before deploying
   - Subscribe to GitHub security advisories for this repo

5. **Monitoring:**
   - Monitor `agent_actions` table for unexpected containment actions
   - Set up Supabase alerts for failed authentication attempts
   - Review CloudTrail logs for unexpected STRATA API activity

6. **Incident Response:**
   - If STRATA's IAM credentials are compromised, immediately disable them in AWS
   - Rotate all secrets (Supabase anon key, Lovable API key, AWS credentials)
   - Review `findings` and `agent_actions` tables for malicious activity

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < main  | :x:                |

We only support the latest `main` branch. Please upgrade before reporting vulnerabilities.

## Security Update Process

1. Security vulnerabilities are fixed in a private branch
2. A patch is tested against the latest `main`
3. A security advisory is published (if severity warrants)
4. The fix is merged to `main` with a `security:` prefixed commit message
5. A new release is tagged (if applicable)

## Acknowledgments

We appreciate responsible disclosure of security vulnerabilities. Contributors who report valid security issues will be acknowledged in this file (unless they prefer to remain anonymous).

---

*Last updated: 2026-09-28*
