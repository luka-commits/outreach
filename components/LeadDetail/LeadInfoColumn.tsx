import React, { memo, useState, useCallback } from 'react';
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
  Video,
  Sparkles,
  FileText,
  Search,
  Plus,
  Star,
  MapPin,
  Briefcase,
  Pencil,
  X,
} from 'lucide-react';
import { Lead } from '../../types';
import InlineEdit from './InlineEdit';
import TagEditor from './TagEditor';

interface LeadInfoColumnProps {
  lead: Lead;
  onUpdate: (lead: Lead) => void;
  onInitiateCall: () => void;
  onOpenEmailComposer: () => void;
}

const LeadInfoColumn: React.FC<LeadInfoColumnProps> = memo(({
  lead,
  onUpdate,
  onInitiateCall,
  onOpenEmailComposer,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleFieldUpdate = useCallback(
    (field: keyof Lead, value: string) => {
      onUpdate({ ...lead, [field]: value || undefined });
    },
    [lead, onUpdate]
  );

  const handleCopy = useCallback(async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // Social links configuration with native platform colors
  const socialLinks = [
    {
      id: 'instagram',
      icon: Instagram,
      label: 'Instagram',
      url: lead.instagramUrl,
      field: 'instagramUrl' as keyof Lead,
      bgClass: 'bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500',
      hoverClass: 'hover:from-purple-700 hover:via-pink-700 hover:to-orange-600',
    },
    {
      id: 'facebook',
      icon: Facebook,
      label: 'Facebook',
      url: lead.facebookUrl,
      field: 'facebookUrl' as keyof Lead,
      bgClass: 'bg-[#1877F2]',
      hoverClass: 'hover:bg-[#166FE5]',
    },
    {
      id: 'linkedin',
      icon: Linkedin,
      label: 'LinkedIn',
      url: lead.linkedinUrl,
      field: 'linkedinUrl' as keyof Lead,
      bgClass: 'bg-[#0A66C2]',
      hoverClass: 'hover:bg-[#004182]',
    },
    {
      id: 'website',
      icon: Globe,
      label: 'Website',
      url: lead.websiteUrl,
      field: 'websiteUrl' as keyof Lead,
      bgClass: 'bg-slate-700',
      hoverClass: 'hover:bg-slate-800',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Company Name - Large & Prominent */}
      <div>
        <InlineEdit
          value={lead.companyName}
          onSave={(val) => handleFieldUpdate('companyName', val)}
          placeholder="Company Name"
          className="text-4xl font-extrabold text-slate-900 tracking-tight"
        />
      </div>

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        {/* Lead ID */}
        <span className="text-xs text-slate-400 font-mono">
          ID: {lead.id.slice(0, 8)}
        </span>

        {lead.googleRating && (
          <span className="flex items-center gap-1.5">
            <Star size={14} className="text-amber-400 fill-amber-400" />
            <span className="font-medium text-slate-700">{lead.googleRating.toFixed(1)}</span>
            {lead.googleReviewCount && (
              <span className="text-slate-400">({lead.googleReviewCount})</span>
            )}
          </span>
        )}
        {lead.location && (
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-slate-400" />
            {lead.location}
          </span>
        )}
        {lead.niche && (
          <span className="flex items-center gap-1.5">
            <Briefcase size={14} className="text-slate-400" />
            {lead.niche}
          </span>
        )}
      </div>

      {/* Contact: Phone - Prominent Call Button */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2.5 rounded-xl bg-emerald-100">
            <Phone size={18} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <InlineEdit
              value={lead.phone}
              onSave={(val) => handleFieldUpdate('phone', val)}
              placeholder="Add phone number"
              type="tel"
              className="text-base font-medium"
            />
          </div>
        </div>
        {lead.phone && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(lead.phone!, 'phone')}
              className={`p-2 rounded-lg transition-all ${
                copiedField === 'phone'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="Copy"
            >
              {copiedField === 'phone' ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button
              onClick={onInitiateCall}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
            >
              <Phone size={18} />
              Call
            </button>
          </div>
        )}
      </div>

      {/* Contact: Email - Prominent Send Email Button */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2.5 rounded-xl bg-rose-100">
            <Mail size={18} className="text-rose-600" />
          </div>
          <div className="flex-1 min-w-0">
            <InlineEdit
              value={lead.email}
              onSave={(val) => handleFieldUpdate('email', val)}
              placeholder="Add email address"
              type="email"
              className="text-base font-medium"
            />
          </div>
        </div>
        {lead.email && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(lead.email!, 'email')}
              className={`p-2 rounded-lg transition-all ${
                copiedField === 'email'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="Copy"
            >
              {copiedField === 'email' ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button
              onClick={onOpenEmailComposer}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200"
            >
              <Mail size={18} />
              Send Email
            </button>
          </div>
        )}
      </div>

      {/* Social Links Row - Larger Buttons with Two Clickable Areas */}
      <div className="flex flex-wrap items-center gap-3 py-3">
        {socialLinks.map((link) => {
          const Icon = link.icon;
          const isAvailable = !!link.url;

          if (isAvailable) {
            return (
              <div key={link.id} className={`flex items-center rounded-xl overflow-hidden shadow-md ${link.bgClass}`}>
                {/* Open Link Button */}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium transition-all ${link.hoverClass}`}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                  <ExternalLink size={14} className="opacity-70" />
                </a>
                {/* Edit Button - Separate clickable area */}
                <button
                  onClick={() => {
                    const url = prompt(`Edit ${link.label} URL:`, link.url);
                    if (url !== null) handleFieldUpdate(link.field, url);
                  }}
                  className="px-3 py-2.5 text-white hover:bg-white/20 transition-colors border-l border-white/20"
                  title={`Edit ${link.label}`}
                >
                  <Pencil size={14} />
                </button>
              </div>
            );
          }

          // Show outline button for missing links
          return (
            <button
              key={link.id}
              onClick={() => {
                const url = prompt(`Enter ${link.label} URL:`);
                if (url) handleFieldUpdate(link.field, url);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 text-sm font-medium hover:border-slate-400 hover:text-slate-500 transition-all"
            >
              <Icon size={18} />
              <span>{link.label}</span>
              <Plus size={14} />
            </button>
          );
        })}
      </div>

      {/* Loom Video - Editable */}
      <div className="flex items-center gap-2 py-1">
        <div className="p-1.5 rounded-lg bg-violet-100">
          <Video size={14} className="text-violet-600" />
        </div>
        {lead.loomUrl ? (
          <div className="flex items-center gap-2">
            <a
              href={lead.loomUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
            >
              View Loom Video
              <ExternalLink size={12} />
            </a>
            <button
              onClick={() => {
                const url = prompt('Edit Loom video URL:', lead.loomUrl);
                if (url !== null) handleFieldUpdate('loomUrl', url);
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Edit"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => handleFieldUpdate('loomUrl', '')}
              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
              title="Remove"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              const url = prompt('Enter Loom video URL:');
              if (url) handleFieldUpdate('loomUrl', url);
            }}
            className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1"
          >
            <Plus size={14} />
            Add Loom Video
          </button>
        )}
      </div>

      {/* Tags */}
      <div className="py-2">
        <TagEditor leadId={lead.id} />
      </div>

      {/* Executive Summary */}
      {lead.executiveSummary ? (
        <div className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 rounded-xl border border-indigo-100">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg shadow-sm">
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-1">
                  <FileText size={12} />
                  Executive Summary
                </h3>
                {lead.searchQuery && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    <Search size={10} />
                    {lead.searchQuery}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {lead.executiveSummary}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center">
          <button
            onClick={() => {
              const summary = prompt('Enter executive summary:');
              if (summary) handleFieldUpdate('executiveSummary', summary);
            }}
            className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto"
          >
            <Plus size={14} />
            Add Executive Summary
          </button>
        </div>
      )}
    </div>
  );
});

LeadInfoColumn.displayName = 'LeadInfoColumn';

export default LeadInfoColumn;
