
DROP VIEW IF EXISTS public.aws_connections_safe;
CREATE VIEW public.aws_connections_safe
WITH (security_invoker = true) AS
SELECT id, user_id, label, region, status, aws_account_id, aws_arn,
       last_validated_at, last_error, created_at, auto_response_enabled
FROM public.aws_connections;
GRANT SELECT ON public.aws_connections_safe TO authenticated;
