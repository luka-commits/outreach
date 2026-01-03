import React, { useState } from 'react';
import { Keyboard, HelpCircle, MessageCircle } from 'lucide-react';
import { KeyboardShortcutsHelp } from '../ui/KeyboardShortcutsHelp';

const HelpResources: React.FC = () => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200/60 p-6">
        <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-4">
          Need Help?
        </h2>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors duration-150"
          >
            <Keyboard size={16} className="text-gray-500" />
            Keyboard Shortcuts
          </button>

          <a
            href="mailto:support@outboundpilot.com"
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors duration-150"
          >
            <MessageCircle size={16} className="text-gray-500" />
            Contact Support
          </a>

          <a
            href="https://outboundpilot.com/help"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors duration-150"
          >
            <HelpCircle size={16} className="text-gray-500" />
            Help Center
          </a>
        </div>
      </div>

      {showShortcuts && (
        <KeyboardShortcutsHelp
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
      )}
    </>
  );
};

export default HelpResources;
