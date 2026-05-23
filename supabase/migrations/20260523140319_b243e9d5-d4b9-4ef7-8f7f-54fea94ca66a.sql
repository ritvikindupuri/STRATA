
REVOKE EXECUTE ON FUNCTION public.my_aws_connection() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_aws_connection() TO authenticated;
