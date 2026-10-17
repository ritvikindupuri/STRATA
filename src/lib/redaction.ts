/**
 * Secret redaction for logs and client responses
 * 
 * Prevents leaking sensitive data in error messages, logs, and API responses
 */

/**
 * Patterns that identify secrets
 */
const SECRET_PATTERNS = [
  // AWS
  /AKIA[0-9A-Z]{16}/gi,                    // AWS Access Key ID
  /aws.{0,20}['\"][0-9a-zA-Z\/+=]{40}['\"]/gi, // AWS Secret Access Key
  
  // API Keys
  /api[_-]?key['\"]?\s*[:=]\s*['\"]\S+['\"]/gi,
  /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
  
  // JWT tokens
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/gi,
  
  // Supabase keys (be conservative, redact anything that looks like one)
  /eyJ[a-zA-Z0-9_-]{100,}/gi,
  
  // Generic secrets in key-value pairs
  /secret['\"]?\s*[:=]\s*['\"]\S+['\"]/gi,
  /password['\"]?\s*[:=]\s*['\"]\S+['\"]/gi,
  /token['\"]?\s*[:=]\s*['\"]\S+['\"]/gi,
];

/**
 * Redact secrets from a string
 */
export function redactString(text: string): string {
  let redacted = text;
  
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      // Keep first 4 chars for debugging, redact rest
      if (match.length <= 8) return '[REDACTED]';
      return match.slice(0, 4) + '[REDACTED]';
    });
  }
  
  return redacted;
}

/**
 * Redact secrets from an object (recursively)
 */
export function redactSecrets(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return redactString(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactSecrets(item));
  }
  
  if (typeof obj === 'object') {
    const redacted: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Redact known secret keys entirely
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('key') && (lowerKey.includes('api') || lowerKey.includes('access'))
      ) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSecrets(value);
      }
    }
    
    return redacted;
  }
  
  return obj;
}

/**
 * Create a generic error message for clients
 * Prevents leaking internal details
 */
export function createSafeErrorResponse(
  error: any,
  context?: string
): { error: string; message: string; requestId?: string } {
  // Generate request ID for correlation
  const requestId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  // Log full error server-side with redaction
  console.error(`[${requestId}] ${context || 'Error'}:`, redactSecrets({
    message: error?.message || String(error),
    stack: error?.stack,
    details: error,
  }));
  
  // Return generic error to client
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Production: generic error only
    return {
      error: 'Internal Server Error',
      message: 'An error occurred while processing your request. Please try again later.',
      requestId,
    };
  } else {
    // Development: include redacted error message
    return {
      error: 'Internal Server Error',
      message: redactString(error?.message || String(error)),
      requestId,
    };
  }
}
