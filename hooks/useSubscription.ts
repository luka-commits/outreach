import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '../services/supabase';
import { queryKeys } from '../lib/queryClient';

export interface Subscription {
    status: 'free' | 'active' | 'past_due' | 'canceled';
    plan: 'basic' | 'pro_monthly' | 'pro_yearly';
    periodEnd: string | null;
    customerId: string | null;
    trialEndsAt: string | null;
}

// Feature limits for free tier
const LIMITS = {
    FREE: {
        leads: 50,
        strategies: 1,
        scrapesPerMonth: 100,
        urlScrapesPerMonth: 20,
    },
    PRO: {
        leads: Infinity,
        strategies: Infinity,
        scrapesPerMonth: Infinity,
        urlScrapesPerMonth: Infinity,
    },
} as const;

// Pro-only features
type ProFeature = 'reporting' | 'csvExport';

export function useSubscription() {
    const { user } = useAuth();
    const userId = user?.id;
    const queryClient = useQueryClient();

    // Subscribe to realtime profile updates to refresh subscription status
    // This ensures UI updates immediately after Stripe webhook processes payment
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`subscription-updates-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`,
                },
                () => {
                    // Invalidate subscription query to refetch latest status
                    queryClient.invalidateQueries({ queryKey: queryKeys.subscription(userId) });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, queryClient]);

    const { data: subscription, isLoading } = useQuery({
        queryKey: queryKeys.subscription(userId),
        queryFn: async (): Promise<Subscription> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('subscription_status, subscription_plan, current_period_end, stripe_customer_id, trial_ends_at')
                .eq('id', user!.id)
                .single();

            if (error) throw error;

            return {
                status: data.subscription_status || 'free',
                plan: data.subscription_plan || 'basic',
                periodEnd: data.current_period_end,
                customerId: data.stripe_customer_id,
                trialEndsAt: data.trial_ends_at,
            } as Subscription;
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // Cache for 5 mins
    });

    const isPro = subscription?.status === 'active';

    // Trial-specific computed values
    const trialEndsAt = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
    const isTrial = isPro && trialEndsAt !== null && trialEndsAt > new Date();
    const trialDaysLeft = trialEndsAt
        ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;
    const hasUsedTrial = subscription?.trialEndsAt !== null;

    /**
     * Check if user can add more of a limited resource.
     * For leads, checks against the 50 lead limit (free) or unlimited (pro).
     */
    const checkLimit = (currentCount: number, feature: 'leads') => {
        if (isPro) return true;
        if (feature === 'leads') return currentCount < LIMITS.FREE.leads;
        return false;
    };

    /**
     * Check if user can create more strategies.
     * Free users are limited to 1 strategy.
     */
    const checkStrategyLimit = (currentCount: number): boolean => {
        if (isPro) return true;
        return currentCount < LIMITS.FREE.strategies;
    };

    /**
     * Check if user can scrape more leads this month.
     * Free users are limited to 100 leads/month.
     * Returns whether allowed and remaining quota.
     */
    const checkScrapeLimit = (
        scrapedThisMonth: number,
        requestedCount: number = 0
    ): { allowed: boolean; remaining: number } => {
        if (isPro) {
            return { allowed: true, remaining: Infinity };
        }
        const remaining = Math.max(0, LIMITS.FREE.scrapesPerMonth - scrapedThisMonth);
        const allowed = scrapedThisMonth + requestedCount <= LIMITS.FREE.scrapesPerMonth;
        return { allowed, remaining };
    };

    /**
     * Check if user has access to a Pro-only feature.
     * These features are completely locked for free users.
     */
    const canAccessFeature = (_feature: ProFeature): boolean => {
        return isPro;
    };

    /**
     * Check if user can perform more URL scrapes this month.
     * Free users are limited to 20 URL scrapes/month.
     */
    const checkUrlScrapeLimit = (
        scrapedThisMonth: number
    ): { allowed: boolean; remaining: number } => {
        if (isPro) {
            return { allowed: true, remaining: Infinity };
        }
        const remaining = Math.max(0, LIMITS.FREE.urlScrapesPerMonth - scrapedThisMonth);
        const allowed = scrapedThisMonth < LIMITS.FREE.urlScrapesPerMonth;
        return { allowed, remaining };
    };

    return {
        subscription,
        isLoading,
        isPro,
        isTrial,
        trialEndsAt,
        trialDaysLeft,
        hasUsedTrial,
        checkLimit,
        checkStrategyLimit,
        checkScrapeLimit,
        checkUrlScrapeLimit,
        canAccessFeature,
        limits: {
            maxLeads: isPro ? LIMITS.PRO.leads : LIMITS.FREE.leads,
            maxStrategies: isPro ? LIMITS.PRO.strategies : LIMITS.FREE.strategies,
            maxScrapesPerMonth: isPro ? LIMITS.PRO.scrapesPerMonth : LIMITS.FREE.scrapesPerMonth,
            maxUrlScrapesPerMonth: isPro ? LIMITS.PRO.urlScrapesPerMonth : LIMITS.FREE.urlScrapesPerMonth,
        },
    };
}
