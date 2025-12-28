import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '../services/supabase';

export interface Subscription {
    status: 'free' | 'active' | 'past_due' | 'canceled';
    plan: 'basic' | 'pro_monthly' | 'pro_yearly';
    periodEnd: string | null;
    customerId: string | null;
}

export function useSubscription() {
    const { user } = useAuth();

    const { data: subscription, isLoading } = useQuery({
        queryKey: ['subscription', user?.id],
        queryFn: async (): Promise<Subscription> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('subscription_status, subscription_plan, current_period_end, stripe_customer_id')
                .eq('id', user!.id)
                .single();

            if (error) throw error;

            return {
                status: data.subscription_status || 'free',
                plan: data.subscription_plan || 'basic',
                periodEnd: data.current_period_end,
                customerId: data.stripe_customer_id,
            } as Subscription;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // Cache for 5 mins
    });

    const isPro = subscription?.status === 'active';

    // Feature Limits
    const LEAD_LIMIT_FREE = 1000;

    const checkLimit = (currentCount: number, feature: 'leads') => {
        if (isPro) return true; // Pro has no limits
        if (feature === 'leads') return currentCount < LEAD_LIMIT_FREE;
        return false;
    };

    return {
        subscription,
        isLoading,
        isPro,
        checkLimit,
        limits: {
            maxLeads: isPro ? Infinity : LEAD_LIMIT_FREE
        }
    };
}
