import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

/**
 * Stripe Webhook Handler
 *
 * Handles subscription lifecycle events from Stripe:
 * - checkout.session.completed: New subscription activated
 * - customer.subscription.updated: Plan changes, renewals
 * - customer.subscription.deleted: Cancellation
 * - invoice.payment_failed: Payment issues
 *
 * Security:
 * - Validates webhook signature using Stripe signing secret
 * - Uses service role key for database updates (bypasses RLS)
 * - Always returns 200 to prevent Stripe retry floods
 */

// Stripe signature validation using Web Crypto API (Deno compatible)
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      return false;
    }

    const timestamp = timestampPart.split('=')[1];
    const expectedSignature = signaturePart.split('=')[1];

    // Check timestamp is within 5 minutes (300 seconds)
    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp, 10);
    if (Math.abs(currentTime - webhookTime) > 300) {
      console.error('Webhook timestamp too old');
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );

    // Convert to hex
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Timing-safe comparison
    if (computedSignature.length !== expectedSignature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < computedSignature.length; i++) {
      result |= computedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }

    return result === 0;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  // Stripe webhooks are POST only
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

    if (!stripeWebhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      // Return 200 to prevent retries, but log the error
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body for signature verification
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    // Verify webhook signature
    const isValid = await verifyStripeSignature(payload, signature, stripeWebhookSecret);
    if (!isValid) {
      console.error('Invalid Stripe webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse the event
    const event = JSON.parse(payload);
    const eventType = event.type;

    console.log(`Processing Stripe event: ${eventType}`);

    switch (eventType) {
      case 'checkout.session.completed': {
        // New subscription - user just paid or started trial
        const session = event.data.object;
        const userId = session.client_reference_id; // We pass this in the payment link
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (!userId) {
          console.error('No client_reference_id in checkout session');
          break;
        }

        // Prepare update data
        let plan = 'pro_monthly';
        let periodEnd: string | null = null;
        let trialEndsAt: string | null = null;

        // Fetch subscription details from Stripe to get trial info
        if (subscriptionId) {
          const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
          if (stripeSecretKey) {
            try {
              const subResponse = await fetch(
                `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${stripeSecretKey}`,
                  },
                }
              );
              const subscription = await subResponse.json();

              // Set trial end if subscription is in trial
              if (subscription.status === 'trialing' && subscription.trial_end) {
                trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
                console.log(`Trial subscription detected, ends at ${trialEndsAt}`);
              }

              // Get period end
              if (subscription.current_period_end) {
                periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
              }

              // Detect plan from price interval
              if (subscription.items?.data?.[0]?.price?.recurring?.interval === 'year') {
                plan = 'pro_yearly';
              }
            } catch (err) {
              console.error('Failed to fetch subscription details from Stripe:', err);
            }
          }
        }

        // Build update object
        const updateData: Record<string, unknown> = {
          subscription_status: 'active',
          subscription_plan: plan,
          stripe_customer_id: customerId,
          current_period_end: periodEnd,
        };

        // Only set trial_ends_at if this is a trial subscription
        if (trialEndsAt) {
          updateData.trial_ends_at = trialEndsAt;
        }

        // Update user's subscription status
        const { error } = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('id', userId);

        if (error) {
          console.error('Failed to update subscription:', error);
        } else {
          console.log(`Activated ${trialEndsAt ? 'trial' : 'subscription'} for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        // Subscription changed (renewal, plan change, trial conversion, etc.)
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status; // active, past_due, canceled, trialing, etc.
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        // Map Stripe status to our status
        let subscriptionStatus = 'free';
        if (status === 'active' || status === 'trialing') {
          subscriptionStatus = 'active';
        } else if (status === 'past_due') {
          subscriptionStatus = 'past_due';
        } else if (status === 'canceled' || status === 'unpaid') {
          subscriptionStatus = 'canceled';
        }

        // Find user by Stripe customer ID
        const { data: profile, error: findError } = await supabaseAdmin
          .from('profiles')
          .select('id, trial_ends_at')
          .eq('stripe_customer_id', customerId)
          .single();

        if (findError || !profile) {
          console.error('User not found for customer:', customerId);
          break;
        }

        // Build update data
        const updateData: Record<string, unknown> = {
          subscription_status: subscriptionStatus,
          current_period_end: periodEnd,
        };

        // If transitioning to trial and we don't have trial_ends_at set, capture it
        if (status === 'trialing' && subscription.trial_end && !profile.trial_ends_at) {
          updateData.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString();
        }

        // Update subscription
        const { error } = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id);

        if (error) {
          console.error('Failed to update subscription:', error);
        } else {
          console.log(`Updated subscription for user ${profile.id} to ${subscriptionStatus}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Subscription canceled
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by Stripe customer ID
        const { data: profile, error: findError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (findError || !profile) {
          console.error('User not found for customer:', customerId);
          break;
        }

        // Set to canceled (or free if you want immediate downgrade)
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            subscription_plan: 'basic',
          })
          .eq('id', profile.id);

        if (error) {
          console.error('Failed to cancel subscription:', error);
        } else {
          console.log(`Canceled subscription for user ${profile.id}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Payment failed - mark as past_due
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Find user by Stripe customer ID
        const { data: profile, error: findError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (findError || !profile) {
          console.error('User not found for customer:', customerId);
          break;
        }

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: 'past_due',
          })
          .eq('id', profile.id);

        if (error) {
          console.error('Failed to update payment status:', error);
        } else {
          console.log(`Marked subscription as past_due for user ${profile.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    // Always return 200 to acknowledge receipt
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent Stripe from retrying
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
