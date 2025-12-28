import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"

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

// =====================================================
// Input Validation Helpers
// =====================================================

// Maximum string lengths for database fields
const MAX_LENGTHS = {
  company_name: 255,
  contact_name: 255,
  email: 255,
  phone: 50,
  url: 2048,
  address: 500,
  location: 255,
  niche: 255,
  owner_title: 100,
  executive_summary: 5000,
  search_query: 500,
};

// Basic email format validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= MAX_LENGTHS.email;
}

// Basic URL format validation
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.length <= MAX_LENGTHS.url;
  } catch {
    return false;
  }
}

// Sanitize and truncate string to max length
function sanitizeString(str: string | undefined | null, maxLength: number): string | undefined {
  if (!str) return undefined;
  // Trim whitespace and truncate
  const sanitized = str.trim().slice(0, maxLength);
  return sanitized.length > 0 ? sanitized : undefined;
}

// Sanitize URL - validate and truncate
function sanitizeUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (trimmed.length === 0) return undefined;
  // If it doesn't start with http, prepend https://
  const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  return isValidUrl(fullUrl) ? fullUrl.slice(0, MAX_LENGTHS.url) : undefined;
}

// Validate and sanitize rating (0-5)
function sanitizeRating(rating: number | undefined | null): number | undefined {
  if (rating === undefined || rating === null) return undefined;
  const num = Number(rating);
  if (isNaN(num)) return undefined;
  // Clamp to valid range
  return Math.max(0, Math.min(5, num));
}

// Validate and sanitize review count (non-negative)
function sanitizeReviewCount(count: number | undefined | null): number | undefined {
  if (count === undefined || count === null) return undefined;
  const num = Math.floor(Number(count));
  if (isNaN(num) || num < 0) return undefined;
  return num;
}

// Validate a scraped lead and return validation result
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateScrapedLead(lead: ScrapedLead): ValidationResult {
  const errors: string[] = [];

  // company_name is required
  const companyName = lead.company_name || lead.business_name;
  if (!companyName || companyName.trim().length === 0) {
    errors.push('Missing company_name');
  } else if (companyName.length > MAX_LENGTHS.company_name) {
    // This is a warning, not an error - we'll truncate
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Helper to extract first email from comma-separated string
function extractFirstEmail(emails?: string): string | undefined {
  if (!emails) return undefined;
  const first = emails.split(',')[0]?.trim();
  // Validate email format
  if (first && isValidEmail(first)) {
    return first;
  }
  return undefined;
}

// Helper to build full address from parts
function buildAddress(l: ScrapedLead): string | undefined {
  // If we already have a full address, use it
  if (l.address) return l.address;
  // Otherwise, build from parts
  const parts = [l.city, l.state, l.zip_code, l.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

// Helper to normalize and sanitize lead data from Modal format to our database format
function normalizeLead(l: ScrapedLead): ScrapedLead {
  // Try to get email from multiple sources and validate
  const rawEmail = l.email || l.owner_email || extractFirstEmail(l.emails);
  const email = rawEmail && isValidEmail(rawEmail) ? rawEmail : undefined;

  return {
    company_name: sanitizeString(l.company_name || l.business_name, MAX_LENGTHS.company_name),
    contact_name: sanitizeString(l.contact_name || l.owner_name, MAX_LENGTHS.contact_name),
    owner_title: sanitizeString(l.owner_title, MAX_LENGTHS.owner_title),
    email: email,
    phone: sanitizeString(l.phone, MAX_LENGTHS.phone),
    website_url: sanitizeUrl(l.website_url || l.website),
    instagram_url: sanitizeUrl(l.instagram_url || l.instagram),
    facebook_url: sanitizeUrl(l.facebook_url || l.facebook),
    linkedin_url: sanitizeUrl(l.linkedin_url || l.linkedin || l.owner_linkedin),
    twitter_url: sanitizeUrl(l.twitter_url || l.twitter),
    youtube_url: sanitizeUrl(l.youtube_url || l.youtube),
    tiktok_url: sanitizeUrl(l.tiktok_url || l.tiktok),
    address: sanitizeString(buildAddress(l), MAX_LENGTHS.address),
    location: sanitizeString(l.location || l.city, MAX_LENGTHS.location),
    zip_code: sanitizeString(l.zip_code, 20),
    country: sanitizeString(l.country, 100),
    niche: sanitizeString(l.niche || l.category, MAX_LENGTHS.niche),
    category: sanitizeString(l.category, MAX_LENGTHS.niche),
    google_rating: sanitizeRating(l.google_rating || l.rating),
    google_review_count: sanitizeReviewCount(l.google_review_count || l.review_count),
    executive_summary: sanitizeString(l.executive_summary, MAX_LENGTHS.executive_summary),
    search_query: sanitizeString(l.search_query, MAX_LENGTHS.search_query),
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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

    console.log(`Callback received for job ${payload.job_id}, status: ${payload.status}, leads: ${payload.leads?.length || 0}`);

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

    // 5. Normalize and validate leads
    const normalizedLeads = leads.map(normalizeLead);

    // Filter out invalid leads (missing required company_name)
    const validLeads = normalizedLeads.filter(l => {
      const result = validateScrapedLead(l);
      return result.isValid;
    });

    const invalidCount = normalizedLeads.length - validLeads.length;
    if (invalidCount > 0) {
      console.log(`Filtered out ${invalidCount} invalid leads (missing company_name)`);
    }

    console.log(`Processing ${validLeads.length} valid leads out of ${leads.length} total`);

    // 6. Deduplicate against existing leads
    const companyNames = validLeads
      .map(l => l.company_name)
      .filter((name): name is string => Boolean(name));

    const { data: existingLeads } = await supabaseAdmin
      .from('leads')
      .select('company_name')
      .eq('user_id', user_id)
      .in('company_name', companyNames);

    const existingNames = new Set(existingLeads?.map(e => e.company_name) || []);

    // 7. Prepare unique leads for insertion
    const uniqueLeads = validLeads
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

    // 8. Insert leads in batches (Supabase has limits)
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
