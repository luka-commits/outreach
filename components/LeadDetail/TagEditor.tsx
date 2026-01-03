import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Check, Palette, Pencil, Trash2, Tag } from 'lucide-react';
import { LeadTag } from '../../types';
import {
  useLeadTagsQuery,
  useLeadTagsForLeadQuery,
  useCreateLeadTag,
  useAssignTagToLead,
  useRemoveTagFromLead,
  useUpdateLeadTag,
  useDeleteLeadTag,
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
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [editingTagColor, setEditingTagColor] = useState('#3B82F6');
  const [showEditColorPicker, setShowEditColorPicker] = useState(false);
  const [deleteConfirmTagId, setDeleteConfirmTagId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: allTags = [], isLoading: loadingTags } = useLeadTagsQuery(userId);
  const { data: assignedTags = [], isLoading: loadingAssigned } = useLeadTagsForLeadQuery(userId, leadId);

  // Mutations
  const createTag = useCreateLeadTag(userId);
  const assignTag = useAssignTagToLead(userId);
  const removeTag = useRemoveTagFromLead(userId);
  const updateTag = useUpdateLeadTag(userId);
  const deleteTag = useDeleteLeadTag(userId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setEditingTagId(null);
        setShowEditColorPicker(false);
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

  const handleStartEdit = (tag: LeadTag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    setEditingTagColor(tag.color);
    setShowEditColorPicker(false);
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditingTagName('');
    setEditingTagColor('#3B82F6');
    setShowEditColorPicker(false);
  };

  const handleSaveEdit = async () => {
    const trimmedName = editingTagName.trim();
    if (!trimmedName || !editingTagId) return;

    // Check for duplicates (case-insensitive)
    const duplicate = allTags.find(
      t => t.id !== editingTagId && t.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      showToast('A tag with this name already exists', 'error');
      return;
    }

    try {
      await updateTag.mutateAsync({
        tagId: editingTagId,
        updates: { name: trimmedName, color: editingTagColor }
      });
      handleCancelEdit();
    } catch (error) {
      console.error('Failed to update tag:', error);
      showToast(getErrorMessage(error), 'error');
    }
  };

  const handleDeleteTag = async () => {
    if (!deleteConfirmTagId) return;

    try {
      await deleteTag.mutateAsync(deleteConfirmTagId);
      setDeleteConfirmTagId(null);
    } catch (error) {
      console.error('Failed to delete tag:', error);
      showToast(getErrorMessage(error), 'error');
    }
  };

  const tagToDelete = allTags.find(t => t.id === deleteConfirmTagId);
  const isLoading = loadingTags || loadingAssigned;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Assigned Tags Display */}
      <div className="flex flex-wrap items-center gap-2">
        {assignedTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm hover:shadow transition-shadow group"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag.id);
              }}
              className="opacity-70 hover:opacity-100 transition-opacity ml-0.5"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {/* Add Tag Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isOpen
              ? 'bg-slate-200 text-slate-700'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
          }`}
        >
          <Plus size={14} />
          Add Tag
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/80 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
          {/* Create New Tag Section - Vertical Layout */}
          <div className="p-4 bg-gradient-to-b from-slate-50 to-white">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
              Create New Tag
            </p>

            {/* Full-width input */}
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Enter tag name..."
              className="w-full px-4 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all placeholder:text-slate-400 mb-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateAndAssign();
              }}
            />

            {/* Always-visible color picker */}
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-slate-400 mb-2">Choose Color</p>
              <div className="grid grid-cols-8 gap-2">
                {TAG_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={`w-7 h-7 rounded-lg transition-all hover:scale-110 hover:shadow-md ${
                      newTagColor === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Full-width create button */}
            <button
              onClick={handleCreateAndAssign}
              disabled={!newTagName.trim() || createTag.isPending}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {createTag.isPending ? 'Creating...' : 'Create & Assign'}
            </button>
          </div>

          {/* Existing Tags */}
          {allTags.length > 0 && (
            <div className="p-4 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                Your Tags
              </p>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {allTags.map(tag => {
                  const isAssigned = assignedTagIds.has(tag.id);
                  const isEditing = editingTagId === tag.id;

                  // Edit mode
                  if (isEditing) {
                    return (
                      <div key={tag.id} className="px-3 py-2.5 rounded-xl bg-slate-50 space-y-2">
                        <div className="flex items-center gap-2">
                          {/* Color picker button */}
                          <button
                            onClick={() => setShowEditColorPicker(!showEditColorPicker)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border-2 border-white shadow-sm hover:scale-105 transition-all"
                            style={{ backgroundColor: editingTagColor }}
                          >
                            <Palette size={14} className="text-white drop-shadow" />
                          </button>

                          {/* Name input */}
                          <input
                            type="text"
                            value={editingTagName}
                            onChange={(e) => setEditingTagName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="flex-1 px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                            autoFocus
                          />

                          {/* Save button */}
                          <button
                            onClick={handleSaveEdit}
                            disabled={updateTag.isPending}
                            className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg disabled:opacity-50 transition-all"
                          >
                            <Check size={16} />
                          </button>

                          {/* Cancel button */}
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* Inline color picker when toggled */}
                        {showEditColorPicker && (
                          <div className="grid grid-cols-8 gap-1.5 p-2 bg-white rounded-lg border border-slate-100">
                            {TAG_COLORS.map(color => (
                              <button
                                key={color}
                                onClick={() => {
                                  setEditingTagColor(color);
                                  setShowEditColorPicker(false);
                                }}
                                className={`w-6 h-6 rounded-md transition-all hover:scale-110 ${
                                  editingTagColor === color ? 'ring-2 ring-offset-1 ring-slate-400' : ''
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Normal view with hover actions
                  return (
                    <div
                      key={tag.id}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                        isAssigned
                          ? 'bg-slate-100 text-slate-900 shadow-sm'
                          : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {/* Left side - clickable for toggle */}
                      <button
                        onClick={() => handleToggleTag(tag)}
                        className="flex items-center gap-2.5 flex-1 text-left"
                      >
                        <span
                          className="w-4 h-4 rounded-md shadow-sm"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className={isAssigned ? 'text-slate-900' : 'text-slate-600'}>
                          {tag.name}
                        </span>
                      </button>

                      {/* Right side - actions */}
                      <div className="flex items-center gap-1">
                        {isAssigned && (
                          <Check size={16} className="text-green-500 mr-1" />
                        )}

                        {/* Edit button - hover reveal */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(tag);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title="Edit tag"
                        >
                          <Pencil size={14} />
                        </button>

                        {/* Delete button - hover reveal */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmTagId(tag.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete tag"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {allTags.length === 0 && !isLoading && (
            <div className="p-6 text-center border-t border-slate-100">
              <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                <Tag size={24} className="text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm font-medium">No tags yet</p>
              <p className="text-slate-400 text-xs mt-1">Create your first tag above</p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTagId && tagToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-8 animate-in zoom-in duration-200 relative shadow-2xl">
            <button
              onClick={() => setDeleteConfirmTagId(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-xl hover:bg-slate-50"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center space-y-5">
              {/* Warning icon with tag color */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: tagToDelete.color + '20' }}
              >
                <Trash2 size={28} style={{ color: tagToDelete.color }} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">
                  Delete "{tagToDelete.name}"?
                </h3>
                <p className="text-slate-500 text-sm">
                  This tag will be removed from all leads it's assigned to.
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 w-full pt-2">
                <button
                  onClick={() => setDeleteConfirmTagId(null)}
                  disabled={deleteTag.isPending}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-all text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTag}
                  disabled={deleteTag.isPending}
                  className="flex-1 py-3 px-4 bg-rose-500 text-white font-semibold rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 text-sm disabled:opacity-50"
                >
                  {deleteTag.isPending ? 'Deleting...' : 'Delete Tag'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagEditor;
