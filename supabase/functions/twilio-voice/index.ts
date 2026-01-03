import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts"
import { validateTwilioSignature } from "../_shared/twilioValidation.ts"
import { safeDecrypt, isEncryptionConfigured } from "../_shared/encryption.ts"

serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  let corsHeaders: Record<string, string>;
  try {
    corsHeaders = getCorsHeaders(req);
  } catch {
    corsHeaders = { 'Content-Type': 'text/xml' };
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

    // SECURITY: Validate Twilio webhook signature
    if (profile.twilio_auth_token) {
      // Decrypt auth token if encryption is configured
      let authToken: string = profile.twilio_auth_token;
      if (isEncryptionConfigured()) {
        const decrypted = await safeDecrypt(profile.twilio_auth_token);
        if (!decrypted) {
          // Can't decrypt - reject the request
          return new Response(
            `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Configuration error. Please reconfigure your account.</Say>
  <Hangup/>
</Response>`,
            {
              headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
            }
          );
        }
        authToken = decrypted;
      }

      const webhookUrl = `${supabaseUrl}/functions/v1/twilio-voice`;
      const isValidSignature = await validateTwilioSignature(
        req,
        authToken,
        webhookUrl,
        formData
      );

      if (!isValidSignature) {
        // Invalid signature - could be forged request
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Unauthorized request.</Say>
  <Hangup/>
</Response>`,
          {
            headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
            status: 403,
          }
        );
      }
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
    console.error('Error handling Twilio voice');
    let corsHeadersFallback: Record<string, string>;
    try {
      corsHeadersFallback = getCorsHeaders(req);
    } catch {
      corsHeadersFallback = { 'Content-Type': 'text/xml' };
    }
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An error occurred. Please try again.</Say>
  <Hangup/>
</Response>`,
      {
        headers: { ...corsHeadersFallback, 'Content-Type': 'text/xml' },
      }
    );
  }
});
