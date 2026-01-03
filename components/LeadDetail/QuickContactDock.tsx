import React, { memo, useState } from 'react';
import {
  Phone,
  Mail,
  Instagram,
  Facebook,
  Linkedin,
  Globe,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Lead } from '../../types';

interface QuickContactDockProps {
  lead: Lead;
  onInitiateCall: () => void;
  onOpenEmailComposer: () => void;
}

const QuickContactDock: React.FC<QuickContactDockProps> = memo(({
  lead,
  onInitiateCall,
  onOpenEmailComposer,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const contactMethods = [
    {
      id: 'call',
      icon: Phone,
      label: 'Call',
      available: !!lead.phone,
      color: 'emerald',
      onClick: onInitiateCall,
    },
    {
      id: 'email',
      icon: Mail,
      label: 'Email',
      available: !!lead.email,
      color: 'rose',
      onClick: onOpenEmailComposer,
    },
    {
      id: 'instagram',
      icon: Instagram,
      label: 'IG',
      available: !!lead.instagramUrl,
      color: 'pink',
      href: lead.instagramUrl,
    },
    {
      id: 'facebook',
      icon: Facebook,
      label: 'FB',
      available: !!lead.facebookUrl,
      color: 'blue',
      href: lead.facebookUrl,
    },
    {
      id: 'linkedin',
      icon: Linkedin,
      label: 'LI',
      available: !!lead.linkedinUrl,
      color: 'sky',
      href: lead.linkedinUrl,
    },
    {
      id: 'website',
      icon: Globe,
      label: 'Web',
      available: !!lead.websiteUrl,
      color: 'slate',
      href: lead.websiteUrl,
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
        Contact
      </h4>

      {/* Icon Row */}
      <div className="flex items-center justify-between mb-4">
        {contactMethods.map((method) => {
          const Icon = method.icon;
          const colorClasses = getColorClasses(method.color, method.available);

          if (method.href) {
            return (
              <a
                key={method.id}
                href={method.available ? method.href : undefined}
                target="_blank"
                rel="noreferrer"
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                  method.available
                    ? `${colorClasses.bg} ${colorClasses.text} hover:scale-105 cursor-pointer`
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
                onClick={(e) => !method.available && e.preventDefault()}
                title={method.available ? `Open ${method.label}` : `No ${method.label} available`}
              >
                <Icon size={18} />
                <span className="text-[9px] font-medium">{method.label}</span>
              </a>
            );
          }

          return (
            <button
              key={method.id}
              onClick={method.available ? method.onClick : undefined}
              disabled={!method.available}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                method.available
                  ? `${colorClasses.bg} ${colorClasses.text} hover:scale-105`
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
              title={method.available ? method.label : `No ${method.label.toLowerCase()} available`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-medium">{method.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contact Details */}
      <div className="space-y-2">
        {lead.phone && (
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group">
            <div className="flex items-center gap-2 min-w-0">
              <Phone size={14} className="text-emerald-500 flex-shrink-0" />
              <a
                href={`tel:${lead.phone}`}
                className="text-sm font-medium text-slate-700 truncate hover:text-emerald-600"
              >
                {lead.phone}
              </a>
            </div>
            <button
              onClick={() => handleCopy(lead.phone!, 'phone')}
              className={`p-1.5 rounded-md transition-all ${
                copiedField === 'phone'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
              }`}
              title="Copy"
            >
              {copiedField === 'phone' ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        )}

        {lead.email && (
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group">
            <div className="flex items-center gap-2 min-w-0">
              <Mail size={14} className="text-rose-500 flex-shrink-0" />
              <a
                href={`mailto:${lead.email}`}
                className="text-sm font-medium text-slate-700 truncate hover:text-rose-600"
              >
                {lead.email}
              </a>
            </div>
            <button
              onClick={() => handleCopy(lead.email!, 'email')}
              className={`p-1.5 rounded-md transition-all ${
                copiedField === 'email'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
              }`}
              title="Copy"
            >
              {copiedField === 'email' ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        )}

        {lead.websiteUrl && (
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group">
            <div className="flex items-center gap-2 min-w-0">
              <Globe size={14} className="text-slate-500 flex-shrink-0" />
              <a
                href={lead.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-slate-700 truncate hover:text-blue-600 flex items-center gap-1"
                title={lead.websiteUrl}
              >
                {(() => {
                  try {
                    return new URL(lead.websiteUrl).hostname.replace('www.', '');
                  } catch {
                    return lead.websiteUrl;
                  }
                })()}
                <ExternalLink size={10} />
              </a>
            </div>
            <button
              onClick={() => handleCopy(lead.websiteUrl!, 'website')}
              className={`p-1.5 rounded-md transition-all ${
                copiedField === 'website'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
              }`}
              title="Copy"
            >
              {copiedField === 'website' ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        )}

        {!lead.phone && !lead.email && (
          <p className="text-xs text-slate-400 text-center py-2">
            No contact information available
          </p>
        )}
      </div>
    </div>
  );
});

QuickContactDock.displayName = 'QuickContactDock';

// Helper to get Tailwind color classes
function getColorClasses(color: string, available: boolean): { bg: string; text: string } {
  if (!available) {
    return { bg: 'bg-slate-100', text: 'text-slate-300' };
  }

  const colors: Record<string, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
    rose: { bg: 'bg-rose-100', text: 'text-rose-600' },
    pink: { bg: 'bg-gradient-to-br from-pink-100 to-purple-100', text: 'text-pink-600' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    sky: { bg: 'bg-sky-100', text: 'text-sky-600' },
    slate: { bg: 'bg-slate-200', text: 'text-slate-600' },
  };

  return colors[color] || { bg: 'bg-slate-100', text: 'text-slate-600' };
}

export default QuickContactDock;
