/**
 * CORS middleware that FAILS CLOSED when ALLOWED_ORIGINS is not set
 * 
 * Production security: if ALLOWED_ORIGINS env var is missing, ALL cross-origin
 * requests are blocked. This prevents misconfiguration from exposing APIs.
 */

/**
 * Parse and validate ALLOWED_ORIGINS from environment
 * Returns null if unset or invalid (fail closed)
 */
function parseAllowedOrigins(): string[] | null {
  const raw = process.env.ALLOWED_ORIGINS;
  
  if (!raw || raw.trim() === '') {
    console.warn('SECURITY: ALLOWED_ORIGINS not set - CORS will fail closed (block all origins)');
    return null;
  }
  
  // Parse comma-separated list
  const origins = raw.split(',').map(o => o.trim()).filter(Boolean);
  
  if (origins.length === 0) {
    console.warn('SECURITY: ALLOWED_ORIGINS is empty - CORS will fail closed');
    return null;
  }
  
  // Validate each origin is a valid URL or 'null' (for local file:// access)
  for (const origin of origins) {
    if (origin === 'null') continue; // Allow 'null' for file:// protocol
    try {
      const url = new URL(origin);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        console.error(`SECURITY: Invalid origin protocol in ALLOWED_ORIGINS: ${origin}`);
        return null;
      }
    } catch {
      console.error(`SECURITY: Invalid origin in ALLOWED_ORIGINS: ${origin}`);
      return null;
    }
  }
  
  return origins;
}

const ALLOWED_ORIGINS = parseAllowedOrigins();

/**
 * Check if an origin is allowed
 * Returns false if ALLOWED_ORIGINS is not configured (fail closed)
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (!ALLOWED_ORIGINS) return false; // Fail closed
  
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get CORS headers for a response
 * Returns null if origin is not allowed (fail closed)
 */
export function getCorsHeaders(origin: string | null): Record<string, string> | null {
  if (!isOriginAllowed(origin)) {
    return null; // Fail closed - no CORS headers
  }
  
  return {
    'Access-Control-Allow-Origin': origin!,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Handle CORS preflight request
 * Returns 403 if origin is not allowed (fail closed)
 */
export function handleCorsPreflightFailClosed(request: Request): Response {
  const origin = request.headers.get('Origin');
  
  if (!isOriginAllowed(origin)) {
    // Fail closed: return 403 Forbidden
    return new Response(
      JSON.stringify({ 
        error: 'Forbidden',
        message: 'Origin not allowed. Configure ALLOWED_ORIGINS environment variable.',
      }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  
  const headers = getCorsHeaders(origin);
  return new Response(null, { 
    status: 204,
    headers: headers || {},
  });
}

/**
 * Add CORS headers to a response
 * If origin is not allowed, returns the original response without CORS headers
 */
export function addCorsHeaders(response: Response, origin: string | null): Response {
  const corsHeaders = getCorsHeaders(origin);
  
  if (!corsHeaders) {
    // Origin not allowed - return response without CORS headers
    // Browser will block the response
    return response;
  }
  
  const newResponse = new Response(response.body, response);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });
  
  return newResponse;
}
