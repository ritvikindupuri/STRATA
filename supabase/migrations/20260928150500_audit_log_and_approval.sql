-- Append-only audit log for all privileged actions
-- Immutable after insert, comprehensive logging for compliance and forensics

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  status text NOT NULL DEFAULT 'success', -- 'success' | 'failure' | 'blocked'
  error_message text
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own audit logs
CREATE POLICY "own audit select" ON public.audit_log 
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can INSERT (no UPDATE or DELETE)
CREATE POLICY "service insert only" ON public.audit_log 
  FOR INSERT WITH CHECK (false); -- Deny all client inserts

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS audit_log_user_created_idx 
  ON public.audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx 
  ON public.audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_resource_idx 
  ON public.audit_log (resource_type, resource_id);

-- Prevent UPDATE and DELETE on audit_log (append-only)
CREATE POLICY "no updates" ON public.audit_log 
  FOR UPDATE USING (false);
CREATE POLICY "no deletes" ON public.audit_log 
  FOR DELETE USING (false);

-- Human approval table for LLM-triggered AWS write actions
CREATE TABLE IF NOT EXISTS public.pending_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action_type text NOT NULL, -- 'disable_access_key' | 'revoke_role' | etc
  target text NOT NULL,
  reasoning text NOT NULL,
  finding_id uuid REFERENCES public.findings(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on pending_approvals
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;

-- Users can see their own pending approvals
CREATE POLICY "own approvals select" ON public.pending_approvals 
  FOR SELECT USING (auth.uid() = user_id);

-- Users can approve their own pending approvals
CREATE POLICY "own approvals update" ON public.pending_approvals 
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS pending_approvals_user_status_idx 
  ON public.pending_approvals (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS pending_approvals_expires_idx 
  ON public.pending_approvals (expires_at) WHERE status = 'pending';

-- Auto-expire pending approvals after 1 hour (requires pg_cron or external job)
-- For now, application will filter expired approvals in queries
