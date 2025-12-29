import React, { memo, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Instagram,
  Mail,
  Phone,
  Facebook,
  Globe,
  ChevronLeft,
  ChevronRight,
  Linkedin,
  Footprints,
  MapPin,
  ExternalLink,
  Trash2,
  Building2,
  User,
  Target,
  Link,
  Star,
  MessageSquare,
  Briefcase,
  Twitter,
  Youtube,
  Video,
  Copy,
  Check,
} from 'lucide-react';
import { Lead, Activity } from '../../types';
import InlineEdit from './InlineEdit';

interface LeadHeaderProps {
  lead: Lead;
  onBack: () => void;
  onNavigate: (direction: 'next' | 'prev') => void;
  onDelete: () => void;
  onQualify: () => void;
  onManualAction: (platform: Activity['platform'], actionName: string) => void;
  onUpdate: (lead: Lead) => void;
}

const LeadHeader: React.FC<LeadHeaderProps> = memo(({
  lead,
  onBack,
  onNavigate,
  onDelete,
  onQualify,
  onManualAction,
  onUpdate,
}) => {
  const [showAddress, setShowAddress] = useState(false);

  const handleFieldUpdate = useCallback((field: keyof Lead, value: string) => {
    onUpdate({ ...lead, [field]: value || undefined });
  }, [lead, onUpdate]);

  return (
    <>
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px] bg-white px-4 py-2 rounded-xl border border-slate-200"
        >
          <ArrowLeft size={16} /> Back to Pipeline
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('prev')}
            className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
            Navigation
          </span>
          <button
            onClick={() => onNavigate('next')}
            className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Primary Info Card - Enhanced with gradient header */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
        {/* Gradient Header Section */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-10 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="space-y-4 flex-1">
              {/* Company Name */}
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                {lead.companyName}
              </h1>

              {/* Owner/Contact with Title Badge */}
              {(lead.contactName || lead.ownerTitle) && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                    <User size={16} className="text-indigo-300" />
                    <span className="font-semibold">{lead.contactName || 'Unknown'}</span>
                    {lead.ownerTitle && (
                      <span className="text-xs bg-indigo-500/50 px-2 py-0.5 rounded-full font-bold">
                        {lead.ownerTitle}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Location & Industry Tags */}
              <div className="flex flex-wrap items-center gap-2">
                {lead.location && (
                  <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm">
                    <MapPin size={14} className="text-emerald-400" />
                    {lead.location}
                  </span>
                )}
                {lead.niche && (
                  <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm">
                    <Target size={14} className="text-amber-400" />
                    {lead.niche}
                  </span>
                )}
                {lead.category && lead.category !== lead.niche && (
                  <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm">
                    <Briefcase size={14} className="text-cyan-400" />
                    {lead.category}
                  </span>
                )}
              </div>

              {/* Google Rating Badge */}
              {lead.googleRating && (
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-2 bg-amber-500/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                    <Star size={18} className="text-amber-400 fill-amber-400" />
                    <span className="text-xl font-black text-amber-300">{lead.googleRating.toFixed(1)}</span>
                    {lead.googleReviewCount && (
                      <span className="text-sm text-amber-200/70">
                        ({lead.googleReviewCount.toLocaleString()} reviews)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={onDelete}
                className="p-4 rounded-2xl border border-white/20 text-white/60 hover:text-rose-400 hover:border-rose-400/50 hover:bg-rose-500/10 transition-all"
                title="Delete lead"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={onQualify}
                className={`px-8 py-4 rounded-2xl text-sm font-black shadow-lg transition-all active:scale-95 ${
                  lead.status === 'qualified'
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-white text-slate-900 hover:bg-slate-100'
                }`}
              >
                {lead.status === 'qualified' ? 'Qualified ✅' : 'Qualify Lead'}
              </button>
            </div>
          </div>
        </div>

        {/* White Content Section */}
        <div className="p-10 space-y-8">
          {/* Editable Fields */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <InlineEdit
              value={lead.companyName}
              onSave={(val) => handleFieldUpdate('companyName', val)}
              placeholder="Company Name"
              label="Company"
              icon={<Building2 size={16} />}
            />
            <InlineEdit
              value={lead.contactName}
              onSave={(val) => handleFieldUpdate('contactName', val)}
              placeholder="Add contact name..."
              label="Contact"
              icon={<User size={16} />}
            />
            <InlineEdit
              value={lead.location}
              onSave={(val) => handleFieldUpdate('location', val)}
              placeholder="Add location..."
              label="Location"
              icon={<MapPin size={16} />}
            />
            <InlineEdit
              value={lead.niche}
              onSave={(val) => handleFieldUpdate('niche', val)}
              placeholder="Add industry/niche..."
              label="Industry"
              icon={<Target size={16} />}
            />
          </div>

          {/* Website - Editable */}
          <InlineEdit
            value={lead.websiteUrl}
            onSave={(val) => handleFieldUpdate('websiteUrl', val)}
            placeholder="Add website URL..."
            label="Website"
            type="url"
            icon={<Globe size={16} />}
          />

          {/* Social & Contact Channels - Colorful Cards */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Contact Channels</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <ColorfulContactCard
                icon={<Instagram size={22} />}
                label="Instagram"
                value={lead.instagramUrl}
                gradientFrom="from-pink-500"
                gradientTo="to-purple-600"
                bgHover="hover:bg-gradient-to-br hover:from-pink-50 hover:to-purple-50"
                onLog={() => onManualAction('instagram', 'Instagram Outreach')}
                onSave={(val) => handleFieldUpdate('instagramUrl', val)}
                placeholder="https://instagram.com/..."
              />
              <ColorfulContactCard
                icon={<Facebook size={22} />}
                label="Facebook"
                value={lead.facebookUrl}
                gradientFrom="from-blue-600"
                gradientTo="to-blue-700"
                bgHover="hover:bg-blue-50"
                onLog={() => onManualAction('facebook', 'Facebook Outreach')}
                onSave={(val) => handleFieldUpdate('facebookUrl', val)}
                placeholder="https://facebook.com/..."
              />
              <ColorfulContactCard
                icon={<Linkedin size={22} />}
                label="LinkedIn"
                value={lead.linkedinUrl}
                gradientFrom="from-sky-600"
                gradientTo="to-blue-700"
                bgHover="hover:bg-sky-50"
                onLog={() => onManualAction('linkedin', 'LinkedIn Outreach')}
                onSave={(val) => handleFieldUpdate('linkedinUrl', val)}
                placeholder="https://linkedin.com/..."
              />
              <ColorfulContactCard
                icon={<Mail size={22} />}
                label="Email"
                value={lead.email}
                gradientFrom="from-rose-500"
                gradientTo="to-red-600"
                bgHover="hover:bg-rose-50"
                type="email"
                onLog={() => onManualAction('email', 'Email Outreach')}
                onSave={(val) => handleFieldUpdate('email', val)}
                placeholder="email@example.com"
              />
              <ColorfulContactCard
                icon={<Phone size={22} />}
                label="Phone"
                value={lead.phone}
                gradientFrom="from-emerald-500"
                gradientTo="to-green-600"
                bgHover="hover:bg-emerald-50"
                type="tel"
                onLog={() => onManualAction('call', 'Call Attempt')}
                onSave={(val) => handleFieldUpdate('phone', val)}
                placeholder="+1 (555) 123-4567"
              />
              {/* Walk-in Card */}
              <div className="relative group">
                <div
                  onClick={() => {
                    if (lead.address) {
                      setShowAddress(!showAddress);
                    }
                    onManualAction('walkIn', 'Physical Visit');
                  }}
                  className={`flex flex-col items-center justify-center gap-2 w-full p-4 rounded-2xl border-2 transition-all cursor-pointer h-full min-h-[100px] ${
                    lead.address
                      ? 'bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200 text-indigo-600 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100'
                      : 'bg-slate-50 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-500'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${lead.address ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <Footprints size={22} />
                  </div>
                  <span className="text-xs font-bold">Walk-in</span>
                  {!lead.address && (
                    <span className="text-[10px] text-slate-400">+ Add address</span>
                  )}
                </div>
                {showAddress && lead.address && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900 text-white p-5 rounded-2xl z-30 animate-in zoom-in duration-200 shadow-2xl min-w-[250px]">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">
                        Business Address
                      </p>
                      <MapPin size={14} className="text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{lead.address}</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase text-indigo-300 hover:text-white transition-colors"
                    >
                      Open in Maps <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Loom Video Section - For Follow-up */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
              Follow-up Video
            </h3>
            <LoomVideoCard
              value={lead.loomUrl}
              onSave={(val) => handleFieldUpdate('loomUrl', val)}
            />
          </div>

          {/* Additional Social Media (Twitter, YouTube if available) */}
          {(lead.twitterUrl || lead.youtubeUrl || lead.tiktokUrl) && (
            <div className="flex flex-wrap gap-3">
              {lead.twitterUrl && (
                <a
                  href={lead.twitterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all text-sm font-semibold"
                >
                  <Twitter size={16} />
                  Twitter/X
                  <ExternalLink size={12} />
                </a>
              )}
              {lead.youtubeUrl && (
                <a
                  href={lead.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all text-sm font-semibold"
                >
                  <Youtube size={16} />
                  YouTube
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}

          {/* Address - Editable (separate row) */}
          <InlineEdit
            value={lead.address}
            onSave={(val) => handleFieldUpdate('address', val)}
            placeholder="Add business address..."
            label="Address"
            icon={<MapPin size={16} />}
          />
        </div>
      </div>
    </>
  );
});

LeadHeader.displayName = 'LeadHeader';

// Colorful Contact Card Component
const ColorfulContactCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string;
  gradientFrom: string;
  gradientTo: string;
  bgHover: string;
  onLog: () => void;
  onSave: (value: string) => void;
  type?: 'url' | 'email' | 'tel';
  placeholder?: string;
}> = ({ icon, label, value, gradientFrom, gradientTo, bgHover, onLog, onSave, type = 'url', placeholder }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  const handleSave = () => {
    onSave(editValue.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const getHref = () => {
    if (!value) return undefined;
    if (type === 'email') return `mailto:${value}`;
    if (type === 'tel') return `tel:${value}`;
    return value;
  };

  if (isEditing) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-indigo-300 bg-white shadow-lg">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white`}>
          {icon}
        </div>
        <input
          type={type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'url'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          placeholder={placeholder || `Add ${label}...`}
          className="w-full text-center text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none"
        />
      </div>
    );
  }

  return (
    <div className="group relative">
      <div
        onClick={(e) => {
          if (!value) {
            e.preventDefault();
            setIsEditing(true);
          }
        }}
        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all h-full min-h-[100px] ${
          value
            ? `bg-gradient-to-br ${gradientFrom.replace('from-', 'from-').replace('-500', '-50').replace('-600', '-50').replace('-700', '-50')} ${gradientTo.replace('to-', 'to-').replace('-500', '-50').replace('-600', '-50').replace('-700', '-50')} border-transparent shadow-sm cursor-pointer hover:shadow-lg`
            : `bg-slate-50 border-dashed border-slate-200 text-slate-400 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-500`
        }`}
      >
        <div className={`p-2 rounded-xl ${value ? `bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white shadow-lg` : 'bg-slate-200 text-slate-400'}`}>
          {icon}
        </div>
        <span className={`text-xs font-bold ${value ? 'text-slate-700' : ''}`}>{label}</span>
        {!value && (
          <span className="text-[10px] text-slate-400">+ Add</span>
        )}
      </div>

      {/* Action overlay when has value */}
      {value && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all bg-white/95 rounded-2xl backdrop-blur-sm">
          <a
            href={getHref()}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              onLog();
            }}
            className={`p-3 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white shadow-lg transition-all hover:scale-110`}
            title={`Open ${label}`}
          >
            <ExternalLink size={18} />
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditValue(value);
              setIsEditing(true);
            }}
            className="p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all hover:scale-110"
            title={`Edit ${label}`}
          >
            <Link size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

// Loom Video Card Component
const LoomVideoCard: React.FC<{
  value?: string;
  onSave: (value: string) => void;
}> = ({ value, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    onSave(editValue.trim());
    setIsEditing(false);
  };

  const handleCopy = async () => {
    if (value) {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-purple-300 bg-purple-50">
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
          <Video size={20} />
        </div>
        <input
          type="url"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setEditValue(value || '');
              setIsEditing(false);
            }
          }}
          onBlur={handleSave}
          autoFocus
          placeholder="https://www.loom.com/share/..."
          className="flex-1 bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-purple-500/20 outline-none"
        />
      </div>
    );
  }

  if (value) {
    return (
      <div className="group flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 hover:border-purple-200 transition-all">
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg">
          <Video size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">
            Loom Video
          </p>
          <p className="text-sm font-medium text-slate-700 truncate">{value}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`p-3 rounded-xl transition-all ${
              copied
                ? 'bg-emerald-500 text-white'
                : 'bg-white border border-purple-200 text-purple-600 hover:bg-purple-100'
            }`}
            title={copied ? 'Copied!' : 'Copy link'}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
          {/* Open in new tab */}
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white hover:shadow-lg transition-all"
            title="Open Loom"
          >
            <ExternalLink size={18} />
          </a>
          {/* Edit button */}
          <button
            onClick={() => {
              setEditValue(value);
              setIsEditing(true);
            }}
            className="p-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-all"
            title="Edit"
          >
            <Link size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <div
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all group"
    >
      <div className="p-3 rounded-xl bg-slate-200 text-slate-400 group-hover:bg-gradient-to-br group-hover:from-purple-500 group-hover:to-indigo-600 group-hover:text-white transition-all">
        <Video size={20} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-400 group-hover:text-purple-600">
          Add Loom Video
        </p>
        <p className="text-xs text-slate-400">
          Perfect for personalized follow-up responses
        </p>
      </div>
    </div>
  );
};

export default LeadHeader;
