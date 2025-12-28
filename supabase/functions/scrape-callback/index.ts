import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Expected payload from Modal webhook
interface WebhookPayload {
  job_id: string;
  user_id: string;
  secret: string;
  status: 'success' | 'error';
  error_message?: string;
  leads: ScrapedLead[];
}

// Modal pipeline sends different field names than our database schema
// This interface accepts both naming conventions
interface ScrapedLead {
  // Company name (Modal sends business_name)
  company_name?: string;
  business_name?: string;
  // Contact info (Modal sends owner_name, owner_email, or emails as comma-separated string)
  contact_name?: string;
  owner_name?: string;
  owner_title?: string; // e.g., "Owner", "CEO", "Founder"
  email?: string;
  owner_email?: string;
  emails?: string; // Modal sends comma-separated string like "email1@x.com, email2@y.com"
  phone?: string;
  additional_phones?: string; // Modal sends comma-separated string
  // URLs (Modal sends website, instagram, facebook, linkedin without _url suffix)
  website_url?: string;
  website?: string;
  instagram_url?: string;
  instagram?: string;
  facebook_url?: string;
  facebook?: string;
  linkedin_url?: string;
  linkedin?: string;
  owner_linkedin?: string;
  twitter_url?: string;
  twitter?: string;
  youtube_url?: string;
  youtube?: string;
  tiktok_url?: string;
  tiktok?: string;
  // Location (Modal sends city, state, zip_code, country separately)
  address?: string;
  location?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  // Category (Modal sends category instead of niche)
  niche?: string;
  category?: string;
  // Ratings (Modal sends rating/review_count without google_ prefix)
  google_rating?: number;
  rating?: number;
  google_review_count?: number;
  review_count?: number;
  // Enrichment fields from Modal
  executive_summary?: string; // AI-generated business description
  search_query?: string; // The query that found this lead
  // Additional fields from Modal
  google_maps_url?: string;
  place_id?: string;
}

// Helper to extract first email from comma-separated string
function extractFirstEmail(emails?: string): string | undefined {
  if (!emails) return undefined;
  const first = emails.split(',')[0]?.trim();
  // Basic email validation
  return first && first.includes('@') ? first : undefined;
}

// Helper to build full address from parts
function buildAddress(l: ScrapedLead): string | undefined {
  // If we already have a full address, use it
  if (l.address) return l.address;
  // Otherwise, build from parts
  const parts = [l.city, l.state, l.zip_code, l.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

// Helper to normalize lead data from Modal format to our database format
function normalizeLead(l: ScrapedLead): ScrapedLead {
  // Try to get email from multiple sources
  const email = l.email || l.owner_email || extractFirstEmail(l.emails);

  return {
    company_name: l.company_name || l.business_name,
    contact_name: l.contact_name || l.owner_name,
    owner_title: l.owner_title,
    email: email,
    phone: l.phone,
    website_url: l.website_url || l.website,
    instagram_url: l.instagram_url || l.instagram,
    facebook_url: l.facebook_url || l.facebook,
    linkedin_url: l.linkedin_url || l.linkedin || l.owner_linkedin,
    twitter_url: l.twitter_url || l.twitter,
    youtube_url: l.youtube_url || l.youtube,
    tiktok_url: l.tiktok_url || l.tiktok,
    address: buildAddress(l),
    location: l.location || l.city,
    zip_code: l.zip_code,
    country: l.country,
    niche: l.niche || l.category,
    category: l.category,
    google_rating: l.google_rating || l.rating,
    google_review_count: l.google_review_count || l.review_count,
    executive_summary: l.executive_summary,
    search_query: l.search_query,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate webhook secret (accept from Authorization header OR body)
    const webhookSecret = Deno.env.get('SCRAPE_WEBHOOK_SECRET');
    const payload: WebhookPayload = await req.json();

    // Check Authorization header first, then fall back to body
    const authHeader = req.headers.get('Authorization');
    const secretFromHeader = authHeader?.replace('Bearer ', '');
    const secretFromBody = payload.secret;
    const providedSecret = secretFromHeader || secretFromBody;

    if (!webhookSecret || providedSecret !== webhookSecret) {
      console.error('Invalid webhook secret. Header:', !!secretFromHeader, 'Body:', !!secretFromBody);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    console.log(`Callback received for job ${payload.job_id}, status: ${payload.status}`);
    console.log(`Leads count: ${payload.leads?.length || 0}`);

    // Debug: Log first lead's raw data to see what Modal is sending
    if (payload.leads && payload.leads.length > 0) {
      const firstLead = payload.leads[0];
      console.log('=== FIRST LEAD RAW DATA ===');
      console.log(JSON.stringify(firstLead, null, 2));
      console.log('=== END RAW DATA ===');
    }

    // 2. Create Supabase admin client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { job_id, user_id, status, error_message, leads } = payload;

    // 3. Verify job exists and belongs to user
    const { data: existingJob, error: jobError } = await supabaseAdmin
      .from('scrape_jobs')
      .select('id, status')
      .eq('id', job_id)
      .eq('user_id', user_id)
      .single();

    if (jobError || !existingJob) {
      console.error('Job not found:', job_id, user_id);
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Note: Job is already set to 'processing' by start-scrape, no need to update again

    // 4. Handle error case from scraper
    if (status === 'error' || !leads || leads.length === 0) {
      await supabaseAdmin
        .from('scrape_jobs')
        .update({
          status: 'failed',
          error_message: error_message || 'No leads found',
          completed_at: new Date().toISOString(),
          leads_found: 0,
          leads_imported: 0,
          leads_skipped: 0,
        })
        .eq('id', job_id);

      return new Response(JSON.stringify({
        success: false,
        error: error_message || 'No leads found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 5. Normalize leads to our database format
    const normalizedLeads = leads.map(normalizeLead);
    console.log(`Normalized ${normalizedLeads.length} leads. First lead company: ${normalizedLeads[0]?.company_name}`);

    // Debug: Log normalized lead to see if mapping worked
    if (normalizedLeads.length > 0) {
      console.log('=== FIRST LEAD AFTER NORMALIZATION ===');
      console.log(JSON.stringify(normalizedLeads[0], null, 2));
      console.log('=== END NORMALIZED ===');
    }

    // 6. Deduplicate against existing leads
    const companyNames = normalizedLeads
      .map(l => l.company_name)
      .filter((name): name is string => Boolean(name));

    const { data: existingLeads } = await supabaseAdmin
      .from('leads')
      .select('company_name')
      .eq('user_id', user_id)
      .in('company_name', companyNames);

    const existingNames = new Set(existingLeads?.map(e => e.company_name) || []);

    // 7. Prepare unique leads for insertion
    const uniqueLeads = normalizedLeads
      .filter(l => l.company_name && !existingNames.has(l.company_name))
      .map(l => ({
        id: crypto.randomUUID(),
        user_id: user_id,
        company_name: l.company_name,
        contact_name: l.contact_name || null,
        email: l.email || null,
        phone: l.phone || null,
        website_url: l.website_url || null,
        instagram_url: l.instagram_url || null,
        facebook_url: l.facebook_url || null,
        linkedin_url: l.linkedin_url || null,
        twitter_url: l.twitter_url || null,
        youtube_url: l.youtube_url || null,
        tiktok_url: l.tiktok_url || null,
        address: l.address || null,
        location: l.location || null,
        zip_code: l.zip_code || null,
        country: l.country || null,
        niche: l.niche || null,
        category: l.category || null,
        google_rating: l.google_rating || null,
        google_review_count: l.google_review_count || null,
        owner_title: l.owner_title || null,
        executive_summary: l.executive_summary || null,
        search_query: l.search_query || null,
        status: 'not_contacted',
        current_step_index: 0,
        created_at: new Date().toISOString(),
      }));

    // Debug: Log what we're about to insert
    if (uniqueLeads.length > 0) {
      console.log('=== FIRST LEAD TO INSERT ===');
      console.log(JSON.stringify(uniqueLeads[0], null, 2));
      console.log('=== END TO INSERT ===');
    }

    // 7. Insert leads in batches (Supabase has limits)
    const BATCH_SIZE = 100;
    let insertedCount = 0;

    try {
      for (let i = 0; i < uniqueLeads.length; i += BATCH_SIZE) {
        const batch = uniqueLeads.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabaseAdmin
          .from('leads')
          .insert(batch);

        if (insertError) {
          console.error('Batch insert error:', insertError);
          throw insertError;
        }
        insertedCount += batch.length;
      }
    } catch (insertError) {
      // Mark job as failed if lead insertion fails
      console.error('Lead insertion failed, marking job as failed:', insertError);
      await supabaseAdmin
        .from('scrape_jobs')
        .update({
          status: 'failed',
          error_message: `Failed to import leads: ${insertError.message || 'Unknown error'}`,
          completed_at: new Date().toISOString(),
          leads_found: leads.length,
          leads_imported: insertedCount,
          leads_skipped: leads.length - insertedCount,
        })
        .eq('id', job_id);

      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to import leads',
        leads_found: leads.length,
        leads_imported: insertedCount,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 so Modal doesn't retry
      });
    }

    // 8. Update job with final stats
    const { error: updateError } = await supabaseAdmin
      .from('scrape_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        leads_found: leads.length,
        leads_imported: insertedCount,
        leads_skipped: leads.length - insertedCount,
      })
      .eq('id', job_id);

    if (updateError) {
      console.error('Failed to update job status to completed:', updateError);
    } else {
      console.log(`Job ${job_id} status updated to COMPLETED`);
    }

    console.log(`Job ${job_id} completed: ${insertedCount}/${leads.length} leads imported`);

    return new Response(JSON.stringify({
      success: true,
      leads_found: leads.length,
      leads_imported: insertedCount,
      leads_skipped: leads.length - insertedCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
