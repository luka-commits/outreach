import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// CORS configuration - restrict to allowed origins in production
const getAllowedOrigin = (req: Request): string => {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(o => o.trim());

  // In development or if no origins configured, allow the request origin
  if (allowedOrigins.length === 0 || allowedOrigins[0] === '' || allowedOrigins.includes(origin)) {
    return origin || '*';
  }

  // Default to first allowed origin if request origin not in list
  return allowedOrigins[0];
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

interface StartScrapeRequest {
  job_id: string;
  niche: string;
  location: string;
  limit: number;
  increase_radius: boolean;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    // Client with user's auth (for RLS)
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Admin client (bypasses RLS for reading API keys)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Get the authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth check failed:', authError);
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        details: authError?.message || 'User not found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 4. Parse request body
    const body: StartScrapeRequest = await req.json();
    const { job_id, niche, location, limit, increase_radius } = body;

    if (!job_id || !niche || !location) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 5. Fetch user's API keys from profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('apify_api_token, anthropic_api_key')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(JSON.stringify({ error: 'Failed to fetch profile' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 6. Check if API keys are configured
    if (!profile?.apify_api_token || !profile?.anthropic_api_key) {
      return new Response(JSON.stringify({
        error: 'API keys not configured',
        message: 'Please configure your Apify and Anthropic API keys in Settings'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 7. Verify job exists and belongs to user
    const { data: job, error: jobError } = await supabaseAdmin
      .from('scrape_jobs')
      .select('id, status')
      .eq('id', job_id)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 8. Get Modal webhook URL and callback secret
    const modalWebhookUrl = Deno.env.get('MODAL_WEBHOOK_URL');
    const webhookSecret = Deno.env.get('SCRAPE_WEBHOOK_SECRET');

    const missingVars = [];
    if (!modalWebhookUrl) missingVars.push('MODAL_WEBHOOK_URL');
    if (!webhookSecret) missingVars.push('SCRAPE_WEBHOOK_SECRET');

    if (missingVars.length > 0) {
      console.error(`Configuration error: Missing ${missingVars.join(', ')}`);
      return new Response(JSON.stringify({
        error: `Server configuration error: Missing env vars: ${missingVars.join(', ')}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 9. Call Modal webhook with user's API keys
    // Use environment variable for Supabase URL (must be the public URL for external callback)
    const callbackUrl = `${supabaseUrl}/functions/v1/scrape-callback`;

    const modalPayload = {
      job_id,
      user_id: user.id,
      niche,
      location,
      limit: limit || 50,
      increase_radius: increase_radius ?? true,
      apify_token: profile.apify_api_token,
      anthropic_key: profile.anthropic_api_key,
      callback_url: callbackUrl,
      callback_secret: webhookSecret,
      // Progress reporting: pass Supabase credentials so Modal can update job status
      supabase_url: supabaseUrl,
      supabase_key: supabaseServiceKey,
    };

    console.log(`Starting scrape job ${job_id} for user ${user.id}`);
    console.log(`Callback URL: ${callbackUrl}`);
    console.log(`Modal Payload (redacted secret):`, { ...modalPayload, callback_secret: '***' });

    const modalResponse = await fetch(modalWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modalPayload),
    });

    if (!modalResponse.ok) {
      const errorText = await modalResponse.text();
      console.error('Modal webhook error:', errorText);

      // Update job status to failed
      await supabaseAdmin
        .from('scrape_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to start scraping workflow',
        })
        .eq('id', job_id);

      return new Response(JSON.stringify({ error: 'Failed to start scraping workflow' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const modalResult = await modalResponse.json();
    console.log('Modal response:', modalResult);

    // Check for logical error from Modal (even if HTTP was 200)
    if (modalResult.status === 'error') {
      console.error('Modal execution error:', modalResult.message);

      await supabaseAdmin
        .from('scrape_jobs')
        .update({
          status: 'failed',
          error_message: modalResult.message || 'Scraper execution failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job_id);

      return new Response(JSON.stringify({
        error: modalResult.message || 'Scraper execution failed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Bad Request instead of 500 since it's a logic error
      });
    }

    // 10. Update job status to processing
    await supabaseAdmin
      .from('scrape_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', job_id);

    return new Response(JSON.stringify({
      success: true,
      job_id,
      message: 'Scraping started'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Start scrape error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
