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
- **Untrusted data delimiting** - All user/event data in prompts is wrapped with clear boundaries (`===== BEGIN USER DATA =====` / `===== END USER DATA =====`)
- **Strict Zod schema validation** - All LLM responses validated with TypeScript Zod schemas (`SecurityAnalysisSchema`, `DetectionRulesSchema`, `IncidentReportSchema`)
- **Input truncation** - Event data truncated to 6KB (CloudTrail) or 9KB (reports) to prevent oversized payloads
- **Rate limiting** - Strict rate limits: 20 AI calls/min per user, enforced at application level
- **Deterministic safeguards** - Self-protection check (never disable STRATA's own IAM credentials) runs outside LLM control
- **Human approval required** - LLM-triggered AWS writes (IAM key deactivation) require explicit human approval via `pending_approvals` table
- **Low temperature** - AI calls use temperature 0.2-0.3 for deterministic responses
- **System prompts** - Explicit instructions to treat user data as untrusted and ignore embedded instructions

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

#### 7. Rate Limiting
- **Implemented production-grade rate limiting** (`src/lib/rate-limit.ts`)
  - Per-user and per-IP tracking with automatic cleanup
  - Returns HTTP 429 with `Retry-After` header when limits exceeded
- **Rate limits by endpoint type:**
  - AI analysis: 20 requests/min per user
  - AWS sync: 10 requests/min per user (expensive AWS API calls)
  - AWS connection validation: 5 requests/hour per IP
  - Autopilot runs: 30 requests/hour per user
  - Generic expensive operations: 60 requests/min per user
- **Applied to all sensitive endpoints** - Agent functions, AWS functions, AI calls

#### 8. CORS (Fail-Closed)
- **Implemented fail-closed CORS** (`src/lib/cors.ts`)
- **Environment-driven allowlist** - `ALLOWED_ORIGINS` env var (comma-separated domains)
- **Fails closed** - If `ALLOWED_ORIGINS` is unset or invalid, ALL cross-origin requests are blocked with HTTP 403
- **Preflight handling** - OPTIONS requests checked against allowlist
- **Security headers** - Proper CORS headers only sent to allowed origins

#### 9. Security Headers (Comprehensive)
- **Implemented via middleware** (`src/lib/security-headers.ts`)
- **Content Security Policy (CSP)** - Strict policy allowing only:
  - Self-hosted scripts and styles
  - Inline styles (required for Tailwind/shadcn)
  - Google Fonts (fonts.googleapis.com, fonts.gstatic.com)
  - Supabase (*.supabase.co)
  - Lovable AI gateway (ai.gateway.lovable.dev)
  - `unsafe-eval` only in dev mode for Vite HMR
  - `frame-ancestors 'none'` (prevent clickjacking)
- **HSTS** - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (production only)
- **X-Content-Type-Options** - `nosniff`
- **X-Frame-Options** - `DENY` (backup for CSP)
- **Referrer-Policy** - `strict-origin-when-cross-origin`
- **Cross-Origin Policies:**
  - `Cross-Origin-Opener-Policy: same-origin` (isolate browsing context)
  - `Cross-Origin-Resource-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- **Permissions-Policy** - Disable all unnecessary browser features (geolocation, microphone, camera, payment, USB, etc.)
- **Remove server identification** - `X-Powered-By` header removed

#### 10. Append-Only Audit Log
- **Created `audit_log` table** (`supabase/migrations/20260928150500_audit_log_and_approval.sql`)
- **Immutable** - No UPDATE or DELETE allowed (RLS policies enforce append-only)
- **Comprehensive logging** - All privileged actions logged with:
  - User ID, action type, resource type/ID
  - Full details (redacted for secrets)
  - IP address and user agent
  - Status (success/failure/blocked)
  - Timestamp
- **Service role only inserts** - Clients cannot write directly (prevents tampering)
- **Audit actions tracked:** Login, AWS connect/disconnect, agent runs, containment approvals, rule generation, data sync, settings changes
- **Helper module** (`src/lib/audit.ts`) for easy audit logging

#### 11. Human Approval for AWS Writes
- **Created `pending_approvals` table** - Human-in-the-loop for LLM-triggered AWS writes
- **Replaced auto-containment** - Instead of immediately disabling IAM keys, agent creates approval requests
- **Approval workflow:**
  1. LLM analysis identifies critical finding
  2. System creates `pending_approval` entry with reasoning
  3. User reviews finding + AI reasoning in UI
  4. User explicitly approves or rejects
  5. On approval: deterministic check runs (never disable STRATA's own key), then AWS API call
  6. All steps logged to `audit_log`
- **1-hour expiry** - Pending approvals expire after 1 hour
- **RLS protected** - Users can only see/approve their own requests
- **New function** - `handleApproval()` for approve/reject actions

#### 12. Server-Side Authorization
- **Authorization module** (`src/lib/authorization.ts`)
- **Not just JWT validation** - Verifies user owns the resources they're accessing
- **Resource ownership checks:**
  - AWS connections
  - Findings
  - Detection rules
  - Incident reports
  - Agent actions
- **Applied to all server functions** - Every function verifies resource ownership before allowing access
- **Returns generic 403** - "Unauthorized" error if ownership check fails

#### 13. Log/Secret Redaction
- **Redaction module** (`src/lib/redaction.ts`)
- **Patterns detected:** AWS access keys, API keys, JWTs, Supabase keys, bearer tokens, generic secrets/passwords
- **Recursive redaction** - Works on nested objects and arrays
- **Key-based redaction** - Automatically redacts known secret keys (secret, password, token, api_key, access_key)
- **Generic client errors** - Production errors return generic messages (no internal details leaked)
- **Request ID tracking** - Errors logged server-side with request ID for correlation
- **Applied to:** Audit logs, error responses, console logs

#### 14. Dependency Security
- **Dependabot configured** (`.github/dependabot.yml`) - Automated weekly dependency updates
- **Grouped updates** - Separate groups for production and development dependencies
- **PR limit** - Max 10 open PRs to keep updates manageable

#### 15. GitHub Actions Security (Hardened)
- **Actions pinned to SHAs** - All actions use full commit SHA instead of tags (prevents tag hijacking)
  - `actions/checkout@eef61447b9ff4aafe5dcd4e0bbf5d482be7e7871` # v4.2.1
  - `actions/setup-node@0a44ba7841725637a19e28fa30b79a866c81b0a6` # v4.0.4
  - `actions/dependency-review-action@4081bf99e2866ebe428fc0477b69eb4fcda7220a` # v4.4.0
  - `trufflesecurity/trufflehog@5266524c5f82b637c84a6b13bf84eb6cd3c4b3bf` # v3.84.2
  - `gitleaks/gitleaks-action@1f2d10fb689667018f7c8f454b8f133e1b898e17` # v2.3.7
- **npm audit fails on high** - CI fails if high-severity vulnerabilities detected
- **Added Gitleaks** - Comprehensive secret scanning (in addition to TruffleHog)
- **Least-privilege permissions** - All workflows use minimal `permissions:` blocks
- **No credential persistence** - `persist-credentials: false` for all checkouts
- **Weekly scheduled scans** - Security checks run weekly even without code changes

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
