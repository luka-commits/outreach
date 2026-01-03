import { useEffect, useCallback, useRef } from 'react';

type ShortcutHandler = () => void;

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  /** Description for help display */
  description?: string;
  /** Only active when this condition is true */
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  /** Disable all shortcuts when an input/textarea is focused */
  ignoreWhenInputFocused?: boolean;
  /** Global enable/disable */
  enabled?: boolean;
}

/**
 * Hook to register and manage keyboard shortcuts
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: 'n', handler: () => openNewLead(), description: 'New lead' },
 *   { key: 'Escape', handler: () => closeModal() },
 *   { key: 'k', meta: true, handler: () => openSearch(), description: 'Search' },
 * ]);
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { ignoreWhenInputFocused = true, enabled = true } = options;
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if focus is in an input element
      if (ignoreWhenInputFocused) {
        const target = event.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        const isEditable = target.isContentEditable;

        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || isEditable) {
          // Only allow Escape in input fields
          if (event.key !== 'Escape') {
            return;
          }
        }
      }

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;

        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const metaMatches = !!shortcut.meta === (event.metaKey || event.ctrlKey);
        const shiftMatches = !!shortcut.shift === event.shiftKey;
        const altMatches = !!shortcut.alt === event.altKey;

        // For shortcuts without modifiers, make sure no modifiers are pressed
        const noModifiersRequired = !shortcut.ctrl && !shortcut.meta && !shortcut.shift && !shortcut.alt;
        const noModifiersPressed = !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;

        const modifiersMatch = noModifiersRequired
          ? noModifiersPressed
          : ctrlMatches && metaMatches && shiftMatches && altMatches;

        if (keyMatches && modifiersMatch) {
          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [enabled, ignoreWhenInputFocused]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Common shortcuts that can be reused across components
 */
export const commonShortcuts = {
  escape: (handler: ShortcutHandler): ShortcutConfig => ({
    key: 'Escape',
    handler,
    description: 'Close / Go back',
  }),
  search: (handler: ShortcutHandler): ShortcutConfig => ({
    key: 'k',
    meta: true,
    handler,
    description: 'Search',
  }),
  newItem: (handler: ShortcutHandler): ShortcutConfig => ({
    key: 'n',
    handler,
    description: 'New item',
  }),
  save: (handler: ShortcutHandler): ShortcutConfig => ({
    key: 's',
    meta: true,
    handler,
    description: 'Save',
  }),
  nextItem: (handler: ShortcutHandler): ShortcutConfig => ({
    key: 'j',
    handler,
    description: 'Next item',
  }),
  prevItem: (handler: ShortcutHandler): ShortcutConfig => ({
    key: 'k',
    handler,
    description: 'Previous item',
  }),
  help: (handler: ShortcutHandler): ShortcutConfig => ({
    key: '?',
    shift: true,
    handler,
    description: 'Show shortcuts',
  }),
};

/**
 * Get formatted shortcut key for display
 */
export function formatShortcutKey(shortcut: ShortcutConfig): string {
  const parts: string[] = [];

  if (shortcut.meta || shortcut.ctrl) {
    // Use ⌘ for Mac, Ctrl for others
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) parts.push('⇧');
  if (shortcut.alt) parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');

  // Format the key nicely
  let key = shortcut.key;
  if (key === 'Escape') key = 'Esc';
  if (key === 'ArrowUp') key = '↑';
  if (key === 'ArrowDown') key = '↓';
  if (key === 'ArrowLeft') key = '←';
  if (key === 'ArrowRight') key = '→';
  if (key === 'Enter') key = '↵';
  if (key === ' ') key = 'Space';

  parts.push(key.toUpperCase());

  return parts.join(' + ');
}
