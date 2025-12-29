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

// Validate Twilio webhook signature
async function validateTwilioSignature(
  req: Request,
  authToken: string,
  url: string
): Promise<boolean> {
  const signature = req.headers.get('X-Twilio-Signature');
  if (!signature) {
    console.log('No Twilio signature header');
    return false;
  }

  // For webhook validation, we need to construct the signature base string
  // This is URL + sorted POST params
  const formData = await req.clone().formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  // Sort params by key
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // HMAC-SHA1 signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(authToken);
  const signatureData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, signatureData);
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  return signature === expectedSignature;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // This endpoint is called by Twilio when the browser initiates a call
    // It returns TwiML to tell Twilio what to do

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse form data from Twilio
    const formData = await req.formData();
    const accountSid = formData.get('AccountSid')?.toString();
    const callSid = formData.get('CallSid')?.toString();
    const caller = formData.get('Caller')?.toString(); // client:user_id
    const to = formData.get('To')?.toString();
    const callRecordId = formData.get('callRecordId')?.toString();

    console.log('Twilio voice request:', { accountSid, callSid, caller, to, callRecordId });

    if (!accountSid || !to) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Invalid request parameters.</Say>
  <Hangup/>
</Response>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        }
      );
    }

    // Extract user ID from caller (format: client:user_id)
    const userId = caller?.replace('client:', '');

    if (!userId) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>User not identified.</Say>
  <Hangup/>
</Response>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        }
      );
    }

    // Get user's phone number from profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('twilio_phone_number, twilio_auth_token')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.twilio_phone_number) {
      console.error('Profile error:', profileError);
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Phone number not configured.</Say>
  <Hangup/>
</Response>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        }
      );
    }

    // Update call record with Twilio call SID
    if (callRecordId) {
      await supabaseAdmin
        .from('call_records')
        .update({
          twilio_call_sid: callSid,
          status: 'ringing',
        })
        .eq('id', callRecordId)
        .eq('user_id', userId);
    }

    // Build recording callback URL
    const recordingCallbackUrl = `${supabaseUrl}/functions/v1/recording-ready`;

    // Return TwiML to dial the number
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${profile.twilio_phone_number}"
        record="record-from-answer"
        recordingStatusCallback="${recordingCallbackUrl}"
        recordingStatusCallbackMethod="POST"
        recordingStatusCallbackEvent="completed">
    <Number>${to}</Number>
  </Dial>
</Response>`;

    return new Response(twiml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error handling Twilio voice:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An error occurred. Please try again.</Say>
  <Hangup/>
</Response>`,
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'text/xml' },
      }
    );
  }
});
