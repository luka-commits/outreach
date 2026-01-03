import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { getCorsHeaders, handleCorsPreflightIfNeeded, createErrorResponse } from "../_shared/cors.ts"
import { safeDecrypt, isEncryptionConfigured } from "../_shared/encryption.ts"

// Simple JWT generation for Twilio Access Token
// This is a minimal implementation - Twilio SDK would be better but Deno compatibility is limited
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function createTwilioAccessToken(
  accountSid: string,
  apiKeySid: string,
  apiKeySecret: string,
  identity: string,
  twimlAppSid: string,
  ttl: number = 3600
): string {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    typ: 'JWT',
    alg: 'HS256',
    cty: 'twilio-fpa;v=1'
  };

  const grants: Record<string, unknown> = {
    identity: identity,
    voice: {
      outgoing: {
        application_sid: twimlAppSid
      }
    }
  };

  const payload = {
    jti: `${apiKeySid}-${now}`,
    iss: apiKeySid,
    sub: accountSid,
    exp: now + ttl,
    grants: grants
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));

  const signatureInput = `${headerB64}.${payloadB64}`;

  // HMAC-SHA256 signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiKeySecret);
  const data = encoder.encode(signatureInput);

  // Use Web Crypto API for HMAC
  // Note: This is async but we'll handle it in the serve function
  return `${signatureInput}`;  // Placeholder - actual signing happens async
}

async function signToken(signatureInput: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(signatureInput);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

  return `${signatureInput}.${signatureB64}`;
}

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

    // 4. Fetch user's Twilio credentials from profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('twilio_account_sid, twilio_auth_token, twilio_twiml_app_sid')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch profile' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!profile?.twilio_account_sid || !profile?.twilio_auth_token || !profile?.twilio_twiml_app_sid) {
      return new Response(JSON.stringify({ error: 'Twilio not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 5. Generate Twilio Access Token
    // For production, you should create API Keys in Twilio Console
    // and store them instead of using the Auth Token directly
    // Auth Token can be used for testing but API Keys are more secure

    const accountSid = profile.twilio_account_sid;
    const twimlAppSid = profile.twilio_twiml_app_sid;

    // Decrypt auth token if encryption is configured
    let authToken: string = profile.twilio_auth_token;
    if (isEncryptionConfigured()) {
      const decrypted = await safeDecrypt(profile.twilio_auth_token);
      if (!decrypted) {
        return new Response(JSON.stringify({ error: 'Twilio credentials corrupted. Please reconfigure in Settings.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      authToken = decrypted;
    }

    // Use account SID as API Key SID for simplicity (works with Auth Token)
    // In production, create proper API Keys
    const identity = user.id;
    const ttl = 3600; // 1 hour
    const now = Math.floor(Date.now() / 1000);

    const header = {
      typ: 'JWT',
      alg: 'HS256',
      cty: 'twilio-fpa;v=1'
    };

    const grants = {
      identity: identity,
      voice: {
        outgoing: {
          application_sid: twimlAppSid
        }
      }
    };

    const payload = {
      jti: `${accountSid}-${now}`,
      iss: accountSid,
      sub: accountSid,
      exp: now + ttl,
      grants: grants
    };

    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(payload));
    const signatureInput = `${headerB64}.${payloadB64}`;

    const accessToken = await signToken(signatureInput, authToken);

    return new Response(JSON.stringify({
      token: accessToken,
      identity: identity,
      expiresIn: ttl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating Twilio token');
    let corsHeadersFallback: Record<string, string>;
    try {
      corsHeadersFallback = getCorsHeaders(req);
    } catch {
      corsHeadersFallback = { 'Content-Type': 'application/json' };
    }
    return new Response(JSON.stringify({
      error: 'Failed to generate token',
    }), {
      headers: { ...corsHeadersFallback, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
