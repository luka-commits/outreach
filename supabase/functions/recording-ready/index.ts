import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts"
import { validateTwilioSignature } from "../_shared/twilioValidation.ts"
import { safeDecrypt, isEncryptionConfigured } from "../_shared/encryption.ts"

// Generate AI summary using Gemini (currently unused but kept for future use)
async function generateAISummary(transcription: string): Promise<string> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    return '';
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Summarize this sales call transcript in 2-3 sentences. Focus on the outcome, any objections raised, and next steps agreed upon. If no clear outcome, note that.

Transcript:
${transcription}

Summary:`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 150,
          }
        })
      }
    );

    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch {
    return '';
  }
}

// Suppress unused function warning
void generateAISummary;

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
    // This endpoint receives recording status callbacks from Twilio
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse form data from Twilio
    const formData = await req.formData();
    const callSid = formData.get('CallSid')?.toString();
    const recordingUrl = formData.get('RecordingUrl')?.toString();
    const recordingSid = formData.get('RecordingSid')?.toString();
    const recordingDuration = formData.get('RecordingDuration')?.toString();
    const recordingStatus = formData.get('RecordingStatus')?.toString();

    if (!callSid || !recordingUrl) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Only process completed recordings
    if (recordingStatus !== 'completed') {
      return new Response(JSON.stringify({ success: true, message: 'Recording not completed yet' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the call record
    const { data: callRecord, error: findError } = await supabaseAdmin
      .from('call_records')
      .select('id, user_id')
      .eq('twilio_call_sid', callSid)
      .single();

    if (findError || !callRecord) {
      // Call record not found - log minimally and return success to prevent retries
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's Twilio credentials for API access and webhook validation
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('twilio_account_sid, twilio_auth_token')
      .eq('id', callRecord.user_id)
      .single();

    if (!profile?.twilio_account_sid || !profile?.twilio_auth_token) {
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
    const webhookUrl = `${supabaseUrl}/functions/v1/recording-ready`;
    const isValidSignature = await validateTwilioSignature(
      req,
      authToken,
      webhookUrl,
      formData
    );

    if (!isValidSignature) {
      // Invalid signature - could be forged request
      // Return 403 but don't give details
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Update call record with recording URL
    const updateData: Record<string, unknown> = {
      recording_url: `${recordingUrl}.mp3`,
    };

    // Get transcription from Twilio if duration is <= 120 seconds
    // Twilio's built-in transcription only works for recordings up to 2 minutes
    const durationSeconds = recordingDuration ? parseInt(recordingDuration, 10) : 0;

    if (durationSeconds > 0 && durationSeconds <= 120) {
      // Request transcription from Twilio (using decrypted authToken)
      const authString = btoa(`${profile.twilio_account_sid}:${authToken}`);

      try {
        // Start transcription request
        const transcriptionResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${profile.twilio_account_sid}/Recordings/${recordingSid}/Transcriptions.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        // Transcription request initiated - Twilio will send via webhook
        // For now, we'll handle it async - the user can refresh to see it
        void transcriptionResponse; // Acknowledge response
      } catch {
        // Transcription request failed - not critical, continue
      }
    }
    // For recordings > 120 seconds, transcription is not available via Twilio

    // Update the call record
    const { error: updateError } = await supabaseAdmin
      .from('call_records')
      .update(updateData)
      .eq('id', callRecord.id);

    // Log update errors but don't expose details
    void updateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error handling recording callback');
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
