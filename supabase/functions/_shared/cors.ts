/**
 * Shared CORS configuration for edge functions.
 *
 * SECURITY: This configuration requires ALLOWED_ORIGINS to be explicitly set.
 * If not set, requests will be rejected with 403 Forbidden.
 */

/**
 * Gets the allowed origin for CORS headers.
 * Returns the request origin if it's in the allowed list, or throws if not configured.
 */
export function getAllowedOrigin(req: Request): string {
  const origin = req.headers.get('Origin') || '';
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS') || '';
  const allowedOrigins = allowedOriginsEnv.split(',').map(o => o.trim()).filter(Boolean);

  // SECURITY: Require explicit origins configuration
  if (allowedOrigins.length === 0) {
    // In development, allow localhost origins
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
      // Development mode - allow common local origins
      const devOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];
      if (devOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        return origin;
      }
    }
    throw new Error('ALLOWED_ORIGINS environment variable must be set in production');
  }

  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  // Return first allowed origin - this will cause CORS error for invalid origins
  return allowedOrigins[0];
}

/**
 * Gets CORS headers for a request.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(req),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

/**
 * Handles CORS preflight request.
 */
export function handleCorsPreflightIfNeeded(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    try {
      return new Response('ok', { headers: getCorsHeaders(req) });
    } catch (error) {
      // CORS config error - return 403
      return new Response(JSON.stringify({ error: 'CORS configuration error' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  return null;
}

/**
 * Creates an error response with CORS headers.
 */
export function createErrorResponse(
  req: Request,
  error: string,
  status: number = 500,
  details?: string
): Response {
  let corsHeaders: Record<string, string>;
  try {
    corsHeaders = getCorsHeaders(req);
  } catch {
    corsHeaders = { 'Content-Type': 'application/json' };
  }

  const body: Record<string, string> = { error };
  if (details) {
    body.details = details;
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Creates a success response with CORS headers.
 */
export function createSuccessResponse(
  req: Request,
  data: Record<string, unknown>,
  contentType: string = 'application/json'
): Response {
  const corsHeaders = getCorsHeaders(req);

  if (contentType === 'application/json') {
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': contentType },
    });
  }

  return new Response(data as unknown as string, {
    headers: { ...corsHeaders, 'Content-Type': contentType },
  });
}
