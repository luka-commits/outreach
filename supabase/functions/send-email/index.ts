import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// CORS configuration
const getAllowedOrigin = (req: Request): string => {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(o => o.trim());

  if (allowedOrigins.length === 0 || allowedOrigins[0] === '' || allowedOrigins.includes(origin)) {
    return origin || '*';
  }

  return allowedOrigins[0];
};

const getCorsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

// Helper to base64url encode for Gmail API
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Refresh Gmail access token
async function refreshGmailToken(
  refreshToken: string,
  clientId: string
): Promise<{ accessToken: string; expiresAt: string } | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Token refresh failed:', data);
      return null;
    }

    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    return {
      accessToken: data.access_token,
      expiresAt,
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

// Send email via Gmail API
async function sendViaGmail(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string,
  fromEmail: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Build MIME message
  const mimeMessage = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody,
  ].join('\r\n');

  const encodedMessage = base64UrlEncode(mimeMessage);

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gmail send failed:', data);
      return {
        success: false,
        error: data.error?.message || 'Failed to send via Gmail',
      };
    }

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error('Gmail send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Send email via Resend API
async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html: htmlBody,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend send failed:', data);
      return {
        success: false,
        error: data.message || 'Failed to send via Resend',
      };
    }

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error('Resend send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    // 4. Get request body
    const { leadId, subject, bodyHtml } = await req.json();

    if (!leadId || !subject || !bodyHtml) {
      return new Response(JSON.stringify({ error: 'Missing required fields: leadId, subject, bodyHtml' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 5. Get lead email
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('email, company_name, contact_name')
      .eq('id', leadId)
      .eq('user_id', user.id)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (!lead.email) {
      return new Response(JSON.stringify({ error: 'Lead has no email address' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 6. Get user's email settings
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(`
        email_provider,
        gmail_access_token,
        gmail_refresh_token,
        gmail_token_expires_at,
        gmail_email,
        resend_api_key,
        resend_from_address
      `)
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Failed to get email settings' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const provider = profile.email_provider;

    if (!provider) {
      return new Response(JSON.stringify({ error: 'No email provider configured. Please set up email in Settings.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let result: { success: boolean; messageId?: string; error?: string };

    // 7. Send via the appropriate provider
    if (provider === 'gmail') {
      // Check if we have Gmail credentials
      if (!profile.gmail_access_token || !profile.gmail_refresh_token || !profile.gmail_email) {
        return new Response(JSON.stringify({ error: 'Gmail not connected. Please reconnect in Settings.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      let accessToken = profile.gmail_access_token;
      const gmailClientId = Deno.env.get('GMAIL_CLIENT_ID');

      // Check if token is expired
      const expiresAt = new Date(profile.gmail_token_expires_at);
      const now = new Date();

      if (expiresAt <= now) {
        // Token expired, try to refresh
        if (!gmailClientId) {
          return new Response(JSON.stringify({ error: 'Gmail OAuth not configured on server' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }

        const refreshResult = await refreshGmailToken(profile.gmail_refresh_token, gmailClientId);

        if (!refreshResult) {
          return new Response(JSON.stringify({
            error: 'Gmail token expired. Please reconnect Gmail in Settings.',
            tokenExpired: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          });
        }

        // Update stored token
        await supabaseAdmin
          .from('profiles')
          .update({
            gmail_access_token: refreshResult.accessToken,
            gmail_token_expires_at: refreshResult.expiresAt,
          })
          .eq('id', user.id);

        accessToken = refreshResult.accessToken;
      }

      result = await sendViaGmail(
        accessToken,
        lead.email,
        subject,
        bodyHtml,
        profile.gmail_email
      );

    } else if (provider === 'resend') {
      // Check if we have Resend credentials
      if (!profile.resend_api_key || !profile.resend_from_address) {
        return new Response(JSON.stringify({ error: 'Resend not configured. Please set up in Settings.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      result = await sendViaResend(
        profile.resend_api_key,
        profile.resend_from_address,
        lead.email,
        subject,
        bodyHtml
      );

    } else {
      return new Response(JSON.stringify({ error: `Unknown email provider: ${provider}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 8. Return result
    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        messageId: result.messageId,
        provider,
        to: lead.email,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({
        error: result.error || 'Failed to send email',
        provider,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

  } catch (error) {
    console.error('Error in send-email:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
