import React from 'react';
import { Modal, ModalBody } from './Modal';

interface ShortcutItem {
  key: string;
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

const defaultShortcuts: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'Esc', description: 'Close modal / Go back' },
      { key: '⌘ K', description: 'Quick search (coming soon)' },
    ],
  },
  {
    title: 'Pipeline',
    shortcuts: [
      { key: 'N', description: 'New lead' },
      { key: 'J', description: 'Next lead' },
      { key: 'K', description: 'Previous lead' },
    ],
  },
  {
    title: 'Task Queue',
    shortcuts: [
      { key: '1-5', description: 'Quick outcome selection' },
      { key: 'Enter', description: 'Complete current task' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { key: '?', description: 'Show this help' },
    ],
  },
];

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts?: ShortcutGroup[];
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  shortcuts = defaultShortcuts,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="md">
      <ModalBody className="max-h-[70vh] overflow-y-auto">
        <div className="space-y-6">
          {shortcuts.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm text-slate-600">{shortcut.description}</span>
                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-600">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 text-center">
            Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">?</kbd> anytime to see this help
          </p>
        </div>
      </ModalBody>
    </Modal>
  );
};

KeyboardShortcutsHelp.displayName = 'KeyboardShortcutsHelp';
