import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

        // 4. Parse request
        const { job_id } = await req.json();

        if (!job_id) {
            return new Response(JSON.stringify({ error: 'job_id is required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        // 5. Verify ownership and Update status
        // Use Admin client to update, after verifying ownership logic with query
        const { data: job, error: jobError } = await supabaseAdmin
            .from('scrape_jobs')
            .select('id, user_id')
            .eq('id', job_id)
            .eq('user_id', user.id)
            .single();

        if (jobError || !job) {
            return new Response(JSON.stringify({ error: 'Job not found or permission denied' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            });
        }

        // 6. Perform the Update
        const { error: updateError } = await supabaseAdmin
            .from('scrape_jobs')
            .update({
                status: 'failed',
                error_message: 'Manually stopped by user'
            })
            .eq('id', job_id);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true, message: 'Job cancelled' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
