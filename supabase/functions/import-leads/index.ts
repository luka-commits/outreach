/**
 * import-leads Edge Function
 *
 * Imports leads that were previewed via find-leads into the user's pipeline.
 * Called after user reviews the leads and clicks "Import All".
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { getCorsHeaders, handleCorsPreflightIfNeeded, createErrorResponse, createSuccessResponse } from "../_shared/cors.ts"

interface LeadToImport {
  company_name: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  facebook_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  twitter_url?: string;
  category?: string;
  rating?: number | null;
  review_count?: number | null;
  page_likes?: number;
  ad_count?: number;
  contact_name?: string;
  business_summary?: string;
}

interface ImportRequest {
  leads: LeadToImport[];
  search_params: {
    keyword: string;
    location: string | null;
    country: string;
  };
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
      console.error('[import-leads] Auth error:', authError?.message);
      return createErrorResponse(req, authError?.message || 'Unauthorized', 401);
    }

    // 4. Parse request body
    const { leads, search_params }: ImportRequest = await req.json();

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return createErrorResponse(req, 'No leads provided to import', 400);
    }

    console.log(`[import-leads] User ${user.id} importing ${leads.length} leads`);

    // 5. Prepare leads for insert
    const leadsToInsert = leads.map(lead => ({
      user_id: user.id,
      company_name: lead.company_name,
      website_url: lead.website || null,
      phone: lead.phone || null,
      email: lead.email || null,
      address: lead.address || null,
      google_rating: lead.rating || null,
      google_review_count: lead.review_count || null,
      category: lead.category || null,
      niche: lead.category || search_params?.keyword || null,
      location: search_params?.location || null,
      facebook_url: lead.facebook_url || null,
      instagram_url: lead.instagram_url || null,
      linkedin_url: lead.linkedin_url || null,
      tiktok_url: lead.tiktok_url || null,
      youtube_url: lead.youtube_url || null,
      twitter_url: lead.twitter_url || null,
      page_likes: lead.page_likes || null,
      ad_count: lead.ad_count || null,
      contact_name: lead.contact_name || null,
      executive_summary: lead.business_summary || null,
      status: 'not_contacted',
      created_at: new Date().toISOString(),
    }));

    // 6. Insert leads
    const { error: insertError, data: insertedLeads } = await supabaseAdmin
      .from('leads')
      .insert(leadsToInsert)
      .select('id');

    if (insertError) {
      console.error('[import-leads] Error inserting leads:', insertError);
      return createErrorResponse(req, 'Failed to import leads.', 500);
    }

    const insertedCount = insertedLeads?.length || 0;
    console.log(`[import-leads] Successfully imported ${insertedCount} leads`);

    // 7. Return success response
    return createSuccessResponse(req, {
      success: true,
      imported: insertedCount,
      message: `Successfully imported ${insertedCount} leads`,
    });

  } catch (error) {
    console.error('[import-leads] Error:', error);
    return createErrorResponse(req, 'Something went wrong. Please try again.', 500);
  }
});
