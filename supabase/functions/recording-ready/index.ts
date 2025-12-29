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

// Generate AI summary using Gemini
async function generateAISummary(transcription: string): Promise<string> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    console.log('No Gemini API key configured');
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
      console.error('Gemini API error:', response.status);
      return '';
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch (error) {
    console.error('Error generating AI summary:', error);
    return '';
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    const accountSid = formData.get('AccountSid')?.toString();

    console.log('Recording callback:', {
      callSid,
      recordingUrl,
      recordingSid,
      recordingDuration,
      recordingStatus,
    });

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
      console.error('Call record not found:', findError);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's Twilio credentials for API access
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('twilio_account_sid, twilio_auth_token')
      .eq('id', callRecord.user_id)
      .single();

    if (!profile?.twilio_account_sid || !profile?.twilio_auth_token) {
      console.error('Twilio credentials not found for user');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      // Request transcription from Twilio
      const authString = btoa(`${profile.twilio_account_sid}:${profile.twilio_auth_token}`);

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

        if (transcriptionResponse.ok) {
          console.log('Transcription request initiated');
          // Twilio will send transcription via webhook, or we can poll for it
          // For now, we'll handle it async - the user can refresh to see it
        }
      } catch (error) {
        console.error('Error requesting transcription:', error);
      }
    } else if (durationSeconds > 120) {
      // For longer recordings, we could use Gemini for transcription
      // But this would require downloading the audio and sending to Gemini
      // For now, we'll just note that transcription is not available
      console.log('Recording too long for Twilio transcription:', durationSeconds);
    }

    // Update the call record
    const { error: updateError } = await supabaseAdmin
      .from('call_records')
      .update(updateData)
      .eq('id', callRecord.id);

    if (updateError) {
      console.error('Error updating call record:', updateError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error handling recording callback:', error);
    // Always return success to Twilio to prevent retries
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
