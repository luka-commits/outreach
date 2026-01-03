import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should have working test environment', () => {
    expect(true).toBe(true);
  });

  it('should have environment variables set', () => {
    expect(import.meta.env.VITE_SUPABASE_URL).toBeDefined();
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toBeDefined();
  });
});
