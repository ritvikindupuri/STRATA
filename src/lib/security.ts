/**
 * Security utilities for input validation and sanitization
 */

/**
 * Validates that a URL is safe to fetch from (prevents SSRF)
 * Only allows HTTPS URLs from trusted domains
 */
export function validateExternalUrl(url: string, allowedDomains: string[]): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS for external calls
    if (parsed.protocol !== 'https:') {
      return false;
    }
    
    // Check if domain is in allowlist
    const hostname = parsed.hostname.toLowerCase();
    return allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Validates AWS hostnames to prevent SSRF in AWS API calls
 */
export function validateAwsHostname(hostname: string): boolean {
  // AWS hostnames must match expected patterns
  const awsPatterns = [
    /^[a-z0-9-]+\.amazonaws\.com$/,
    /^sts\.amazonaws\.com$/,
    /^iam\.amazonaws\.com$/,
    /^[a-z0-9-]+\.[a-z0-9-]+\.amazonaws\.com$/,
  ];
  
  const lower = hostname.toLowerCase();
  return awsPatterns.some(pattern => pattern.test(lower));
}

/**
 * Sanitizes CSS color values to prevent XSS in inline styles
 */
export function sanitizeCssColor(color: string): string {
  // Only allow hex colors, rgb/rgba, hsl/hsla, and named colors
  const safeColorPattern = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]+)$/;
  
  if (!safeColorPattern.test(color.trim())) {
    return 'transparent';
  }
  
  return color.trim();
}

/**
 * Validates and sanitizes chart configuration to prevent XSS
 */
export function sanitizeChartConfig(config: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = {
        ...value,
        color: value.color ? sanitizeCssColor(value.color) : undefined,
        theme: value.theme && typeof value.theme === 'object'
          ? Object.fromEntries(
              Object.entries(value.theme).map(([k, v]) => [k, sanitizeCssColor(String(v))])
            )
          : undefined,
      };
    }
  }
  
  return sanitized;
}

/**
 * Rate limiting helper for preventing prompt injection abuse
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; resetAt: number }> = new Map();
  
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}
  
  check(key: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record || now > record.resetAt) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxAttempts - 1 };
    }
    
    if (record.count >= this.maxAttempts) {
      return { allowed: false, remaining: 0 };
    }
    
    record.count++;
    return { allowed: true, remaining: this.maxAttempts - record.count };
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}
