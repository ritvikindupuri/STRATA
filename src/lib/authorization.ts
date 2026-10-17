/**
 * Server-side authorization for resource access
 * 
 * Not just JWT validation - verifies user owns the resources they're accessing
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Verify user owns an AWS connection
 */
export async function verifyAwsConnectionOwnership(
  userId: string,
  connectionId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('aws_connections')
    .select('id')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .maybeSingle();
  
  return !!data;
}

/**
 * Verify user owns a finding
 */
export async function verifyFindingOwnership(
  userId: string,
  findingId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('findings')
    .select('id')
    .eq('id', findingId)
    .eq('user_id', userId)
    .maybeSingle();
  
  return !!data;
}

/**
 * Verify user owns a detection rule
 */
export async function verifyRuleOwnership(
  userId: string,
  ruleId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('detection_rules')
    .select('id')
    .eq('id', ruleId)
    .eq('user_id', userId)
    .maybeSingle();
  
  return !!data;
}

/**
 * Verify user owns an incident report
 */
export async function verifyReportOwnership(
  userId: string,
  reportId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('incident_reports')
    .select('id')
    .eq('id', reportId)
    .eq('user_id', userId)
    .maybeSingle();
  
  return !!data;
}

/**
 * Verify user owns an agent action
 */
export async function verifyActionOwnership(
  userId: string,
  actionId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('agent_actions')
    .select('id')
    .eq('id', actionId)
    .eq('user_id', userId)
    .maybeSingle();
  
  return !!data;
}

/**
 * Get user's AWS connection (with authorization check)
 */
export async function getAuthorizedAwsConnection(
  userId: string
): Promise<any | null> {
  const { data } = await supabaseAdmin
    .from('aws_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  return data;
}

/**
 * Authorization error response
 */
export function createUnauthorizedResponse(): { ok: false; error: string } {
  return { 
    ok: false as const, 
    error: 'Unauthorized: You do not have permission to access this resource',
  };
}
