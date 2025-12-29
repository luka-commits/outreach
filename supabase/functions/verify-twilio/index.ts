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

interface VerifyRequest {
  accountSid: string;
  authToken: string;
  twimlAppSid?: string;
  phoneNumber?: string;
  step: 'credentials' | 'twiml_app' | 'phone_number';
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

    // 2. Create Supabase client to verify user
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // 3. Get the authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 4. Parse request body
    const body: VerifyRequest = await req.json();
    const { accountSid, authToken, twimlAppSid, phoneNumber, step } = body;

    if (!accountSid || !authToken) {
      return new Response(JSON.stringify({ error: 'Account SID and Auth Token are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Twilio API base URL
    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;
    const authString = btoa(`${accountSid}:${authToken}`);

    // 5. Verify based on step
    switch (step) {
      case 'credentials': {
        // Verify account credentials by fetching account info
        const response = await fetch(`${twilioApiUrl}.json`, {
          headers: {
            'Authorization': `Basic ${authString}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          return new Response(JSON.stringify({
            error: errorData.message || 'Invalid Twilio credentials'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        const accountData = await response.json();
        return new Response(JSON.stringify({
          success: true,
          accountName: accountData.friendly_name,
          accountStatus: accountData.status,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'twiml_app': {
        if (!twimlAppSid) {
          return new Response(JSON.stringify({ error: 'TwiML App SID is required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        // Verify TwiML App exists
        const response = await fetch(
          `${twilioApiUrl}/Applications/${twimlAppSid}.json`,
          {
            headers: {
              'Authorization': `Basic ${authString}`,
            },
          }
        );

        if (!response.ok) {
          return new Response(JSON.stringify({
            error: 'TwiML App not found. Make sure you copied the correct SID.'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        const appData = await response.json();
        return new Response(JSON.stringify({
          success: true,
          appName: appData.friendly_name,
          voiceUrl: appData.voice_url,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'phone_number': {
        if (!phoneNumber) {
          return new Response(JSON.stringify({ error: 'Phone number is required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        // Verify phone number belongs to account
        const response = await fetch(
          `${twilioApiUrl}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`,
          {
            headers: {
              'Authorization': `Basic ${authString}`,
            },
          }
        );

        if (!response.ok) {
          return new Response(JSON.stringify({
            error: 'Failed to verify phone number'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        const data = await response.json();
        if (!data.incoming_phone_numbers || data.incoming_phone_numbers.length === 0) {
          return new Response(JSON.stringify({
            error: 'Phone number not found in your Twilio account'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        const phoneData = data.incoming_phone_numbers[0];
        return new Response(JSON.stringify({
          success: true,
          phoneNumber: phoneData.phone_number,
          friendlyName: phoneData.friendly_name,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid step' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
    }
  } catch (error) {
    console.error('Error verifying Twilio:', error);
    return new Response(JSON.stringify({
      error: 'Failed to verify Twilio configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
