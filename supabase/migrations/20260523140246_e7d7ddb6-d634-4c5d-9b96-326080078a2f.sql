
-- 1. Make the safe view bypass RLS on its base table (it already excludes secret columns).
DROP VIEW IF EXISTS public.aws_connections_safe;

ALTER TABLE public.aws_connections
  ADD COLUMN IF NOT EXISTS es_endpoint text,
  ADD COLUMN IF NOT EXISTS es_index text DEFAULT 'cloudtrail-*',
  ADD COLUMN IF NOT EXISTS es_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS mock_data_seeded_at timestamptz;

CREATE VIEW public.aws_connections_safe
WITH (security_invoker = false) AS
SELECT
  id, user_id, label, region, status,
  aws_account_id, aws_arn, last_validated_at, last_error,
  created_at, auto_response_enabled,
  es_endpoint, es_index,
  (es_api_key_encrypted IS NOT NULL) AS es_connected,
  mock_data_seeded_at
FROM public.aws_connections;

-- View runs as owner (postgres) and bypasses RLS, but only exposes non-secret columns.
-- Grant select on the view to authenticated users; RLS on the underlying table still
-- blocks direct selects (the policy is USING(false)).
GRANT SELECT ON public.aws_connections_safe TO authenticated, anon;

-- The view's row-visibility is enforced in application code via .eq("user_id", ...)
-- — but since this is queried via the user's PostgREST session, add a row filter:
-- recreate as a security barrier view that filters by auth.uid().
DROP VIEW public.aws_connections_safe;
CREATE VIEW public.aws_connections_safe
WITH (security_barrier = true, security_invoker = false) AS
SELECT
  id, user_id, label, region, status,
  aws_account_id, aws_arn, last_validated_at, last_error,
  created_at, auto_response_enabled,
  es_endpoint, es_index,
  (es_api_key_encrypted IS NOT NULL) AS es_connected,
  mock_data_seeded_at
FROM public.aws_connections
WHERE user_id = auth.uid();

GRANT SELECT ON public.aws_connections_safe TO authenticated;
