/**
 * Shared validation utilities for edge functions.
 */

/**
 * RFC 5322 compliant email validation regex.
 * This is a simplified version that covers most valid email addresses.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validates an email address against RFC 5322 format.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmed = email.trim();

  // Check length constraints
  if (trimmed.length === 0 || trimmed.length > 254) {
    return false;
  }

  // Check local part length (before @)
  const atIndex = trimmed.indexOf('@');
  if (atIndex === -1 || atIndex > 64) {
    return false;
  }

  return EMAIL_REGEX.test(trimmed);
}

/**
 * Validates a phone number.
 * Must have at least 7 digits when non-digits are removed.
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Must have at least 7 digits (minimum for local numbers)
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Normalizes a phone number by removing non-digit characters.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Sanitizes a string for safe use in MIME headers.
 * Prevents header injection attacks.
 */
export function sanitizeMimeHeader(value: string): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  // Remove any control characters including CR, LF
  return value.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

/**
 * Validates a URL.
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
