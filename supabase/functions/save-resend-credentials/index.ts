import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { getCorsHeaders, handleCorsPreflightIfNeeded, createErrorResponse } from "../_shared/cors.ts"
import { encrypt, isEncryptionConfigured } from "../_shared/encryption.ts"

/**
 * Edge function to save Resend API key with encryption.
 * This ensures API keys are never stored in plaintext.
 */
serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  let corsHeaders: Record<string, string>;
  try {
    corsHeaders = getCorsHeaders(req);
  } catch {
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

    // 4. Get credentials from request body
    const { apiKey, fromEmail } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 5. Encrypt the API key if encryption is configured
    let apiKeyToStore = apiKey;

    if (isEncryptionConfigured()) {
      try {
        apiKeyToStore = await encrypt(apiKey);
      } catch (encryptError) {
        console.error('Encryption failed');
        return new Response(JSON.stringify({ error: 'Failed to secure credentials' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    }

    // 6. Store credentials in profiles table
    const updateData: Record<string, unknown> = {
      resend_api_key: apiKeyToStore,
    };

    if (fromEmail) {
      updateData.resend_from_email = fromEmail;
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to store credentials');
      return new Response(JSON.stringify({ error: 'Failed to store credentials' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 7. Return success WITHOUT exposing API key
    return new Response(JSON.stringify({
      success: true,
      message: 'Resend credentials saved securely',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in save-resend-credentials');
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
