/**
 * Production-grade security headers for all responses
 *
 * Implements: CSP, HSTS, Permissions-Policy, frame-ancestors, COOP,
 * X-Content-Type-Options, Referrer-Policy
 */

/**
 * Content Security Policy
 *
 * Strict policy that allows:
 * - Self-hosted scripts and styles
 * - Inline styles (required for Tailwind/shadcn)
 * - eval() for Vite dev mode only
 * - Specific external domains (fonts, AI gateway, Supabase)
 */
function getContentSecurityPolicy(): string {
  const isProduction = process.env.NODE_ENV === "production";

  const directives = [
    "default-src 'self'",

    // Scripts: self + unsafe-eval only in dev for Vite HMR
    isProduction ? "script-src 'self'" : "script-src 'self' 'unsafe-eval'", // Vite requires unsafe-eval in dev

    // Styles: self + unsafe-inline for Tailwind/shadcn
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

    // Images: self + data URIs + HTTPS
    "img-src 'self' data: https:",

    // Fonts: self + Google Fonts
    "font-src 'self' data: https://fonts.gstatic.com",

    // Connect (fetch/XHR): self + Supabase + AI gateway
    "connect-src 'self' https://*.supabase.co https://ai.gateway.lovable.dev wss://*.supabase.co",

    // Frame ancestors: none (prevent clickjacking)
    "frame-ancestors 'none'",

    // Form actions: self only
    "form-action 'self'",

    // Base URI: self only
    "base-uri 'self'",

    // Object/embed: none
    "object-src 'none'",

    // Upgrade insecure requests in production
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ];

  return directives.join("; ");
}

/**
 * Permissions-Policy (formerly Feature-Policy)
 *
 * Disable all unnecessary browser features
 */
function getPermissionsPolicy(): string {
  return [
    "geolocation=()",
    "microphone=()",
    "camera=()",
    "payment=()",
    "usb=()",
    "magnetometer=()",
    "gyroscope=()",
    "accelerometer=()",
    "interest-cohort=()", // Disable FLoC
  ].join(", ");
}

/**
 * Get all security headers
 */
export function getSecurityHeaders(): Record<string, string> {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    // Content Security Policy
    "Content-Security-Policy": getContentSecurityPolicy(),

    // Strict Transport Security (HTTPS only, 1 year)
    // Only set in production when served over HTTPS
    ...(isProduction
      ? {
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        }
      : {}),

    // Prevent MIME sniffing
    "X-Content-Type-Options": "nosniff",

    // Frame options (backup for CSP frame-ancestors)
    "X-Frame-Options": "DENY",

    // Referrer policy: only send origin to same-origin requests
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Cross-Origin Opener Policy: isolate browsing context
    "Cross-Origin-Opener-Policy": "same-origin",

    // Cross-Origin Resource Policy: same-origin
    "Cross-Origin-Resource-Policy": "same-origin",

    // Cross-Origin Embedder Policy: require-corp
    "Cross-Origin-Embedder-Policy": "require-corp",

    // Permissions Policy
    "Permissions-Policy": getPermissionsPolicy(),

    // Remove server identification
    "X-Powered-By": "",
  };
}

/**
 * Add security headers to a response
 */
export function addSecurityHeaders(response: Response): Response {
  const headers = getSecurityHeaders();
  const newResponse = new Response(response.body, response);

  Object.entries(headers).forEach(([key, value]) => {
    if (value) {
      // Only set non-empty values
      newResponse.headers.set(key, value);
    } else {
      // For X-Powered-By, delete it
      newResponse.headers.delete(key);
    }
  });

  return newResponse;
}
