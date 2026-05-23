
DROP VIEW IF EXISTS public.aws_connections_safe;

CREATE OR REPLACE FUNCTION public.my_aws_connection()
RETURNS TABLE (
  id uuid, user_id uuid, label text, region text, status text,
  aws_account_id text, aws_arn text, last_validated_at timestamptz,
  last_error text, created_at timestamptz, auto_response_enabled boolean,
  es_endpoint text, es_index text, es_connected boolean,
  mock_data_seeded_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id, user_id, label, region, status,
    aws_account_id, aws_arn, last_validated_at, last_error,
    created_at, auto_response_enabled,
    es_endpoint, es_index,
    (es_api_key_encrypted IS NOT NULL) AS es_connected,
    mock_data_seeded_at
  FROM public.aws_connections
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.my_aws_connection() TO authenticated;
