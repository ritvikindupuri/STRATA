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

### Residual Risks (Cannot Be Fixed in Code)

All code-fixable security risks have been addressed. The following are operational/environmental risks that require manual configuration:

#### 1. CORS Configuration for Production
**Risk:** `ALLOWED_ORIGINS` environment variable must be set in production, or CORS will fail closed (block all origins).

**Manual Step Required:**
1. Set `ALLOWED_ORIGINS` environment variable in your deployment platform (e.g., Cloudflare Pages, Vercel)
2. Value should be comma-separated list of allowed origins:
   ```
   ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
   ```
3. Verify CORS works by testing cross-origin requests in browser DevTools

**Why This Can't Be Fixed in Code:** Production domains are deployment-specific and unknown at build time.

#### 2. AWS IAM Permissions Review
**Risk:** If auto-response is enabled, the AWS IAM user needs `iam:UpdateAccessKey` permission. Overly broad IAM permissions increase blast radius.

**Manual Step Required:**
1. Review the IAM policy attached to STRATA's IAM user
2. For read-only mode (recommended initial deployment):
   - Use `AWSCloudTrailReadOnlyAccess` and `AmazonGuardDutyReadOnlyAccess` managed policies
3. For auto-response mode (after testing):
   - Add inline policy with `iam:UpdateAccessKey` scoped to specific IAM users/roles
   - Example:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [{
         "Effect": "Allow",
         "Action": "iam:UpdateAccessKey",
         "Resource": "arn:aws:iam::ACCOUNT-ID:user/*"
       }]
     }
     ```
4. Use AWS Organizations SCPs to prevent privilege escalation on the STRATA IAM user

**Why This Can't Be Fixed in Code:** AWS permissions are configured in AWS IAM Console, not application code.

#### 3. Supabase Anon Key Rotation (If Previously Exposed)
**Risk:** Supabase anon keys were committed to git history before this PR.

**Manual Step Required (if concerned):**
1. Go to Supabase Dashboard > Settings > API
2. Click "Rotate" next to the Anon/Public key
3. Update `.env` with the new anon key
4. Redeploy the application

**Why This Can't Be Fixed in Code:** Git history cannot be rewritten retroactively. Rotation must be done in Supabase Dashboard.

**Note:** Anon keys are low-risk by design (public keys with RLS protection). Only rotate if you suspect abuse.

#### 4. Lovable API Key Rotation (If Previously Exposed)
**Risk:** Lovable API key was in committed `.env` before this PR.

**Manual Step Required:**
1. Contact Lovable support to rotate your API key
2. Update `.env` with the new key
3. Redeploy the application

**Why This Can't Be Fixed in Code:** API key rotation requires contacting the service provider.

#### 5. Cloudflare Pages / Production Hosting Setup
**Risk:** Security headers and CSP are set via application code, but hosting platform may override or strip headers.

**Manual Step Required:**
1. After deploying to Cloudflare Pages (or other hosting):
   - Test that security headers are present: `curl -I https://yourdomain.com`
   - Verify CSP, HSTS, X-Frame-Options, etc. are in response headers
2. If headers are missing or stripped:
   - Configure hosting platform to preserve application headers
   - For Cloudflare Pages: Use Page Rules or `_headers` file as backup
3. Test application loads correctly without CSP violations:
   - Open browser DevTools Console
   - Navigate through the app
   - Verify no CSP errors

**Why This Can't Be Fixed in Code:** Hosting platform configuration is external to application code.

#### 6. Elasticsearch Integration (If Used)
**Risk:** If you connect an Elasticsearch cluster, it must be trusted and properly secured.

**Manual Step Required (if using Elasticsearch):**
1. Only connect internally-managed Elasticsearch clusters
2. Verify Elasticsearch cluster authentication (API key-based)
3. Review Elasticsearch network ACLs (restrict to STRATA backend IPs only)
4. Enable Elasticsearch audit logging
5. Monitor for anomalous queries or data exfiltration

**Why This Can't Be Fixed in Code:** Elasticsearch cluster configuration is external to STRATA.

**Note:** Elasticsearch integration is optional and not required for core functionality.

#### 7. Third-Party Runtime Security (Optional Enhancement)
**Risk:** Static security scanning (npm audit, Dependabot, TruffleHog, Gitleaks) may not catch runtime exploits.

**Manual Step (Optional):**
Consider adding runtime security monitoring:
- **Snyk Runtime** for Node.js runtime vulnerability detection
- **Cloudflare WAF** if using Cloudflare Pages
- **Sentry** with security alert rules for error monitoring

**Why This Can't Be Fixed in Code:** These are external services that require separate setup and configuration.

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
