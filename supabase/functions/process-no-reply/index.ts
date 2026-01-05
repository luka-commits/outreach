import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts"

/**
 * Process No-Reply Leads Edge Function
 *
 * This function is designed to be called by a cron job (e.g., pg_cron, Vercel Cron, etc.)
 * to automatically move leads to 'no_reply' status after they complete a strategy
 * without responding within the configured delay period.
 *
 * Security: Requires CRON_SECRET header to prevent unauthorized calls.
 */
serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  let corsHeaders: Record<string, string>;
  try {
    corsHeaders = getCorsHeaders(req);
  } catch {
    corsHeaders = { 'Content-Type': 'application/json' };
  }

  try {
    // Validate cron secret to prevent unauthorized calls
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');

    // If CRON_SECRET is configured, require it
    if (expectedSecret && cronSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the RPC function that processes no-reply leads
    const { data, error } = await supabase.rpc('process_no_reply_leads');

    if (error) {
      console.error('Error processing no-reply leads:', error);
      throw error;
    }

    const leadsUpdated = data ?? 0;

    console.log(`Processed no-reply leads: ${leadsUpdated} leads updated`);

    return new Response(
      JSON.stringify({
        success: true,
        leadsUpdated,
        processedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in process-no-reply function:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
