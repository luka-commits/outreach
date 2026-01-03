/**
 * User-friendly error message mapping for Supabase/API errors
 */

interface ErrorInfo {
    message: string;
    code?: string;
    details?: string;
}

/**
 * Shape of error objects that may have additional properties
 */
interface ErrorLike {
    code?: string;
    status?: number;
    message?: string;
    error?: string;
    error_description?: string;
    details?: string;
    hint?: string;
}

/**
 * Type guard to check if an object has ErrorLike properties
 */
function isErrorLike(obj: unknown): obj is ErrorLike {
    return typeof obj === 'object' && obj !== null;
}

/**
 * Maps Supabase/Postgres error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
    // Authentication errors
    'PGRST301': 'Your session has expired. Please sign in again.',
    'invalid_grant': 'Invalid login credentials. Please check your email and password.',
    'user_not_found': 'No account found with this email.',
    'invalid_credentials': 'Invalid email or password.',
    'email_not_confirmed': 'Please verify your email before signing in.',

    // RLS / Authorization errors
    'PGRST204': 'You don\'t have permission to perform this action.',
    '42501': 'You don\'t have permission to access this data.',

    // Constraint violations
    '23505': 'This record already exists. Duplicate entry detected.',
    '23503': 'Cannot complete this action because related data exists.',
    '23502': 'Required information is missing.',
    '23514': 'The data doesn\'t meet the required format.',

    // Network / Connection errors
    'FetchError': 'Unable to connect to the server. Check your internet connection.',
    'ECONNREFUSED': 'Server is unavailable. Please try again later.',
    'ETIMEDOUT': 'Request timed out. Please try again.',

    // Rate limiting
    '429': 'Too many requests. Please wait a moment and try again.',
    'rate_limit_exceeded': 'Too many requests. Please wait a moment and try again.',

    // Storage errors
    'storage/object-not-found': 'The requested file could not be found.',
    'storage/unauthorized': 'You don\'t have permission to access this file.',
    'storage/quota-exceeded': 'Storage limit reached.',

    // Generic database errors
    '42P01': 'System error: Database table not found.',
    '42703': 'System error: Invalid data field.',
    '22P02': 'Invalid data format provided.',
};

/**
 * Extracts a user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
    // Handle null/undefined
    if (!error) {
        return 'An unknown error occurred.';
    }

    // Handle string errors
    if (typeof error === 'string') {
        return error;
    }

    // Handle Error objects and objects with error-like properties
    if (isErrorLike(error)) {
        // Check for code-based errors
        if (error.code) {
            const codeMessage = ERROR_MESSAGES[error.code];
            if (codeMessage) return codeMessage;
        }

        // Check for status code
        if (error.status) {
            const statusMessage = ERROR_MESSAGES[String(error.status)];
            if (statusMessage) return statusMessage;
        }

        // Check for specific error messages
        const message = error.message || error.error_description;
        if (message) {
            // Check if message contains a known pattern
            if (message.includes('JWT expired')) {
                return 'Your session has expired. Please sign in again.';
            }
            if (message.includes('duplicate key')) {
                return 'This record already exists.';
            }
            if (message.includes('violates foreign key')) {
                return 'Cannot complete this action because related data exists.';
            }
            if (message.includes('not found')) {
                return 'The requested item could not be found.';
            }
            if (message.includes('network') || message.includes('fetch')) {
                return 'Network error. Please check your connection.';
            }

            // Return the message if it's user-friendly (not too technical)
            if (!message.includes('PGRST') && !message.includes('SELECT') && !message.includes('FROM')) {
                return message;
            }
        }

        // Check for nested error property
        if (error.error) {
            return getErrorMessage(error.error);
        }

        return 'Something went wrong. Please try again.';
    }

    return 'An unexpected error occurred.';
}

/**
 * Parses an error and returns structured info
 */
export function parseError(error: unknown): ErrorInfo {
    const message = getErrorMessage(error);

    let code: string | undefined;
    let details: string | undefined;

    if (isErrorLike(error)) {
        code = error.code || error.status?.toString();
        details = error.details || error.hint || error.error_description;
    }

    return { message, code, details };
}

/**
 * Checks if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
    if (!error) return false;

    const errorString = String(error).toLowerCase();
    return (
        errorString.includes('network') ||
        errorString.includes('fetch') ||
        errorString.includes('connection') ||
        errorString.includes('offline') ||
        errorString.includes('timeout')
    );
}

/**
 * Checks if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
    if (!isErrorLike(error)) return false;

    const code = error.code || '';
    const status = error.status || 0;

    return (
        status === 401 ||
        status === 403 ||
        code === 'PGRST301' ||
        code.includes('invalid_grant') ||
        String(error).toLowerCase().includes('jwt')
    );
}
