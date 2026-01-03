import React, { useState } from 'react';
import { StickyNote, Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { LeadNote } from '../../types';
import {
  useLeadNotesQuery,
  useCreateLeadNote,
  useUpdateLeadNote,
  useDeleteLeadNote,
} from '../../hooks/queries';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../Toast';
import { getErrorMessage } from '../../utils/errorMessages';

interface NotesPanelProps {
  leadId: string;
}

const NotesPanel: React.FC<NotesPanelProps> = ({ leadId }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const { showToast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Queries
  const { data: notes = [], isLoading } = useLeadNotesQuery(userId, leadId);

  // Mutations
  const createNote = useCreateLeadNote(userId);
  const updateNote = useUpdateLeadNote(userId, leadId);
  const deleteNote = useDeleteLeadNote(userId, leadId);

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      await createNote.mutateAsync({ leadId, content: newNoteContent });
      setNewNoteContent('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to create note:', error);
      showToast(getErrorMessage(error), 'error');
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingContent.trim()) return;

    try {
      await updateNote.mutateAsync({ noteId, content: editingContent });
      setEditingNoteId(null);
      setEditingContent('');
    } catch (error) {
      console.error('Failed to update note:', error);
      showToast(getErrorMessage(error), 'error');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId);
    } catch (error) {
      console.error('Failed to delete note:', error);
      showToast(getErrorMessage(error), 'error');
    }
  };

  const startEditing = (note: LeadNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingContent('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-amber-50 to-amber-100/50 border-b border-amber-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500 text-white">
            <StickyNote size={18} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-800 uppercase tracking-wide">
              Notes
            </h3>
            <p className="text-xs text-slate-500">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors"
        >
          <Plus size={14} />
          Add Note
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {/* Add New Note Form */}
        {isAdding && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 animate-in fade-in zoom-in-95 duration-200">
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Write your note here..."
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-md text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewNoteContent('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNote}
                disabled={!newNoteContent.trim() || createNote.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createNote.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Save Note
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-amber-500" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && notes.length === 0 && !isAdding && (
          <div className="text-center py-8">
            <div className="inline-flex p-4 rounded-full bg-amber-100 text-amber-600 mb-3">
              <StickyNote size={24} />
            </div>
            <p className="text-sm text-slate-500">No notes yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "Add Note" to create your first note.
            </p>
          </div>
        )}

        {/* Notes List */}
        {notes.map((note) => (
          <div
            key={note.id}
            className="group p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
          >
            {editingNoteId === note.id ? (
              // Edit Mode
              <div>
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={cancelEditing}
                    className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={() => handleUpdateNote(note.id)}
                    disabled={!editingContent.trim() || updateNote.isPending}
                    className="p-2 text-blue-500 hover:text-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {updateNote.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {note.content}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formatDate(note.createdAt)}
                    {note.updatedAt !== note.createdAt && ' (edited)'}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditing(note)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                      title="Edit note"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      disabled={deleteNote.isPending}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-50"
                      title="Delete note"
                    >
                      {deleteNote.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotesPanel;
