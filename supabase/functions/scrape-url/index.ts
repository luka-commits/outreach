/**
 * scrape-url Edge Function
 *
 * Extracts business information from a company website URL.
 *
 * IMPORTANT: This is designed for BUSINESS WEBSITE URLs only (e.g., acme-plumbing.com).
 * It will NOT work reliably for:
 * - Facebook pages (JS-rendered, anti-scraping protection)
 * - Instagram profiles
 * - Other social media URLs
 *
 * Recommended user flow: If a user finds a business on Facebook, they should copy the
 * website URL from the Facebook page's "About" section and paste that here instead.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { getCorsHeaders, handleCorsPreflightIfNeeded, createErrorResponse, createSuccessResponse } from "../_shared/cors.ts"
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts"

// Types for extracted data
interface ExtractedLeadData {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  websiteUrl: string;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  address?: string;
  location?: string;
  niche?: string;
}

interface ScrapeUrlResponse {
  success: boolean;
  data?: ExtractedLeadData;
  error?: string;
  partialData?: boolean;
}

// Regex patterns for extraction
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?[\d\s\-().]{10,20})/g;

// Social media URL patterns
const SOCIAL_PATTERNS = {
  instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)\/?/i,
  facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9.]+)\/?/i,
  linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9-]+)\/?/i,
  twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]+)\/?/i,
  youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)?([a-zA-Z0-9_-]+)\/?/i,
};

// Check if URL is a private/internal IP
function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Block localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    // Block private IP ranges
    const ipParts = hostname.split('.');
    if (ipParts.length === 4) {
      const first = parseInt(ipParts[0]);
      const second = parseInt(ipParts[1]);

      // 10.x.x.x
      if (first === 10) return true;
      // 172.16.x.x - 172.31.x.x
      if (first === 172 && second >= 16 && second <= 31) return true;
      // 192.168.x.x
      if (first === 192 && second === 168) return true;
      // 169.254.x.x (link-local)
      if (first === 169 && second === 254) return true;
    }

    return false;
  } catch {
    return true; // Invalid URL
  }
}

// Normalize URL (add https:// if missing)
function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  return normalized;
}

// Fetch a page with timeout and error handling
async function fetchPage(url: string, timeoutMs = 15000): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.log(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      console.log(`Non-HTML content type: ${contentType}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`Timeout fetching ${url}`);
    } else {
      console.log(`Error fetching ${url}: ${error}`);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Extract basic info from HTML
function extractFromHtml(html: string, baseUrl: string): {
  title: string;
  description: string;
  emails: string[];
  phones: string[];
  socialLinks: Record<string, string>;
  textContent: string;
} {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                   html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : '';

  // Extract emails
  const emails = [...new Set(html.match(EMAIL_REGEX) || [])].filter(
    email => !email.includes('example') && !email.includes('test@')
  );

  // Extract phone numbers from visible text (crude but works)
  const phones = [...new Set(html.match(PHONE_REGEX) || [])].map(p => p.trim()).filter(
    p => p.replace(/\D/g, '').length >= 7
  );

  // Extract social links
  const socialLinks: Record<string, string> = {};
  for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
    const matches = html.match(new RegExp(pattern.source, 'gi'));
    if (matches && matches.length > 0) {
      // Take the first match and normalize it
      let link = matches[0];
      if (!link.startsWith('http')) {
        link = 'https://' + link;
      }
      socialLinks[platform] = link;
    }
  }

  // Extract text content (remove scripts, styles, tags)
  let textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Truncate to reasonable size
  if (textContent.length > 30000) {
    textContent = textContent.substring(0, 30000) + '...';
  }

  return { title, description, emails, phones, socialLinks, textContent };
}

// Find and fetch contact/about pages
async function fetchAdditionalPages(baseUrl: string, html: string): Promise<string> {
  const patterns = [
    /href=["']([^"']*(?:contact|kontakt|about|uber-uns|impressum)[^"']*)["']/gi,
  ];

  const links: string[] = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null && links.length < 3) {
      let link = match[1];
      // Convert relative to absolute URL
      try {
        const absoluteUrl = new URL(link, baseUrl).href;
        if (!links.includes(absoluteUrl) && absoluteUrl.startsWith(baseUrl.split('/').slice(0, 3).join('/'))) {
          links.push(absoluteUrl);
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }

  // Fetch up to 2 additional pages
  const additionalContent: string[] = [];
  for (const link of links.slice(0, 2)) {
    const pageHtml = await fetchPage(link, 10000);
    if (pageHtml) {
      // Extract just the text content
      const text = pageHtml
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length > 0) {
        additionalContent.push(`[From ${link}]: ${text.substring(0, 10000)}`);
      }
    }
  }

  return additionalContent.join('\n\n');
}

// Call Anthropic API to extract structured data
async function extractWithAI(
  url: string,
  title: string,
  description: string,
  emails: string[],
  phones: string[],
  socialLinks: Record<string, string>,
  textContent: string,
  additionalContent: string,
  apiKey: string
): Promise<ExtractedLeadData | null> {
  const prompt = `Extract business information from this website content. Return a JSON object with these fields:
- companyName: Official business name (required)
- contactName: Owner or contact person name if found
- email: Primary business email (choose most relevant from list)
- phone: Primary business phone number
- address: Physical business address if found
- location: City, State/Country
- niche: Business category/industry

Only include fields you can confidently extract. Return null for uncertain fields.
Return ONLY the JSON object, no other text.

Website URL: ${url}
Page Title: ${title}
Meta Description: ${description}

Emails found: ${emails.join(', ') || 'none'}
Phone numbers found: ${phones.join(', ') || 'none'}
Social media links: ${JSON.stringify(socialLinks)}

Main page content:
${textContent.substring(0, 15000)}

${additionalContent ? `Additional pages content:\n${additionalContent.substring(0, 10000)}` : ''}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return null;
    }

    const result = await response.json();
    const content = result.content?.[0]?.text;

    if (!content) {
      console.error('No content in Anthropic response');
      return null;
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const extracted = JSON.parse(jsonStr);

    // Build result with social links
    const result_data: ExtractedLeadData = {
      websiteUrl: url,
      companyName: extracted.companyName || undefined,
      contactName: extracted.contactName || undefined,
      email: extracted.email || (emails.length > 0 ? emails[0] : undefined),
      phone: extracted.phone || (phones.length > 0 ? phones[0] : undefined),
      address: extracted.address || undefined,
      location: extracted.location || undefined,
      niche: extracted.niche || undefined,
      instagramUrl: socialLinks.instagram || undefined,
      facebookUrl: socialLinks.facebook || undefined,
      linkedinUrl: socialLinks.linkedin || undefined,
      twitterUrl: socialLinks.twitter || undefined,
      youtubeUrl: socialLinks.youtube || undefined,
    };

    return result_data;
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    return null;
  }
}

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
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);

    if (authError || !user) {
      return createErrorResponse(req, 'Unauthorized', 401);
    }

    // Rate limit: 20 requests per minute per user
    const rateLimit = checkRateLimit(user.id, 'scrape-url', 20, 60000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    // 4. Check monthly URL scrape limit (20/month for free users)
    const FREE_LIMIT = 20;
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, url_scrapes_this_month, url_scrapes_reset_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return createErrorResponse(req, 'Failed to check usage limit.', 500);
    }

    const isPro = profile.subscription_status === 'active';

    // Check if we need to reset the monthly counter
    const now = new Date();
    const resetAt = profile.url_scrapes_reset_at ? new Date(profile.url_scrapes_reset_at) : new Date(0);
    const monthsSinceReset = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth());

    let currentCount = profile.url_scrapes_this_month || 0;

    if (monthsSinceReset >= 1) {
      // Reset the counter for a new month
      currentCount = 0;
      await supabaseAdmin
        .from('profiles')
        .update({ url_scrapes_this_month: 0, url_scrapes_reset_at: now.toISOString() })
        .eq('id', user.id);
    }

    // Check limit for free users
    if (!isPro && currentCount >= FREE_LIMIT) {
      return createErrorResponse(
        req,
        `Monthly limit reached (${FREE_LIMIT} URL scrapes). Upgrade to Pro for unlimited scrapes.`,
        429
      );
    }

    // 5. Get request body
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return createErrorResponse(req, 'Missing required field: url', 400);
    }

    // 5. Normalize and validate URL
    const normalizedUrl = normalizeUrl(url);

    try {
      new URL(normalizedUrl);
    } catch {
      return createErrorResponse(req, 'Invalid URL. Please enter a valid website address.', 400);
    }

    if (isPrivateUrl(normalizedUrl)) {
      return createErrorResponse(req, 'Invalid URL. Private addresses are not allowed.', 400);
    }

    // 6. Get Anthropic API key from environment
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return createErrorResponse(req, 'Service not configured. Please contact support.', 500);
    }

    // 7. Fetch the homepage
    const html = await fetchPage(normalizedUrl);
    if (!html) {
      return createErrorResponse(req, 'Could not reach website. Please check the URL and try again.', 400);
    }

    // 8. Extract basic info from HTML
    const { title, description, emails, phones, socialLinks, textContent } = extractFromHtml(html, normalizedUrl);

    // 9. Fetch additional pages (contact, about)
    const additionalContent = await fetchAdditionalPages(normalizedUrl, html);

    // 10. Call Anthropic API for intelligent extraction
    const extractedData = await extractWithAI(
      normalizedUrl,
      title,
      description,
      emails,
      phones,
      socialLinks,
      textContent,
      additionalContent,
      anthropicKey
    );

    // Increment the URL scrape counter (for successful scrapes)
    await supabaseAdmin
      .from('profiles')
      .update({ url_scrapes_this_month: currentCount + 1 })
      .eq('id', user.id);

    if (!extractedData) {
      // Fallback: return what we could extract manually
      const fallbackData: ExtractedLeadData = {
        websiteUrl: normalizedUrl,
        companyName: title.split(/[|\-–]/).map(s => s.trim())[0] || undefined,
        email: emails[0] || undefined,
        phone: phones[0] || undefined,
        instagramUrl: socialLinks.instagram || undefined,
        facebookUrl: socialLinks.facebook || undefined,
        linkedinUrl: socialLinks.linkedin || undefined,
        twitterUrl: socialLinks.twitter || undefined,
        youtubeUrl: socialLinks.youtube || undefined,
      };

      const response: ScrapeUrlResponse = {
        success: true,
        data: fallbackData,
        partialData: true,
      };

      return createSuccessResponse(req, response as unknown as Record<string, unknown>);
    }

    // 12. Check if we have partial data (missing key fields)
    const hasPartialData = !extractedData.companyName || (!extractedData.email && !extractedData.phone);

    const response: ScrapeUrlResponse = {
      success: true,
      data: extractedData,
      partialData: hasPartialData,
    };

    return createSuccessResponse(req, response as unknown as Record<string, unknown>);

  } catch (error) {
    console.error('Error in scrape-url:', error);
    return createErrorResponse(req, 'Something went wrong. Please try again.', 500);
  }
});
