
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- AWS connections (encrypted secret stored server-side only; we store via service role; never expose secret_access_key to client)
CREATE TABLE public.aws_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Primary AWS Account',
  aws_account_id TEXT,
  aws_arn TEXT,
  region TEXT NOT NULL DEFAULT 'us-east-1',
  access_key_id TEXT NOT NULL,
  secret_access_key TEXT NOT NULL,  -- server-only access via service role
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | connected | error
  last_validated_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.aws_connections ENABLE ROW LEVEL SECURITY;
-- Users can only SELECT non-secret columns via a view; but for simplicity, restrict full row access — frontend should query the view below
CREATE POLICY "no direct access" ON public.aws_connections FOR ALL USING (false) WITH CHECK (false);

-- Safe view exposing non-secret fields for the owning user
CREATE VIEW public.aws_connections_safe
WITH (security_invoker = true) AS
SELECT id, user_id, label, aws_account_id, aws_arn, region, status, last_validated_at, last_error, created_at
FROM public.aws_connections
WHERE user_id = auth.uid();

GRANT SELECT ON public.aws_connections_safe TO authenticated;

-- Findings ingested from AWS (CloudTrail events + GuardDuty findings)
CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.aws_connections ON DELETE CASCADE,
  source TEXT NOT NULL,            -- 'cloudtrail' | 'guardduty'
  external_id TEXT NOT NULL,       -- EventId or FindingId
  event_name TEXT,
  event_time TIMESTAMPTZ,
  region TEXT,
  username TEXT,
  source_ip TEXT,
  user_agent TEXT,
  severity NUMERIC,                -- guardduty severity 1-10
  title TEXT,
  raw JSONB NOT NULL,
  ai_severity TEXT,                -- 'low'|'medium'|'high'|'critical'
  ai_category TEXT,
  ai_summary TEXT,
  ai_remediation TEXT,
  ai_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, source, external_id)
);
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own findings select" ON public.findings FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX findings_user_time ON public.findings (user_id, event_time DESC);
CREATE INDEX findings_severity ON public.findings (user_id, ai_severity);
