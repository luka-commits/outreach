import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { getCorsHeaders, handleCorsPreflightIfNeeded, createErrorResponse, createSuccessResponse } from "../_shared/cors.ts"

/**
 * Edge function to cancel a user's Stripe subscription at period end.
 *
 * Security:
 * - Requires valid JWT authentication
 * - Only cancels subscription for the authenticated user
 * - Uses cancel_at_period_end to preserve access until period ends
 */
serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  // Only allow POST
  if (req.method !== 'POST') {
    return createErrorResponse(req, 'Method not allowed', 405);
  }

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
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 2. Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

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

    // 4. Get user's Stripe customer ID from profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, subscription_status, cancel_at_period_end')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found for user:', user.id);
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (!profile.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No active subscription found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (profile.subscription_status !== 'active') {
      return new Response(JSON.stringify({ error: 'Subscription is not active' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (profile.cancel_at_period_end) {
      return new Response(JSON.stringify({ error: 'Subscription is already scheduled to cancel' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 5. List active subscriptions for this customer
    const listResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${profile.stripe_customer_id}&status=active&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
        },
      }
    );

    if (!listResponse.ok) {
      console.error('Failed to list Stripe subscriptions:', await listResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to retrieve subscription' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const subscriptions = await listResponse.json();

    // Also check trialing subscriptions if no active found
    if (!subscriptions.data || subscriptions.data.length === 0) {
      const trialResponse = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${profile.stripe_customer_id}&status=trialing&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
          },
        }
      );

      if (trialResponse.ok) {
        const trialSubs = await trialResponse.json();
        if (trialSubs.data && trialSubs.data.length > 0) {
          subscriptions.data = trialSubs.data;
        }
      }
    }

    if (!subscriptions.data || subscriptions.data.length === 0) {
      return new Response(JSON.stringify({ error: 'No active subscription found in Stripe' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const subscriptionId = subscriptions.data[0].id;

    // 6. Cancel subscription at period end
    const cancelResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'cancel_at_period_end=true',
      }
    );

    if (!cancelResponse.ok) {
      const errorText = await cancelResponse.text();
      console.error('Stripe cancellation error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to cancel subscription' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const cancelResult = await cancelResponse.json();

    // 7. Update local database immediately (webhook will also sync this)
    const periodEnd = new Date(cancelResult.current_period_end * 1000);
    await supabaseAdmin
      .from('profiles')
      .update({ cancel_at_period_end: true })
      .eq('id', user.id);

    // 8. Return success with period end date
    console.log(`Subscription ${subscriptionId} scheduled for cancellation at ${periodEnd.toISOString()} for user ${user.id}`);

    return createSuccessResponse(req, {
      success: true,
      message: 'Subscription will be cancelled at period end',
      cancelAt: periodEnd.toISOString(),
    });

  } catch (error) {
    console.error('Error in cancel-subscription:', error);
    let corsHeadersFallback: Record<string, string>;
    try {
      corsHeadersFallback = getCorsHeaders(req);
    } catch {
      corsHeadersFallback = { 'Content-Type': 'application/json' };
    }
    return new Response(JSON.stringify({
      error: 'Internal server error',
    }), {
      headers: { ...corsHeadersFallback, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
