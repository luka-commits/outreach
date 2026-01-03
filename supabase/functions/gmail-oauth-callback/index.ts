import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { getCorsHeaders, handleCorsPreflightIfNeeded, createErrorResponse } from "../_shared/cors.ts"
import { encrypt, isEncryptionConfigured } from "../_shared/encryption.ts"

serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  let corsHeaders: Record<string, string>;
  try {
    corsHeaders = getCorsHeaders(req);
  } catch (error) {
    return createErrorResponse(req, 'CORS not configured', 403);
  }

  try {
    // 1. Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 2. Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Get the authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 4. Get the authorization code and code verifier from request body
    const { code, codeVerifier, redirectUri } = await req.json();

    if (!code || !codeVerifier || !redirectUri) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 5. Exchange authorization code for tokens
    const gmailClientId = Deno.env.get('GMAIL_CLIENT_ID');
    const gmailClientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');

    if (!gmailClientId || !gmailClientSecret) {
      return new Response(JSON.stringify({ error: 'Gmail OAuth not configured on server' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: gmailClientId,
        client_secret: gmailClientSecret,
        code: code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      // Don't log full token data - may contain sensitive info
      console.error('Token exchange failed:', tokenData.error || 'Unknown error');
      return new Response(JSON.stringify({
        error: 'Failed to exchange code for tokens',
        details: tokenData.error_description || tokenData.error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // 6. Get user's email from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info');
      return new Response(JSON.stringify({ error: 'Failed to get user email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const gmailEmail = userInfo.email;

    // 7. Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // 8. Store credentials in profiles table (encrypted if configured)
    let accessTokenToStore = access_token;
    let refreshTokenToStore = refresh_token;

    if (isEncryptionConfigured()) {
      try {
        accessTokenToStore = await encrypt(access_token);
        refreshTokenToStore = await encrypt(refresh_token);
      } catch (encryptError) {
        // Log error but don't expose details to client
        console.error('Encryption failed');
        return new Response(JSON.stringify({ error: 'Failed to secure credentials' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        gmail_access_token: accessTokenToStore,
        gmail_refresh_token: refreshTokenToStore,
        gmail_token_expires_at: expiresAt,
        gmail_email: gmailEmail,
        email_provider: 'gmail',
      })
      .eq('id', user.id);

    if (updateError) {
      // Don't log full error details
      console.error('Failed to store credentials');
      return new Response(JSON.stringify({ error: 'Failed to store credentials' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 9. Return success WITHOUT exposing tokens to client
    // SECURITY: Tokens are stored server-side only
    return new Response(JSON.stringify({
      success: true,
      email: gmailEmail,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Don't log full error details that might contain tokens
    console.error('Error in gmail-oauth-callback');
    let corsHeadersFallback: Record<string, string>;
    try {
      corsHeadersFallback = getCorsHeaders(req);
    } catch {
      corsHeadersFallback = { 'Content-Type': 'application/json' };
    }
    return new Response(JSON.stringify({
      error: 'Internal server error',
    }), {
      headers: { ...corsHeadersFallback, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
