import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { queryKeys } from '../../lib/queryClient';
import type { CustomFieldType, SelectOption, CustomFieldFormValue } from '../../types';

/**
 * Hook to get all custom field definitions for the current user.
 */
export function useCustomFieldDefinitionsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customFieldDefinitions(userId),
    queryFn: () => api.getCustomFieldDefinitions(userId!),
    enabled: !!userId,
  });
}

/**
 * Hook to get custom field values for a specific lead.
 */
export function useCustomFieldValuesQuery(userId: string | undefined, leadId: string) {
  return useQuery({
    queryKey: queryKeys.customFieldValues(userId, leadId),
    queryFn: () => api.getCustomFieldValues(userId!, leadId),
    enabled: !!userId && !!leadId,
  });
}

/**
 * Hook to create a new custom field definition.
 */
export function useCreateCustomFieldDefinition(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (field: {
      name: string;
      fieldType: CustomFieldType;
      isRequired?: boolean;
      options?: SelectOption[];
      defaultValue?: string;
      showInList?: boolean;
      showInFilters?: boolean;
    }) => api.createCustomFieldDefinition(userId!, field),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customFieldDefinitions(userId) });
    },
  });
}

/**
 * Hook to update a custom field definition.
 */
export function useUpdateCustomFieldDefinition(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fieldId, updates }: {
      fieldId: string;
      updates: Partial<{
        name: string;
        isRequired: boolean;
        options: SelectOption[];
        defaultValue: string;
        showInList: boolean;
        showInFilters: boolean;
      }>;
    }) => api.updateCustomFieldDefinition(userId!, fieldId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customFieldDefinitions(userId) });
    },
  });
}

/**
 * Hook to delete a custom field definition.
 */
export function useDeleteCustomFieldDefinition(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fieldId: string) => api.deleteCustomFieldDefinition(userId!, fieldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customFieldDefinitions(userId) });
      // Also invalidate all custom field value queries since values were cascade-deleted
      queryClient.invalidateQueries({ queryKey: queryKeys.customFieldValuesPrefix(userId) });
    },
  });
}

/**
 * Hook to reorder custom field definitions.
 */
export function useReorderCustomFieldDefinitions(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fieldIds: string[]) => api.reorderCustomFieldDefinitions(userId!, fieldIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customFieldDefinitions(userId) });
    },
  });
}

/**
 * Hook to set a custom field value for a lead.
 */
export function useSetCustomFieldValue(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, fieldId, value }: {
      leadId: string;
      fieldId: string;
      value: CustomFieldFormValue;
    }) => api.setCustomFieldValue(userId!, leadId, fieldId, value),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customFieldValues(userId, leadId) });
    },
  });
}

/**
 * Hook to bulk set custom field values for a lead.
 */
export function useSetCustomFieldValues(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, values }: {
      leadId: string;
      values: Array<{ fieldId: string; value: CustomFieldFormValue }>;
    }) => api.setCustomFieldValues(userId!, leadId, values),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customFieldValues(userId, leadId) });
    },
  });
}

/**
 * Hook to delete a custom field value.
 */
export function useDeleteCustomFieldValue(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, fieldId }: { leadId: string; fieldId: string }) =>
      api.deleteCustomFieldValue(userId!, leadId, fieldId),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customFieldValues(userId, leadId) });
    },
  });
}

/**
 * Hook to check if a custom field has any values.
 */
export function useCustomFieldHasValues(userId: string | undefined, fieldId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customFieldHasValues(userId, fieldId!),
    queryFn: () => api.customFieldHasValues(userId!, fieldId!),
    enabled: !!userId && !!fieldId,
  });
}
