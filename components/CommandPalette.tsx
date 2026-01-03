import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  Users,
  Plus,
  Upload,
  Settings,
  BarChart3,
  Calendar,
  Sparkles,
  Compass,
  CreditCard,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { zIndex } from '../lib/designTokens';

export type CommandAction =
  | 'go-dashboard'
  | 'go-pipeline'
  | 'go-queue'
  | 'go-sequences'
  | 'go-analytics'
  | 'go-settings'
  | 'go-finder'
  | 'go-pricing'
  | 'new-lead'
  | 'import-csv'
  | 'sign-out';

interface Command {
  id: CommandAction;
  label: string;
  description?: string;
  icon: React.ReactNode;
  keywords?: string[];
  category: 'navigation' | 'actions';
}

const commands: Command[] = [
  // Navigation
  {
    id: 'go-dashboard',
    label: 'Go to Dashboard',
    description: 'View your daily overview',
    icon: <BarChart3 size={18} />,
    keywords: ['home', 'overview', 'stats'],
    category: 'navigation',
  },
  {
    id: 'go-pipeline',
    label: 'Go to Pipeline',
    description: 'View all leads',
    icon: <Users size={18} />,
    keywords: ['leads', 'list', 'prospects'],
    category: 'navigation',
  },
  {
    id: 'go-queue',
    label: 'Go to Daily Tasks',
    description: 'View today\'s outreach tasks',
    icon: <Calendar size={18} />,
    keywords: ['tasks', 'today', 'queue', 'outreach'],
    category: 'navigation',
  },
  {
    id: 'go-sequences',
    label: 'Go to Sequences',
    description: 'Manage outreach strategies',
    icon: <Sparkles size={18} />,
    keywords: ['strategies', 'automation', 'flows'],
    category: 'navigation',
  },
  {
    id: 'go-analytics',
    label: 'Go to Analytics',
    description: 'View reports and insights',
    icon: <BarChart3 size={18} />,
    keywords: ['reports', 'metrics', 'data'],
    category: 'navigation',
  },
  {
    id: 'go-finder',
    label: 'Go to Lead Finder',
    description: 'Discover new prospects',
    icon: <Compass size={18} />,
    keywords: ['search', 'discover', 'scrape'],
    category: 'navigation',
  },
  {
    id: 'go-settings',
    label: 'Go to Settings',
    description: 'Configure your account',
    icon: <Settings size={18} />,
    keywords: ['config', 'account', 'profile'],
    category: 'navigation',
  },
  {
    id: 'go-pricing',
    label: 'Go to Pricing',
    description: 'View subscription plans',
    icon: <CreditCard size={18} />,
    keywords: ['plans', 'upgrade', 'billing'],
    category: 'navigation',
  },
  // Actions
  {
    id: 'new-lead',
    label: 'New Lead',
    description: 'Add a lead manually',
    icon: <Plus size={18} />,
    keywords: ['add', 'create', 'prospect'],
    category: 'actions',
  },
  {
    id: 'import-csv',
    label: 'Import CSV',
    description: 'Bulk import leads from file',
    icon: <Upload size={18} />,
    keywords: ['upload', 'bulk', 'file'],
    category: 'actions',
  },
  {
    id: 'sign-out',
    label: 'Sign Out',
    description: 'Log out of your account',
    icon: <LogOut size={18} />,
    keywords: ['logout', 'exit'],
    category: 'actions',
  },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: CommandAction) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onAction,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;

    const searchLower = search.toLowerCase();
    return commands.filter((cmd) => {
      const labelMatch = cmd.label.toLowerCase().includes(searchLower);
      const descMatch = cmd.description?.toLowerCase().includes(searchLower);
      const keywordMatch = cmd.keywords?.some((k) => k.includes(searchLower));
      return labelMatch || descMatch || keywordMatch;
    });
  }, [search]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const navigation = filteredCommands.filter((c) => c.category === 'navigation');
    const actions = filteredCommands.filter((c) => c.category === 'actions');
    return { navigation, actions };
  }, [filteredCommands]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onAction(filteredCommands[selectedIndex].id);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onAction, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const selectedEl = list.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const renderCommand = (cmd: Command, index: number) => {
    const isSelected = selectedIndex === index;
    return (
      <button
        key={cmd.id}
        data-index={index}
        onClick={() => {
          onAction(cmd.id);
          onClose();
        }}
        onMouseEnter={() => setSelectedIndex(index)}
        className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
          isSelected
            ? 'bg-blue-50 text-blue-700'
            : 'text-slate-700 hover:bg-slate-50'
        }`}
      >
        <div
          className={`flex-shrink-0 ${
            isSelected ? 'text-blue-500' : 'text-slate-400'
          }`}
        >
          {cmd.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{cmd.label}</p>
          {cmd.description && (
            <p className="text-xs text-slate-400 truncate">{cmd.description}</p>
          )}
        </div>
        {isSelected && (
          <ArrowRight size={16} className="text-blue-400 flex-shrink-0" />
        )}
      </button>
    );
  };

  let commandIndex = 0;

  return (
    <div
      className={`fixed inset-0 bg-black/40 backdrop-blur-sm ${zIndex.modal} flex items-start justify-center pt-[15vh]`}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-lg shadow-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
          <Search size={20} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands..."
            className="flex-1 text-base font-medium text-slate-900 placeholder-slate-400 outline-none"
          />
          <kbd className="px-2 py-1 text-xs font-mono text-slate-400 bg-slate-100 rounded">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="font-medium">No commands found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <>
              {groupedCommands.navigation.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                    Navigation
                  </div>
                  {groupedCommands.navigation.map((cmd) =>
                    renderCommand(cmd, commandIndex++)
                  )}
                </div>
              )}
              {groupedCommands.actions.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                    Actions
                  </div>
                  {groupedCommands.actions.map((cmd) =>
                    renderCommand(cmd, commandIndex++)
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↵</kbd>
              to select
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to manage command palette state
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // Register Cmd+K shortcut
  useKeyboardShortcuts([
    {
      key: 'k',
      meta: true,
      handler: toggle,
      description: 'Open command palette',
    },
  ]);

  return { isOpen, open, close, toggle };
}

export default CommandPalette;
