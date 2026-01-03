import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Check, Palette } from 'lucide-react';
import { LeadTag } from '../../types';
import {
  useLeadTagsQuery,
  useLeadTagsForLeadQuery,
  useCreateLeadTag,
  useAssignTagToLead,
  useRemoveTagFromLead,
} from '../../hooks/queries';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../Toast';
import { getErrorMessage } from '../../utils/errorMessages';

interface TagEditorProps {
  leadId: string;
}

// Predefined color palette for tags
const TAG_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#EAB308', // yellow
  '#84CC16', // lime
  '#22C55E', // green
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#0EA5E9', // sky
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#A855F7', // purple
  '#D946EF', // fuchsia
  '#EC4899', // pink
  '#6B7280', // gray
];

const TagEditor: React.FC<TagEditorProps> = ({ leadId }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: allTags = [], isLoading: loadingTags } = useLeadTagsQuery(userId);
  const { data: assignedTags = [], isLoading: loadingAssigned } = useLeadTagsForLeadQuery(userId, leadId);

  // Mutations
  const createTag = useCreateLeadTag(userId);
  const assignTag = useAssignTagToLead(userId);
  const removeTag = useRemoveTagFromLead(userId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const assignedTagIds = new Set(assignedTags.map(t => t.id));

  const handleCreateAndAssign = async () => {
    if (!newTagName.trim()) return;

    try {
      const tag = await createTag.mutateAsync({ name: newTagName, color: newTagColor });
      await assignTag.mutateAsync({ leadId, tagId: tag.id });
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setShowColorPicker(false);
    } catch (error) {
      console.error('Failed to create tag:', error);
      showToast(getErrorMessage(error), 'error');
    }
  };

  const handleToggleTag = async (tag: LeadTag) => {
    try {
      if (assignedTagIds.has(tag.id)) {
        await removeTag.mutateAsync({ leadId, tagId: tag.id });
      } else {
        await assignTag.mutateAsync({ leadId, tagId: tag.id });
      }
    } catch (error) {
      console.error('Failed to toggle tag:', error);
      showToast(getErrorMessage(error), 'error');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTag.mutateAsync({ leadId, tagId });
    } catch (error) {
      console.error('Failed to remove tag:', error);
      showToast(getErrorMessage(error), 'error');
    }
  };

  const isLoading = loadingTags || loadingAssigned;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Assigned Tags Display */}
      <div className="flex flex-wrap items-center gap-2">
        {assignedTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white group"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag.id);
              }}
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {/* Add Tag Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <Plus size={12} />
          Add Tag
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Create New Tag
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-8 h-8 rounded-lg flex items-center justify-center border-2 border-slate-200 hover:border-slate-300 transition-colors"
                style={{ backgroundColor: newTagColor }}
                title="Choose color"
              >
                <Palette size={14} className="text-white drop-shadow" />
              </button>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name..."
                className="flex-1 px-3 py-1.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateAndAssign();
                }}
              />
              <button
                onClick={handleCreateAndAssign}
                disabled={!newTagName.trim() || createTag.isPending}
                className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Check size={14} />
              </button>
            </div>

            {/* Color Picker */}
            {showColorPicker && (
              <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-8 gap-1">
                  {TAG_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        setNewTagColor(color);
                        setShowColorPicker(false);
                      }}
                      className={`w-6 h-6 rounded-md transition-transform hover:scale-110 ${
                        newTagColor === color ? 'ring-2 ring-offset-1 ring-slate-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Existing Tags */}
          {allTags.length > 0 && (
            <div className="p-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Existing Tags
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {allTags.map(tag => {
                  const isAssigned = assignedTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isAssigned
                          ? 'bg-slate-100 text-slate-800'
                          : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </span>
                      {isAssigned && (
                        <Check size={14} className="text-green-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {allTags.length === 0 && !isLoading && (
            <div className="p-4 text-center text-slate-400 text-sm">
              No tags created yet.
              <br />
              Create your first tag above.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagEditor;
