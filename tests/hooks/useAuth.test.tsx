import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../../hooks/useAuth';

// Mock the supabase client
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockSelect = vi.fn();

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        mockOnAuthStateChange(callback);
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      },
      signInWithOAuth: (options: unknown) => mockSignInWithOAuth(options),
      signOut: () => mockSignOut(),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockSelect(),
        }),
      }),
    }),
  },
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should throw error when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');

    consoleSpy.mockRestore();
  });

  it('should initialize with loading state', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should set user when session exists', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };
    const mockSession = {
      user: mockUser,
      access_token: 'token-123',
    };

    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    mockSelect.mockResolvedValue({
      data: {
        id: 'user-123',
        email: 'test@example.com',
        subscription_status: 'free',
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session).toEqual(mockSession);
  });

  it('should have null user when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should call signInWithOAuth with Google provider', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.any(String),
      },
    });
  });

  it('should clear user state on signOut', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSession = { user: mockUser, access_token: 'token-123' };

    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    mockSelect.mockResolvedValue({
      data: { id: 'user-123', email: 'test@example.com', subscription_status: 'free' },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('should throw error if signOut fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignOut.mockResolvedValue({ error: new Error('Sign out failed') });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(result.current.signOut()).rejects.toThrow('Sign out failed');
  });

  it('should handle getSession errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSession.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should still work, just with null user
    expect(result.current.user).toBeNull();
    consoleSpy.mockRestore();
  });

  it('should subscribe to auth state changes', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });
  });
});
