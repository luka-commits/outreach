import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Pencil, Check, X } from 'lucide-react';

interface InlineEditProps {
  value?: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  label?: string;
  type?: 'text' | 'url' | 'email' | 'tel';
  icon?: React.ReactNode;
}

const InlineEdit: React.FC<InlineEditProps> = memo(({
  value = '',
  onSave,
  placeholder = 'Add...',
  className = '',
  inputClassName = '',
  label,
  type = 'text',
  icon,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed !== value) {
      onSave(trimmed);
    }
    setIsEditing(false);
  }, [editValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  if (isEditing) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
        <div className="flex-1 flex items-center gap-2">
          <input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder={placeholder}
            className={`flex-1 bg-white border border-indigo-300 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all ${inputClassName}`}
          />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleSave}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            title="Save"
          >
            <Check size={14} />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCancel}
            className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`group flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2 hover:bg-slate-50 transition-all ${className}`}
      title="Click to edit"
    >
      {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        {label && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>}
        <p className={`text-sm font-medium truncate ${value ? 'text-slate-700' : 'text-slate-400 italic'}`}>
          {value || placeholder}
        </p>
      </div>
      <Pencil size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
});

InlineEdit.displayName = 'InlineEdit';

export default InlineEdit;
