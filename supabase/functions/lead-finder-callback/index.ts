/**
 * lead-finder-callback Edge Function
 *
 * Webhook endpoint that Modal calls when lead scraping is complete.
 * Validates the callback secret, deduplicates leads, and updates the job record.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

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

interface CallbackPayload {
  job_id: string;
  secret: string;
  success: boolean;
  leads: ModalLead[];
  total_found: number;
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
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Parse request body
    const payload: CallbackPayload = await req.json();

    const { job_id, secret, success, leads, total_found, error: modalError } = payload;

    console.log(`[lead-finder-callback] Received callback for job ${job_id}, success=${success}, leads=${leads?.length || 0}`);

    // 2. Validate required fields
    if (!job_id || !secret) {
      console.error('[lead-finder-callback] Missing job_id or secret');
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Validate callback secret
    const expectedSecret = Deno.env.get('LEAD_FINDER_CALLBACK_SECRET') ?? '';
    if (!expectedSecret || secret !== expectedSecret) {
      console.error('[lead-finder-callback] Invalid callback secret');
      // Return 200 to prevent retries, but log the error
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 5. Fetch the job to get user_id
    const { data: job, error: jobFetchError } = await supabaseAdmin
      .from('scrape_jobs')
      .select('id, user_id, status')
      .eq('id', job_id)
      .single();

    if (jobFetchError || !job) {
      console.error(`[lead-finder-callback] Job not found: ${job_id}`, jobFetchError);
      // Return 200 to prevent retries
      return new Response(JSON.stringify({ received: true, error: 'Job not found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. Handle error case
    if (!success) {
      console.error(`[lead-finder-callback] Job ${job_id} failed: ${modalError}`);

      await supabaseAdmin
        .from('scrape_jobs')
        .update({
          status: 'failed',
          stage: 'failed',
          error_message: modalError || 'Search failed. Please try again.',
        })
        .eq('id', job_id);

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 7. Get existing leads for duplicate detection
    const { data: existingLeads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('company_name')
      .eq('user_id', job.user_id);

    if (leadsError) {
      console.error('[lead-finder-callback] Error fetching existing leads:', leadsError);
      // Continue anyway, we'll store all leads
    }

    const existingNames = new Set(
      (existingLeads || []).map(l => normalizeCompanyName(l.company_name))
    );

    // 8. Separate leads into new and duplicates
    const newLeads: ModalLead[] = [];
    const duplicateLeads: ModalLead[] = [];
    const seenInBatch = new Set<string>();

    for (const lead of leads || []) {
      if (!lead.company_name) continue;
      const normalized = normalizeCompanyName(lead.company_name);

      if (existingNames.has(normalized) || seenInBatch.has(normalized)) {
        duplicateLeads.push(lead);
      } else {
        seenInBatch.add(normalized);
        newLeads.push(lead);
      }
    }

    console.log(`[lead-finder-callback] Job ${job_id}: ${newLeads.length} new leads, ${duplicateLeads.length} duplicates`);

    // 9. Update job with results
    const { error: updateError } = await supabaseAdmin
      .from('scrape_jobs')
      .update({
        status: 'completed',
        stage: 'completed',
        stage_message: `Found ${newLeads.length} new leads`,
        progress: 100,
        result_leads: newLeads,
        result_duplicates: duplicateLeads,
        total_found: total_found || leads?.length || 0,
      })
      .eq('id', job_id);

    if (updateError) {
      console.error('[lead-finder-callback] Error updating job:', updateError);
      return new Response(JSON.stringify({ received: true, error: 'Failed to update job' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[lead-finder-callback] Job ${job_id} completed successfully`);

    return new Response(JSON.stringify({ received: true, success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[lead-finder-callback] Error processing callback:', error);
    // Always return 200 to prevent Modal retries
    return new Response(JSON.stringify({ received: true, error: 'Internal error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
