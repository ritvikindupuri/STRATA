/**
 * Append-only audit logging for privileged actions
 * 
 * All audit logs are immutable and stored with full context for compliance
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { redactSecrets } from "./redaction";

export interface AuditLogEntry {
  user_id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  status?: 'success' | 'failure' | 'blocked';
  error_message?: string;
}

/**
 * Write an audit log entry
 * Always succeeds (logs errors internally but doesn't throw)
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Redact any secrets from details
    const safeDetails = entry.details ? redactSecrets(entry.details) : {};
    
    const { error } = await supabaseAdmin.from('audit_log').insert({
      user_id: entry.user_id,
      action: entry.action,
      resource_type: entry.resource_type || null,
      resource_id: entry.resource_id || null,
      details: safeDetails,
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
      status: entry.status || 'success',
      error_message: entry.error_message || null,
    });
    
    if (error) {
      // Log to console but don't throw - audit logging should not break app flow
      console.error('Failed to write audit log:', error);
    }
  } catch (err) {
    console.error('Audit log write exception:', err);
  }
}

/**
 * Audit privileged actions
 */
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGOUT: 'auth.logout',
  
  // AWS Connection
  AWS_CONNECT: 'aws.connect',
  AWS_DISCONNECT: 'aws.disconnect',
  AWS_REVALIDATE: 'aws.revalidate',
  
  // Agent Actions
  AGENT_RUN_START: 'agent.run.start',
  AGENT_RUN_COMPLETE: 'agent.run.complete',
  AGENT_RULE_CREATE: 'agent.rule.create',
  AGENT_RULE_DELETE: 'agent.rule.delete',
  
  // Containment (critical - always audit)
  CONTAINMENT_KEY_DISABLE: 'containment.key.disable',
  CONTAINMENT_APPROVAL_REQUEST: 'containment.approval.request',
  CONTAINMENT_APPROVAL_GRANTED: 'containment.approval.granted',
  CONTAINMENT_APPROVAL_DENIED: 'containment.approval.denied',
  
  // Data Access
  FINDINGS_SYNC: 'data.findings.sync',
  REPORT_GENERATE: 'data.report.generate',
  
  // Settings
  AUTORESPONSE_ENABLE: 'settings.autoresponse.enable',
  AUTORESPONSE_DISABLE: 'settings.autoresponse.disable',
  
  // Elasticsearch
  ES_CONNECT: 'elasticsearch.connect',
  ES_DISCONNECT: 'elasticsearch.disconnect',
  ES_SYNC: 'elasticsearch.sync',
  
  // Session Management
  SESSION_CLEAR: 'session.clear',
} as const;

/**
 * Extract IP and user agent from request
 */
export function getRequestMetadata(request: Request | undefined): {
  ip_address?: string;
  user_agent?: string;
} {
  if (!request) return {};
  
  // Extract IP (check Cloudflare headers)
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  
  const ip_address = cfConnectingIp || 
                     (xForwardedFor ? xForwardedFor.split(',')[0].trim() : null) ||
                     xRealIp || 
                     undefined;
  
  const user_agent = request.headers.get('user-agent') || undefined;
  
  return { ip_address, user_agent };
}
