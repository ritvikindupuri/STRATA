
-- Encrypted secret at rest + auto-response toggle
ALTER TABLE public.aws_connections
  ADD COLUMN IF NOT EXISTS encrypted_secret text,
  ADD COLUMN IF NOT EXISTS auto_response_enabled boolean NOT NULL DEFAULT false;

-- Detection rules (AI generated)
CREATE TABLE IF NOT EXISTS public.detection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  mitre_technique text,
  severity text NOT NULL DEFAULT 'medium',
  match_event_names text[] NOT NULL DEFAULT '{}',
  match_keywords text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  generated_by text NOT NULL DEFAULT 'agent',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.detection_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rules select" ON public.detection_rules FOR SELECT USING (auth.uid() = user_id);

-- Agent actions (every autonomous action taken)
CREATE TABLE IF NOT EXISTS public.agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connection_id uuid,
  finding_id uuid,
  action_type text NOT NULL, -- 'detect','triage','block','report','rule_create','notify'
  target text,
  status text NOT NULL DEFAULT 'pending', -- 'pending','success','failed','skipped'
  reasoning text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own actions select" ON public.agent_actions FOR SELECT USING (auth.uid() = user_id);

-- Incident reports
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL,
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  executive_summary text NOT NULL,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  mitre_tactics text[] NOT NULL DEFAULT '{}',
  affected_resources text[] NOT NULL DEFAULT '{}',
  recommendations text NOT NULL,
  related_finding_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports select" ON public.incident_reports FOR SELECT USING (auth.uid() = user_id);

-- Agent run log
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'running',
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors text[] NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own runs select" ON public.agent_runs FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS agent_actions_user_created_idx ON public.agent_actions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS incident_reports_user_created_idx ON public.incident_reports (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS findings_user_event_time_idx ON public.findings (user_id, event_time DESC);
