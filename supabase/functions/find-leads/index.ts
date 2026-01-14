/**
 * find-leads Edge Function
 *
 * Creates an async job to search for businesses using Modal scraper.
 * Returns immediately with job_id. Modal calls lead-finder-callback when done.
 * User previews leads, then imports via import-leads endpoint.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { getCorsHeaders, handleCorsPreflightIfNeeded, createErrorResponse, createSuccessResponse } from "../_shared/cors.ts"

const MODAL_WEBHOOK_URL = 'https://luka-50609--lead-scraper-scrape-leads.modal.run';

// Limits
const MAX_ADS_FREE = 100;
const MAX_ADS_PRO = 500;

interface ModalRequest {
  keyword: string;
  country: string;
  location?: string;
  max_ads?: number;
  // Async callback fields
  job_id?: string;
  callback_url?: string;
  callback_secret?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  try {
    getCorsHeaders(req);
  } catch {
    return createErrorResponse(req, 'CORS not configured', 403);
  }

  try {
    // 1. Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(req, 'Missing authorization header', 401);
    }

    // 2. Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const callbackSecret = Deno.env.get('LEAD_FINDER_CALLBACK_SECRET') ?? '';

    if (!callbackSecret) {
      console.error('[find-leads] LEAD_FINDER_CALLBACK_SECRET not configured');
      return createErrorResponse(req, 'Server configuration error', 500);
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Get the authenticated user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      console.error('[find-leads] Auth error:', authError?.message);
      return createErrorResponse(req, authError?.message || 'Unauthorized', 401);
    }

    // 4. Check subscription status for limits
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return createErrorResponse(req, 'Failed to check subscription status.', 500);
    }

    const isPro = profile.subscription_status === 'active';
    const maxAllowed = isPro ? MAX_ADS_PRO : MAX_ADS_FREE;

    // 5. Parse request body
    const { keyword, location, country, max_ads } = await req.json();

    if (!keyword || typeof keyword !== 'string') {
      return createErrorResponse(req, 'Missing required field: keyword', 400);
    }

    if (!country || typeof country !== 'string') {
      return createErrorResponse(req, 'Missing required field: country', 400);
    }

    // Enforce max_ads limit
    const requestedAds = Math.min(max_ads || 50, maxAllowed);

    // 6. Create job record
    const { data: job, error: jobError } = await supabaseAdmin
      .from('scrape_jobs')
      .insert({
        user_id: user.id,
        job_type: 'lead_finder',
        keyword: keyword.trim(),
        location: location?.trim() || null,
        country: country.toUpperCase(),
        niche: keyword.trim(), // For compatibility with existing schema
        max_ads: requestedAds,
        status: 'pending',
        stage: 'queued',
        progress: 0,
        stage_message: 'Starting search...',
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('[find-leads] Error creating job:', jobError);
      return createErrorResponse(req, 'Failed to create search job.', 500);
    }

    console.log(`[find-leads] Created job ${job.id} for user ${user.id}: ${keyword} in ${location || 'any'}, ${country}`);

    // 7. Call Modal webhook with callback URL (async mode)
    const callbackUrl = `${supabaseUrl}/functions/v1/lead-finder-callback`;

    const modalRequest: ModalRequest = {
      keyword: keyword.trim(),
      country: country.toUpperCase(),
      location: location?.trim() || undefined,
      max_ads: requestedAds,
      // Async callback fields
      job_id: job.id,
      callback_url: callbackUrl,
      callback_secret: callbackSecret,
    };

    const modalResponse = await fetch(MODAL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(modalRequest),
    });

    if (!modalResponse.ok) {
      const errorText = await modalResponse.text();
      console.error(`[find-leads] Modal error: ${modalResponse.status} - ${errorText}`);

      // Update job as failed
      await supabaseAdmin
        .from('scrape_jobs')
        .update({
          status: 'failed',
          stage: 'failed',
          error_message: 'Failed to start search. Please try again.',
        })
        .eq('id', job.id);

      return createErrorResponse(req, 'Failed to start search. Please try again.', 502);
    }

    const modalData = await modalResponse.json();
    console.log(`[find-leads] Modal accepted job: ${JSON.stringify(modalData)}`);

    // 8. Update job status to processing
    await supabaseAdmin
      .from('scrape_jobs')
      .update({
        status: 'processing',
        stage: 'scraping',
        stage_message: 'Searching for businesses...',
      })
      .eq('id', job.id);

    // 9. Return job ID immediately
    return createSuccessResponse(req, {
      success: true,
      job_id: job.id,
      status: 'processing',
      message: 'Search started. You will see results when complete.',
    });

  } catch (error) {
    console.error('Error in find-leads:', error);
    return createErrorResponse(req, 'Something went wrong. Please try again.', 500);
  }
});
