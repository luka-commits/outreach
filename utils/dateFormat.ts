/**
 * Date formatting utilities for human-readable relative dates
 */

/**
 * Formats a date as a relative string ("Today", "Yesterday", "3 days ago", etc.)
 * @param date - Date string or Date object
 * @returns Relative date string
 */
export function formatRelativeDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();

    // Reset to start of day for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const diffTime = today.getTime() - targetDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays === -1) return 'Tomorrow';
    if (diffDays < -1 && diffDays >= -7) return `In ${Math.abs(diffDays)} days`;
    if (diffDays > 1 && diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays > 7 && diffDays <= 14) return 'Last week';
    if (diffDays < -7 && diffDays >= -14) return 'Next week';

    // For older/future dates, show the actual date
    return formatShortDate(d);
}

/**
 * Formats a date as a short date string (e.g., "Dec 28")
 */
export function formatShortDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Formats a date as a full date string (e.g., "December 28, 2025")
 */
export function formatFullDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Formats a timestamp as a relative time with time included
 * e.g., "Today at 3:45 PM", "Yesterday at 10:30 AM"
 */
export function formatRelativeDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const relativeDate = formatRelativeDate(d);
    const time = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    // For "Today" and "Yesterday", include time
    if (relativeDate === 'Today' || relativeDate === 'Yesterday') {
        return `${relativeDate} at ${time}`;
    }

    return relativeDate;
}

/**
 * Formats a timestamp as time ago (e.g., "2 hours ago", "just now")
 */
export function formatTimeAgo(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return formatShortDate(d);
}

/**
 * Returns ISO date string for a given date (YYYY-MM-DD)
 * Useful for grouping activities by date
 */
export function getDateKey(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const parts = d.toISOString().split('T');
    return parts[0] ?? d.toISOString().substring(0, 10);
}

/**
 * Groups an array of items by date
 * @param items - Array of items with a date field
 * @param getDate - Function to extract date from item
 * @returns Map of date keys to arrays of items
 */
export function groupByDate<T>(
    items: T[],
    getDate: (item: T) => string | Date
): Map<string, T[]> {
    const groups = new Map<string, T[]>();

    for (const item of items) {
        const dateKey = getDateKey(getDate(item));
        const existing = groups.get(dateKey) || [];
        existing.push(item);
        groups.set(dateKey, existing);
    }

    return groups;
}

/**
 * Formats a date key (YYYY-MM-DD) as a group header
 * Returns "Today", "Yesterday", or formatted date
 */
export function formatDateGroupHeader(dateKey: string): string {
    const date = new Date(dateKey + 'T00:00:00');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffTime = today.getTime() - targetDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';

    // Include year if not current year
    if (date.getFullYear() !== now.getFullYear()) {
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }

    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
}
