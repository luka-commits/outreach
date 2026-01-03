import React from 'react';
import { User, Phone, Mail, Search, CheckCircle2, Sliders } from 'lucide-react';
import { radius, transitions } from '../../lib/designTokens';

export type SettingsTab = 'account' | 'calling' | 'email' | 'lead-finder' | 'custom-fields';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  { id: 'account', label: 'Account', icon: <User size={18} /> },
  { id: 'calling', label: 'Calling', icon: <Phone size={18} /> },
  { id: 'email', label: 'Email', icon: <Mail size={18} /> },
  { id: 'lead-finder', label: 'Lead Finder', icon: <Search size={18} /> },
  { id: 'custom-fields', label: 'Custom Fields', icon: <Sliders size={18} /> },
];

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  connectedTabs?: SettingsTab[];
}

const SettingsTabs: React.FC<SettingsTabsProps> = ({
  activeTab,
  onTabChange,
  connectedTabs = [],
}) => {
  return (
    <div className="border-b border-slate-200 overflow-x-auto">
      <nav className="flex gap-1 px-2" aria-label="Settings tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isConnected = connectedTabs.includes(tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                ${transitions.fast} ${radius.sm}
                ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }
              `}
              aria-selected={isActive}
              role="tab"
            >
              {tab.icon}
              <span>{tab.label}</span>
              {isConnected && (
                <CheckCircle2
                  size={14}
                  className="text-emerald-500"
                  aria-label="Connected"
                />
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default SettingsTabs;
