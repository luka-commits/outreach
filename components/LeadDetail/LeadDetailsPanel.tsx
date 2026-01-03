import React, { memo, useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  User,
  Building2,
  MapPin,
  Share2,
  Tag,
  Pencil,
  Star,
  Sliders,
} from 'lucide-react';
import { Lead } from '../../types';
import TagEditor from './TagEditor';
import CustomFieldsSection from './CustomFieldsSection';

interface LeadDetailsPanelProps {
  lead: Lead;
  onUpdate: (lead: Lead) => void;
}

type AccordionSection = 'contact' | 'company' | 'social' | 'location' | 'tags' | 'custom';

const LeadDetailsPanel: React.FC<LeadDetailsPanelProps> = memo(({ lead, onUpdate }) => {
  const [expandedSections, setExpandedSections] = useState<Set<AccordionSection>>(
    new Set(['contact'])
  );
  const [isEditing, setIsEditing] = useState(false);

  const toggleSection = (section: AccordionSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleFieldUpdate = useCallback(
    (field: keyof Lead, value: string) => {
      onUpdate({ ...lead, [field]: value || undefined });
    },
    [lead, onUpdate]
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Details
        </h4>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            isEditing
              ? 'bg-blue-100 text-blue-600'
              : 'text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Pencil size={12} />
          {isEditing ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Accordion Sections */}
      <div className="divide-y divide-slate-100">
        {/* Contact Information */}
        <AccordionItem
          title="Contact Information"
          icon={User}
          expanded={expandedSections.has('contact')}
          onToggle={() => toggleSection('contact')}
        >
          <div className="space-y-3">
            <DetailField
              label="Name"
              value={lead.contactName}
              placeholder="Add contact name..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('contactName', val)}
            />
            <DetailField
              label="Title"
              value={lead.ownerTitle}
              placeholder="Add title..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('ownerTitle', val)}
            />
            <DetailField
              label="Phone"
              value={lead.phone}
              placeholder="Add phone..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('phone', val)}
            />
            <DetailField
              label="Email"
              value={lead.email}
              placeholder="Add email..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('email', val)}
            />
          </div>
        </AccordionItem>

        {/* Company Information */}
        <AccordionItem
          title="Company Information"
          icon={Building2}
          expanded={expandedSections.has('company')}
          onToggle={() => toggleSection('company')}
        >
          <div className="space-y-3">
            <DetailField
              label="Company"
              value={lead.companyName}
              placeholder="Company name..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('companyName', val)}
            />
            <DetailField
              label="Website"
              value={lead.websiteUrl}
              placeholder="Add website..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('websiteUrl', val)}
              type="url"
            />
            <DetailField
              label="Industry"
              value={lead.niche}
              placeholder="Add industry..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('niche', val)}
            />
            <DetailField
              label="Category"
              value={lead.category}
              placeholder="Add category..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('category', val)}
            />
            {lead.googleRating && (
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-500">Rating</span>
                <div className="flex items-center gap-1.5">
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  <span className="text-sm font-bold text-slate-700">
                    {lead.googleRating.toFixed(1)}
                  </span>
                  {lead.googleReviewCount && (
                    <span className="text-xs text-slate-400">
                      ({lead.googleReviewCount})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </AccordionItem>

        {/* Social Profiles */}
        <AccordionItem
          title="Social Profiles"
          icon={Share2}
          expanded={expandedSections.has('social')}
          onToggle={() => toggleSection('social')}
        >
          <div className="space-y-3">
            <DetailField
              label="Instagram"
              value={lead.instagramUrl}
              placeholder="Instagram URL..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('instagramUrl', val)}
              type="url"
            />
            <DetailField
              label="Facebook"
              value={lead.facebookUrl}
              placeholder="Facebook URL..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('facebookUrl', val)}
              type="url"
            />
            <DetailField
              label="LinkedIn"
              value={lead.linkedinUrl}
              placeholder="LinkedIn URL..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('linkedinUrl', val)}
              type="url"
            />
            <DetailField
              label="Twitter/X"
              value={lead.twitterUrl}
              placeholder="Twitter URL..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('twitterUrl', val)}
              type="url"
            />
          </div>
        </AccordionItem>

        {/* Location & Address */}
        <AccordionItem
          title="Location & Address"
          icon={MapPin}
          expanded={expandedSections.has('location')}
          onToggle={() => toggleSection('location')}
        >
          <div className="space-y-3">
            <DetailField
              label="Location"
              value={lead.location}
              placeholder="City, State..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('location', val)}
            />
            <DetailField
              label="Address"
              value={lead.address}
              placeholder="Street address..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('address', val)}
            />
            <DetailField
              label="Zip Code"
              value={lead.zipCode}
              placeholder="Zip code..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('zipCode', val)}
            />
            <DetailField
              label="Country"
              value={lead.country}
              placeholder="Country..."
              editable={isEditing}
              onSave={(val) => handleFieldUpdate('country', val)}
            />
          </div>
        </AccordionItem>

        {/* Tags */}
        <AccordionItem
          title="Tags"
          icon={Tag}
          expanded={expandedSections.has('tags')}
          onToggle={() => toggleSection('tags')}
        >
          <TagEditor leadId={lead.id} />
        </AccordionItem>

        {/* Custom Fields */}
        <AccordionItem
          title="Custom Fields"
          icon={Sliders}
          expanded={expandedSections.has('custom')}
          onToggle={() => toggleSection('custom')}
        >
          <CustomFieldsSection leadId={lead.id} />
        </AccordionItem>
      </div>
    </div>
  );
});

LeadDetailsPanel.displayName = 'LeadDetailsPanel';

// Accordion Item Component
interface AccordionItemProps {
  title: string;
  icon: React.FC<{ size?: number; className?: string }>;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  icon: Icon,
  expanded,
  onToggle,
  children,
}) => (
  <div>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-700">{title}</span>
      </div>
      {expanded ? (
        <ChevronDown size={16} className="text-slate-400" />
      ) : (
        <ChevronRight size={16} className="text-slate-400" />
      )}
    </button>
    {expanded && (
      <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-2 duration-200">
        {children}
      </div>
    )}
  </div>
);

// Detail Field Component
interface DetailFieldProps {
  label: string;
  value?: string;
  placeholder?: string;
  editable: boolean;
  onSave: (value: string) => void;
  type?: 'text' | 'url' | 'email' | 'tel';
}

const DetailField: React.FC<DetailFieldProps> = ({
  label,
  value,
  placeholder,
  editable,
  onSave,
  type = 'text',
}) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);

  const handleBlur = () => {
    setIsFocused(false);
    if (localValue !== (value || '')) {
      onSave(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave(localValue);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setLocalValue(value || '');
      (e.target as HTMLInputElement).blur();
    }
  };

  // Update local value when prop changes
  React.useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-slate-500 flex-shrink-0 w-20">{label}</span>
      {editable ? (
        <input
          type={type}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`flex-1 text-right text-sm font-medium px-2 py-1 rounded-md transition-all outline-none ${
            isFocused
              ? 'bg-blue-50 border border-blue-300'
              : 'bg-transparent border border-transparent hover:bg-slate-50'
          } ${value ? 'text-slate-700' : 'text-slate-400'}`}
        />
      ) : (
        <span
          className={`text-sm font-medium text-right truncate ${
            value ? 'text-slate-700' : 'text-slate-400'
          }`}
          title={value || undefined}
        >
          {value || '-'}
        </span>
      )}
    </div>
  );
};

export default LeadDetailsPanel;
