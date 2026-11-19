-- H2: pending approval targets and triage fields are server-owned.
-- CloudTrail, GuardDuty, Elasticsearch, and sandbox ingestion all write findings
-- through the service role (supabaseAdmin), which bypasses RLS. The browser only
-- SELECTs findings, so dropping authenticated INSERT/UPDATE does not affect ingestion.
-- handleApproval also uses the service role, so pending_approvals no longer needs
-- a client UPDATE policy. A status-only grant would still let the browser mark a
-- row approved without the finding re-check, so client UPDATE is removed entirely.

DROP POLICY IF EXISTS "own approvals update" ON public.pending_approvals;
REVOKE UPDATE ON public.pending_approvals FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "own findings insert" ON public.findings;
DROP POLICY IF EXISTS "own findings update" ON public.findings;
REVOKE INSERT, UPDATE ON public.findings FROM PUBLIC, anon, authenticated;
