import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import type { Lead, Strategy, Activity } from '../types';

// Simple User type for tests (Supabase Auth User)
interface User {
  id: string;
  email: string;
}

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Mock Auth Context
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
};

const mockAuthContext = {
  user: mockUser,
  loading: false,
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
};

// All providers wrapper
interface AllProvidersProps {
  children: React.ReactNode;
}

function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Custom render with all providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Factory functions for test data
export function createMockLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: `lead-${Math.random().toString(36).substr(2, 9)}`,
    companyName: 'Test Company',
    contactName: 'John Doe',
    email: 'john@testcompany.com',
    phone: '+1234567890',
    websiteUrl: 'https://testcompany.com',
    instagramUrl: undefined,
    facebookUrl: undefined,
    linkedinUrl: undefined,
    address: '123 Test St',
    location: 'New York, NY',
    niche: 'Technology',
    googleRating: 4.5,
    googleReviewCount: 100,
    strategyId: undefined,
    currentStepIndex: 0,
    nextTaskDate: undefined,
    status: 'not_contacted',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockStrategy(overrides: Partial<Strategy> = {}): Strategy {
  return {
    id: `strategy-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Strategy',
    description: 'A test outreach strategy',
    steps: [
      { dayOffset: 0, action: 'send_dm', template: 'Hello {{name}}!' },
      { dayOffset: 3, action: 'send_email', template: 'Following up...' },
      { dayOffset: 7, action: 'call', template: 'Call script...' },
    ],
    color: 'indigo',
    ...overrides,
  };
}

export function createMockActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: `activity-${Math.random().toString(36).substr(2, 9)}`,
    leadId: 'test-lead-id',
    action: 'Sent initial DM',
    platform: 'instagram',
    note: 'Test note',
    isFirstOutreach: true,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// Mock Supabase client
export function createMockSupabaseClient() {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
  });

  return {
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: mockUser } }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  };
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { customRender as render };
export { mockUser, mockAuthContext };
