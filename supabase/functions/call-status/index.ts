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
    corsHeaders = { 'Content-Type': 'application/json' };
  }

  try {
    // This endpoint receives status callbacks from Twilio
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse form data from Twilio
    const formData = await req.formData();
    const callSid = formData.get('CallSid')?.toString();
    const callStatus = formData.get('CallStatus')?.toString();
    const callDuration = formData.get('CallDuration')?.toString();

    if (!callSid || !callStatus) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Find the call record to get user's Twilio credentials for validation
    const { data: callRecord, error: findError } = await supabaseAdmin
      .from('call_records')
      .select('id, user_id')
      .eq('twilio_call_sid', callSid)
      .single();

    if (findError || !callRecord) {
      // Call record not found - return success to prevent Twilio retries
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's Twilio auth token for webhook validation
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('twilio_auth_token')
      .eq('id', callRecord.user_id)
      .single();

    if (!profile?.twilio_auth_token) {
      // No auth token - can't validate, return success to prevent retries
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decrypt auth token if encryption is configured
    let authToken: string = profile.twilio_auth_token;
    if (isEncryptionConfigured()) {
      const decrypted = await safeDecrypt(profile.twilio_auth_token);
      if (!decrypted) {
        // Can't decrypt - return success to prevent Twilio retries
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      authToken = decrypted;
    }

    // SECURITY: Validate Twilio webhook signature
    const webhookUrl = `${supabaseUrl}/functions/v1/call-status`;
    const isValidSignature = await validateTwilioSignature(
      req,
      authToken,
      webhookUrl,
      formData
    );

    if (!isValidSignature) {
      // Invalid signature - could be forged request
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Map Twilio call status to our status
    let status: string;
    switch (callStatus) {
      case 'queued':
      case 'initiated':
        status = 'initiated';
        break;
      case 'ringing':
        status = 'ringing';
        break;
      case 'in-progress':
        status = 'in-progress';
        break;
      case 'completed':
        status = 'completed';
        break;
      case 'busy':
      case 'no-answer':
      case 'failed':
      case 'canceled':
        status = 'failed';
        break;
      default:
        status = callStatus;
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      status: status,
    };

    // Add duration if available (only on completed calls)
    if (callDuration) {
      updateData.duration_seconds = parseInt(callDuration, 10);
    }

    // Set ended_at for terminal statuses
    if (['completed', 'failed'].includes(status)) {
      updateData.ended_at = new Date().toISOString();
    }

    // Update call record
    const { error: updateError } = await supabaseAdmin
      .from('call_records')
      .update(updateData)
      .eq('id', callRecord.id);

    // Log errors but don't expose details
    void updateError;

    // Return success to Twilio
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error handling call status');
    let corsHeadersFallback: Record<string, string>;
    try {
      corsHeadersFallback = getCorsHeaders(req);
    } catch {
      corsHeadersFallback = { 'Content-Type': 'application/json' };
    }
    // Always return success to Twilio to prevent retries
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeadersFallback, 'Content-Type': 'application/json' },
    });
  }
});
