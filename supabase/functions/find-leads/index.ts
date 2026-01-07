/**
 * find-leads Edge Function
 *
 * Searches for businesses using Modal scraper and returns them for preview.
 * Does NOT auto-import - user reviews leads first, then imports via import-leads endpoint.
 * Calls the Modal webhook: https://luka-50609--lead-scraper-scrape-leads.modal.run
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
  include_summary?: boolean;
  include_fb_enrichment?: boolean;
}

interface ModalLead {
  company_name: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  rating?: number;
  review_count?: number;
  category?: string;
  facebook_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
}

interface ModalResponse {
  success: boolean;
  leads: ModalLead[];
  total_found: number;
  message?: string;
  error?: string;
}

// Normalize company name for duplicate detection
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

    // 6. Call Modal webhook
    console.log(`[find-leads] Calling Modal for user ${user.id}: ${keyword} in ${location || 'any'}, ${country}`);

    const modalRequest: ModalRequest = {
      keyword: keyword.trim(),
      country: country.toUpperCase(),
      location: location?.trim() || undefined,
      max_ads: requestedAds,
      include_summary: false,
      include_fb_enrichment: true,
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
      return createErrorResponse(req, 'Failed to search for leads. Please try again.', 502);
    }

    const modalData: ModalResponse = await modalResponse.json();

    if (!modalData.success) {
      console.error(`[find-leads] Modal returned error: ${modalData.error || modalData.message}`);
      return createErrorResponse(req, modalData.error || 'Failed to search for leads.', 502);
    }

    console.log(`[find-leads] Modal returned ${modalData.leads.length} leads (total found: ${modalData.total_found})`);

    // 7. Get existing leads for duplicate detection
    const { data: existingLeads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('company_name')
      .eq('user_id', user.id);

    if (leadsError) {
      console.error('Error fetching existing leads:', leadsError);
      return createErrorResponse(req, 'Failed to check for duplicates.', 500);
    }

    const existingNames = new Set(
      (existingLeads || []).map(l => normalizeCompanyName(l.company_name))
    );

    // 8. Separate leads into new and duplicates
    const newLeads: typeof modalData.leads = [];
    const duplicateLeads: typeof modalData.leads = [];
    const seenInBatch = new Set<string>();

    for (const lead of modalData.leads) {
      if (!lead.company_name) continue;
      const normalized = normalizeCompanyName(lead.company_name);

      if (existingNames.has(normalized) || seenInBatch.has(normalized)) {
        duplicateLeads.push(lead);
      } else {
        seenInBatch.add(normalized);
        newLeads.push(lead);
      }
    }

    console.log(`[find-leads] Found ${newLeads.length} new leads, ${duplicateLeads.length} duplicates`);

    // 9. Return leads for preview (no auto-import)
    return createSuccessResponse(req, {
      success: true,
      leads: newLeads,
      duplicates: duplicateLeads,
      total_found: modalData.total_found,
      new_count: newLeads.length,
      duplicate_count: duplicateLeads.length,
      search_params: {
        keyword,
        location: location || null,
        country,
      },
    });

  } catch (error) {
    console.error('Error in find-leads:', error);
    return createErrorResponse(req, 'Something went wrong. Please try again.', 500);
  }
});
