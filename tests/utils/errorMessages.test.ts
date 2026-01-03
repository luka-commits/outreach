import { describe, it, expect } from 'vitest';
import { getErrorMessage, parseError, isNetworkError, isAuthError } from '../../utils/errorMessages';

describe('getErrorMessage', () => {
  it('should return user-friendly message for duplicate key error', () => {
    const error = { code: '23505', message: 'duplicate key value violates unique constraint' };
    const result = getErrorMessage(error);
    expect(result).toContain('already exists');
  });

  it('should return user-friendly message for foreign key error', () => {
    const error = { code: '23503', message: 'violates foreign key constraint' };
    const result = getErrorMessage(error);
    expect(result.toLowerCase()).toMatch(/related|exists/);
  });

  it('should return user-friendly message for not null violation', () => {
    const error = { code: '23502', message: 'null value in column' };
    const result = getErrorMessage(error);
    expect(result.toLowerCase()).toMatch(/required|missing/);
  });

  it('should return user-friendly message for check constraint violation', () => {
    const error = { code: '23514', message: 'new row violates check constraint' };
    const result = getErrorMessage(error);
    expect(result.toLowerCase()).toMatch(/format|required|meet/);
  });

  it('should return user-friendly message for RLS policy error', () => {
    const error = { code: '42501', message: 'new row violates row-level security policy' };
    const result = getErrorMessage(error);
    expect(result.toLowerCase()).toContain('permission');
  });

  it('should return user-friendly message for network errors', () => {
    const error = { message: 'Failed to fetch' };
    const result = getErrorMessage(error);
    expect(result.toLowerCase()).toMatch(/network|connection/);
  });

  it('should return generic message for unknown errors', () => {
    const error = { message: 'Some unknown error XYZ123' };
    const result = getErrorMessage(error);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should handle null/undefined errors gracefully', () => {
    const result = getErrorMessage(null);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result.toLowerCase()).toContain('error');
  });

  it('should handle string errors', () => {
    const result = getErrorMessage('Something went wrong');
    expect(result).toBe('Something went wrong');
  });

  it('should handle JWT expired errors', () => {
    const error = { message: 'JWT expired at 2024-01-01' };
    const result = getErrorMessage(error);
    expect(result.toLowerCase()).toContain('session');
  });

  it('should handle rate limit errors', () => {
    const error = { code: '429' };
    const result = getErrorMessage(error);
    expect(result.toLowerCase()).toContain('too many');
  });
});

describe('parseError', () => {
  it('should return structured error info', () => {
    const error = { code: '23505', message: 'Duplicate', details: 'Key (id) already exists' };
    const result = parseError(error);

    expect(result.message).toBeTruthy();
    expect(result.code).toBe('23505');
    expect(result.details).toBe('Key (id) already exists');
  });

  it('should handle errors without code', () => {
    const error = { message: 'Something went wrong' };
    const result = parseError(error);

    expect(result.message).toBeTruthy();
    expect(result.code).toBeUndefined();
  });
});

describe('isNetworkError', () => {
  it('should return true for network errors', () => {
    // The function checks if the stringified error contains network keywords
    expect(isNetworkError('Network error')).toBe(true);
    expect(isNetworkError('Failed to fetch data')).toBe(true);
    expect(isNetworkError('Connection refused')).toBe(true);
    expect(isNetworkError('Request timeout')).toBe(true);
  });

  it('should return false for non-network errors', () => {
    expect(isNetworkError('Validation error')).toBe(false);
    expect(isNetworkError({ code: '23505' })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});

describe('isAuthError', () => {
  it('should return true for auth errors', () => {
    expect(isAuthError({ status: 401 })).toBe(true);
    expect(isAuthError({ status: 403 })).toBe(true);
    expect(isAuthError({ code: 'PGRST301' })).toBe(true);
  });

  it('should return false for non-auth errors', () => {
    expect(isAuthError({ status: 500 })).toBe(false);
    expect(isAuthError({ code: '23505' })).toBe(false);
    expect(isAuthError({ message: 'Validation error' })).toBe(false);
  });
});
