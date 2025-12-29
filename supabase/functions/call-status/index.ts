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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    const caller = formData.get('Caller')?.toString();
    const to = formData.get('To')?.toString();
    const accountSid = formData.get('AccountSid')?.toString();

    console.log('Call status callback:', {
      callSid,
      callStatus,
      callDuration,
      caller,
      to,
    });

    if (!callSid || !callStatus) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
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

    // Update call record by Twilio call SID
    const { data, error } = await supabaseAdmin
      .from('call_records')
      .update(updateData)
      .eq('twilio_call_sid', callSid)
      .select()
      .single();

    if (error) {
      console.error('Error updating call record:', error);
      // Don't return error to Twilio - just log it
    } else {
      console.log('Updated call record:', data?.id);
    }

    // Return success to Twilio
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error handling call status:', error);
    // Always return success to Twilio to prevent retries
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
