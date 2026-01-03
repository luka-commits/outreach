import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { queryKeys } from '../../lib/queryClient';

/**
 * Hook to get all notes for a specific lead.
 */
export function useLeadNotesQuery(userId: string | undefined, leadId: string) {
  return useQuery({
    queryKey: queryKeys.notesByLead(userId, leadId),
    queryFn: () => api.getNotesByLead(userId!, leadId),
    enabled: !!userId && !!leadId,
  });
}

/**
 * Hook to create a new note for a lead.
 */
export function useCreateLeadNote(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, content }: { leadId: string; content: string }) =>
      api.createLeadNote(userId!, leadId, content),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notesByLead(userId, leadId) });
    },
  });
}

/**
 * Hook to update an existing note.
 */
export function useUpdateLeadNote(userId: string | undefined, leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      api.updateLeadNote(userId!, noteId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notesByLead(userId, leadId) });
    },
  });
}

/**
 * Hook to delete a note.
 */
export function useDeleteLeadNote(userId: string | undefined, leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => api.deleteLeadNote(userId!, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notesByLead(userId, leadId) });
    },
  });
}
