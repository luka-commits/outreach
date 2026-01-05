import React, { useState, useRef, useEffect, memo } from 'react';
import { Check, X, Plus, ExternalLink } from 'lucide-react';
import { Lead, TaskAction } from '../types';
import { channelColors } from '../lib/designTokens';
import { ACTION_ICONS } from '../constants';

// Map actions to their corresponding URL field in Lead
export const ACTION_TO_URL_FIELD: Record<TaskAction, keyof Lead | null> = {
  send_dm: 'instagramUrl',
  fb_message: 'facebookUrl',
  linkedin_dm: 'linkedinUrl',
  send_email: 'email',
  call: 'phone',
  manual: null,
  walk_in: null,
};

// Map actions to channel color keys
const ACTION_TO_CHANNEL: Record<TaskAction, keyof typeof channelColors | null> = {
  send_dm: 'instagram',
  fb_message: 'facebook',
  linkedin_dm: 'linkedin',
  send_email: 'email',
  call: 'call',
  manual: null,
  walk_in: 'walk_in',
};

// Labels for the add button
const ACTION_LABELS: Record<TaskAction, string> = {
  send_dm: 'Instagram',
  fb_message: 'Facebook',
  linkedin_dm: 'LinkedIn',
  send_email: 'Email',
  call: 'Phone',
  manual: 'Info',
  walk_in: 'Address',
};

interface InlineSocialUrlEditorProps {
  lead: Lead;
  action: TaskAction;
  onUpdateLead: (updates: Partial<Lead>) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

const InlineSocialUrlEditor: React.FC<InlineSocialUrlEditorProps> = memo(({
  lead,
  action,
  onUpdateLead,
  isEditing,
  onStartEdit,
  onCancelEdit,
}) => {
  const urlField = ACTION_TO_URL_FIELD[action];
  const channelKey = ACTION_TO_CHANNEL[action];
  const colors = channelKey ? channelColors[channelKey] : null;
  const Icon = ACTION_ICONS[action];
  const label = ACTION_LABELS[action];

  // Get current value
  const currentValue = urlField ? (lead[urlField] as string | undefined) : undefined;

  const [editValue, setEditValue] = useState(currentValue || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(currentValue || '');
  }, [currentValue]);

  // If no URL field for this action, don't render anything
  if (!urlField || !colors) {
    return null;
  }

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed !== (currentValue || '')) {
      onUpdateLead({ [urlField]: trimmed || undefined });
    }
    onCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(currentValue || '');
      onCancelEdit();
    }
  };

  // Editing state - show input
  if (isEditing) {
    return (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}>
          {Icon}
        </div>
        <input
          ref={inputRef}
          type={action === 'send_email' ? 'email' : action === 'call' ? 'tel' : 'url'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={`Enter ${label.toLowerCase()}...`}
          className="flex-1 max-w-[180px] bg-white border border-indigo-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
        />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleSave}
          className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Check size={14} />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setEditValue(currentValue || '');
            onCancelEdit();
          }}
          className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // Has value - show as clickable link
  if (currentValue) {
    const href = action === 'send_email'
      ? `mailto:${currentValue}`
      : action === 'call'
      ? `tel:${currentValue}`
      : currentValue.startsWith('http')
      ? currentValue
      : `https://${currentValue}`;

    return (
      <a
        href={href}
        target={action !== 'send_email' && action !== 'call' ? '_blank' : undefined}
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity`}
      >
        <span className="shrink-0">{Icon}</span>
        <span className="text-xs font-medium truncate max-w-[120px]">
          {action === 'send_email' || action === 'call'
            ? currentValue
            : currentValue.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
        </span>
        <ExternalLink size={12} className="shrink-0 opacity-60" />
      </a>
    );
  }

  // No value - show add button
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-dashed ${colors.border} ${colors.text} opacity-60 hover:opacity-100 transition-all`}
    >
      <span className="shrink-0">{Icon}</span>
      <span className="text-xs font-medium">Add {label}</span>
      <Plus size={12} className="shrink-0" />
    </button>
  );
});

InlineSocialUrlEditor.displayName = 'InlineSocialUrlEditor';

export default InlineSocialUrlEditor;
