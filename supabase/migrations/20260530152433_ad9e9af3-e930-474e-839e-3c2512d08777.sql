-- Add explicit owner-scoped write policies to all user-scoped tables.
-- All app writes happen via server functions using service_role (which bypasses RLS),
-- so these policies are deny-by-default for the public/authenticated roles.

-- agent_actions
CREATE POLICY "own actions insert" ON public.agent_actions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own actions update" ON public.agent_actions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own actions delete" ON public.agent_actions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- agent_runs
CREATE POLICY "own runs insert" ON public.agent_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own runs update" ON public.agent_runs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own runs delete" ON public.agent_runs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- agent_sessions
CREATE POLICY "own sessions insert" ON public.agent_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sessions update" ON public.agent_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sessions delete" ON public.agent_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- detection_rules
CREATE POLICY "own rules insert" ON public.detection_rules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own rules update" ON public.detection_rules FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own rules delete" ON public.detection_rules FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- findings
CREATE POLICY "own findings insert" ON public.findings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own findings update" ON public.findings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own findings delete" ON public.findings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- incident_reports
CREATE POLICY "own reports insert" ON public.incident_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reports update" ON public.incident_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reports delete" ON public.incident_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Tighten profiles SELECT policy to authenticated role only
DROP POLICY IF EXISTS "own profile select" ON public.profiles;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Lock down the my_aws_connection SECURITY DEFINER function: only callable by authenticated users
REVOKE EXECUTE ON FUNCTION public.my_aws_connection() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_aws_connection() TO authenticated;