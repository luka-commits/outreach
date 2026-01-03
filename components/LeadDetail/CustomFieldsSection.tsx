import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Type,
  Hash,
  Calendar,
  ChevronDown,
  CheckSquare,
  Link,
  List,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  useCustomFieldDefinitionsQuery,
  useCustomFieldValuesQuery,
  useSetCustomFieldValue,
  useCreateCustomFieldDefinition,
  useUpdateCustomFieldDefinition,
  useDeleteCustomFieldDefinition,
  useCustomFieldHasValues,
} from '../../hooks/queries';
import { useToast } from '../Toast';
import { getErrorMessage } from '../../utils/errorMessages';
import type { CustomFieldDefinition, CustomFieldValue, CustomFieldFormValue, CustomFieldType, SelectOption } from '../../types';

// Field type configuration
const FIELD_TYPE_CONFIG: Record<CustomFieldType, { label: string; icon: React.ReactNode }> = {
  text: { label: 'Text', icon: <Type size={14} /> },
  number: { label: 'Num', icon: <Hash size={14} /> },
  date: { label: 'Date', icon: <Calendar size={14} /> },
  single_select: { label: 'Select', icon: <ChevronDown size={14} /> },
  multi_select: { label: 'Multi', icon: <List size={14} /> },
  checkbox: { label: 'Check', icon: <CheckSquare size={14} /> },
  url: { label: 'URL', icon: <Link size={14} /> },
};

const PRESET_COLORS = [
  '#6B7280', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899',
];

interface CustomFieldsSectionProps {
  leadId: string;
  onNavigateToSettings?: () => void;
}

const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = memo(({ leadId, onNavigateToSettings }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const { showToast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: definitions = [], isLoading: defsLoading } = useCustomFieldDefinitionsQuery(userId);
  const { data: values = [], isLoading: valsLoading } = useCustomFieldValuesQuery(userId, leadId);

  // Mutations
  const setFieldValue = useSetCustomFieldValue(userId);
  const createField = useCreateCustomFieldDefinition(userId);
  const updateField = useUpdateCustomFieldDefinition(userId);
  const deleteField = useDeleteCustomFieldDefinition(userId);

  // State for dropdown and field management
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState<SelectOption[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldName, setEditingFieldName] = useState('');
  const [deleteConfirmFieldId, setDeleteConfirmFieldId] = useState<string | null>(null);

  const isLoading = defsLoading || valsLoading;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        resetCreateForm();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Create a map for quick value lookup
  const valueMap = new Map<string, CustomFieldValue>();
  for (const val of values) {
    valueMap.set(val.fieldId, val);
  }

  const resetCreateForm = () => {
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldOptions([]);
  };

  const handleValueChange = useCallback(
    (fieldId: string, value: CustomFieldFormValue) => {
      setFieldValue.mutate(
        { leadId, fieldId, value },
        {
          onError: (error) => showToast(getErrorMessage(error), 'error'),
        }
      );
    },
    [leadId, setFieldValue, showToast]
  );

  const handleCreateField = async () => {
    if (!newFieldName.trim()) {
      showToast('Field name is required', 'error');
      return;
    }

    if ((newFieldType === 'single_select' || newFieldType === 'multi_select') && newFieldOptions.length === 0) {
      showToast('Add at least one option for select fields', 'error');
      return;
    }

    try {
      await createField.mutateAsync({
        name: newFieldName,
        fieldType: newFieldType,
        options: newFieldOptions,
        isRequired: false,
        showInList: false,
        showInFilters: true,
      });
      showToast('Field created', 'success');
      resetCreateForm();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    }
  };

  const handleRenameField = async (fieldId: string) => {
    if (!editingFieldName.trim()) {
      showToast('Field name is required', 'error');
      return;
    }

    try {
      await updateField.mutateAsync({
        fieldId,
        updates: { name: editingFieldName },
      });
      showToast('Field renamed', 'success');
      setEditingFieldId(null);
      setEditingFieldName('');
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    try {
      await deleteField.mutateAsync(fieldId);
      showToast('Field deleted', 'success');
      setDeleteConfirmFieldId(null);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    }
  };

  const addOption = () => {
    const newValue = `option_${newFieldOptions.length + 1}`;
    setNewFieldOptions([
      ...newFieldOptions,
      { value: newValue, label: `Option ${newFieldOptions.length + 1}`, color: PRESET_COLORS[newFieldOptions.length % PRESET_COLORS.length] },
    ]);
  };

  const updateOption = (index: number, updates: Partial<SelectOption>) => {
    const updated = [...newFieldOptions];
    const current = updated[index];
    if (!current) return;
    updated[index] = {
      value: updates.label ? updates.label.toLowerCase().replace(/\s+/g, '_') : current.value,
      label: updates.label ?? current.label,
      color: updates.color ?? current.color,
    };
    setNewFieldOptions(updated);
  };

  const removeOption = (index: number) => {
    setNewFieldOptions(newFieldOptions.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="py-4 text-center">
        <div className="animate-pulse text-sm text-slate-400">Loading custom fields...</div>
      </div>
    );
  }

  // Empty state with inline create option
  if (definitions.length === 0) {
    return (
      <div className="relative" ref={dropdownRef}>
        <div className="py-4 text-center">
          <p className="text-sm text-slate-500 mb-3">No custom fields defined yet</p>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="inline-flex items-center gap-1.5 text-sm text-pilot-blue hover:text-pilot-blue/80 font-medium"
          >
            <Plus size={14} />
            Add Custom Field
          </button>
        </div>

        {/* Dropdown for empty state */}
        {isDropdownOpen && (
          <FieldManagementDropdown
            definitions={[]}
            newFieldName={newFieldName}
            setNewFieldName={setNewFieldName}
            newFieldType={newFieldType}
            setNewFieldType={setNewFieldType}
            newFieldOptions={newFieldOptions}
            addOption={addOption}
            updateOption={updateOption}
            removeOption={removeOption}
            handleCreateField={handleCreateField}
            isCreating={createField.isPending}
            editingFieldId={editingFieldId}
            editingFieldName={editingFieldName}
            setEditingFieldId={setEditingFieldId}
            setEditingFieldName={setEditingFieldName}
            handleRenameField={handleRenameField}
            isRenaming={updateField.isPending}
            setDeleteConfirmFieldId={setDeleteConfirmFieldId}
            onNavigateToSettings={onNavigateToSettings}
            setIsDropdownOpen={setIsDropdownOpen}
          />
        )}

        {/* Delete confirmation modal */}
        {deleteConfirmFieldId && (
          <DeleteConfirmModal
            fieldId={deleteConfirmFieldId}
            onCancel={() => setDeleteConfirmFieldId(null)}
            onConfirm={() => handleDeleteField(deleteConfirmFieldId)}
            isDeleting={deleteField.isPending}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Field values list */}
      {definitions.map((field) => (
        <CustomFieldInput
          key={field.id}
          field={field}
          value={valueMap.get(field.id)}
          onChange={(val) => handleValueChange(field.id, val)}
          isSaving={setFieldValue.isPending}
        />
      ))}

      {/* Manage button with dropdown */}
      <div className="relative pt-2" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600"
        >
          <Settings size={12} />
          Manage
        </button>

        {isDropdownOpen && (
          <FieldManagementDropdown
            definitions={definitions}
            newFieldName={newFieldName}
            setNewFieldName={setNewFieldName}
            newFieldType={newFieldType}
            setNewFieldType={setNewFieldType}
            newFieldOptions={newFieldOptions}
            addOption={addOption}
            updateOption={updateOption}
            removeOption={removeOption}
            handleCreateField={handleCreateField}
            isCreating={createField.isPending}
            editingFieldId={editingFieldId}
            editingFieldName={editingFieldName}
            setEditingFieldId={setEditingFieldId}
            setEditingFieldName={setEditingFieldName}
            handleRenameField={handleRenameField}
            isRenaming={updateField.isPending}
            setDeleteConfirmFieldId={setDeleteConfirmFieldId}
            onNavigateToSettings={onNavigateToSettings}
            setIsDropdownOpen={setIsDropdownOpen}
          />
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmFieldId && (
        <DeleteConfirmModal
          fieldId={deleteConfirmFieldId}
          onCancel={() => setDeleteConfirmFieldId(null)}
          onConfirm={() => handleDeleteField(deleteConfirmFieldId)}
          isDeleting={deleteField.isPending}
        />
      )}
    </div>
  );
});

CustomFieldsSection.displayName = 'CustomFieldsSection';

interface CustomFieldInputProps {
  field: CustomFieldDefinition;
  value?: CustomFieldValue;
  onChange: (value: CustomFieldFormValue) => void;
  isSaving: boolean;
}

const CustomFieldInput: React.FC<CustomFieldInputProps> = memo(({
  field,
  value,
  onChange,
  // isSaving can be used for loading states in the future
}) => {
  // Get the current value based on field type
  const getCurrentValue = useCallback((): CustomFieldFormValue => {
    if (!value) return null;
    switch (field.fieldType) {
      case 'text':
      case 'url':
      case 'single_select':
        return value.valueText ?? null;
      case 'number':
        return value.valueNumber ?? null;
      case 'date':
        return value.valueDate ?? null;
      case 'checkbox':
        return value.valueBoolean ?? false;
      case 'multi_select':
        return value.valueArray ?? [];
      default:
        return null;
    }
  }, [value, field.fieldType]);

  const [localValue, setLocalValue] = useState<CustomFieldFormValue>(getCurrentValue());
  const [isFocused, setIsFocused] = useState(false);

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(getCurrentValue());
  }, [getCurrentValue]);

  const handleBlur = () => {
    setIsFocused(false);
    const currentVal = getCurrentValue();
    if (localValue !== currentVal) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && field.fieldType !== 'multi_select') {
      e.preventDefault();
      onChange(localValue);
      (e.target as HTMLElement).blur();
    } else if (e.key === 'Escape') {
      setLocalValue(getCurrentValue());
      (e.target as HTMLElement).blur();
    }
  };

  const renderInput = () => {
    switch (field.fieldType) {
      case 'text':
      case 'url':
        return (
          <input
            type={field.fieldType === 'url' ? 'url' : 'text'}
            value={(localValue as string) || ''}
            onChange={(e) => setLocalValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={`Add ${field.name.toLowerCase()}...`}
            className={`flex-1 text-right text-sm font-medium px-2 py-1 rounded-md transition-all outline-none ${
              isFocused
                ? 'bg-blue-50 border border-blue-300'
                : 'bg-transparent border border-transparent hover:bg-slate-50'
            } ${localValue ? 'text-slate-700' : 'text-slate-400'}`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={localValue !== null ? String(localValue) : ''}
            onChange={(e) => setLocalValue(e.target.value ? Number(e.target.value) : null)}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="0"
            className={`flex-1 text-right text-sm font-medium px-2 py-1 rounded-md transition-all outline-none ${
              isFocused
                ? 'bg-blue-50 border border-blue-300'
                : 'bg-transparent border border-transparent hover:bg-slate-50'
            } ${localValue !== null ? 'text-slate-700' : 'text-slate-400'}`}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={(localValue as string) || ''}
            onChange={(e) => {
              setLocalValue(e.target.value || null);
              onChange(e.target.value || null);
            }}
            className={`flex-1 text-right text-sm font-medium px-2 py-1 rounded-md transition-all outline-none bg-transparent border border-transparent hover:bg-slate-50 ${
              localValue ? 'text-slate-700' : 'text-slate-400'
            }`}
          />
        );

      case 'checkbox':
        return (
          <button
            type="button"
            onClick={() => {
              const newVal = !localValue;
              setLocalValue(newVal);
              onChange(newVal);
            }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              localValue
                ? 'bg-pilot-blue border-pilot-blue text-white'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            {localValue && (
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        );

      case 'single_select':
        return (
          <select
            value={(localValue as string) || ''}
            onChange={(e) => {
              setLocalValue(e.target.value || null);
              onChange(e.target.value || null);
            }}
            className={`flex-1 text-right text-sm font-medium px-2 py-1 rounded-md transition-all outline-none bg-transparent border border-transparent hover:bg-slate-50 cursor-pointer ${
              localValue ? 'text-slate-700' : 'text-slate-400'
            }`}
          >
            <option value="">Select...</option>
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'multi_select': {
        const selectedValues = (localValue as string[]) || [];
        return (
          <div className="flex-1 flex flex-wrap justify-end gap-1">
            {field.options.map((opt) => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const newVals = isSelected
                      ? selectedValues.filter((v) => v !== opt.value)
                      : [...selectedValues, opt.value];
                    setLocalValue(newVals);
                    onChange(newVals);
                  }}
                  className={`px-2 py-0.5 text-xs font-medium rounded-full transition-all ${
                    isSelected
                      ? 'text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={isSelected ? { backgroundColor: opt.color || '#3B82F6' } : undefined}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-slate-500 flex-shrink-0 w-24 truncate" title={field.name}>
        {field.name}
        {field.isRequired && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      {renderInput()}
    </div>
  );
});

CustomFieldInput.displayName = 'CustomFieldInput';

// Field Management Dropdown Component
interface FieldManagementDropdownProps {
  definitions: CustomFieldDefinition[];
  newFieldName: string;
  setNewFieldName: (name: string) => void;
  newFieldType: CustomFieldType;
  setNewFieldType: (type: CustomFieldType) => void;
  newFieldOptions: SelectOption[];
  addOption: () => void;
  updateOption: (index: number, updates: Partial<SelectOption>) => void;
  removeOption: (index: number) => void;
  handleCreateField: () => void;
  isCreating: boolean;
  editingFieldId: string | null;
  editingFieldName: string;
  setEditingFieldId: (id: string | null) => void;
  setEditingFieldName: (name: string) => void;
  handleRenameField: (fieldId: string) => void;
  isRenaming: boolean;
  setDeleteConfirmFieldId: (id: string | null) => void;
  onNavigateToSettings?: () => void;
  setIsDropdownOpen: (open: boolean) => void;
}

const FieldManagementDropdown: React.FC<FieldManagementDropdownProps> = ({
  definitions,
  newFieldName,
  setNewFieldName,
  newFieldType,
  setNewFieldType,
  newFieldOptions,
  addOption,
  updateOption,
  removeOption,
  handleCreateField,
  isCreating,
  editingFieldId,
  editingFieldName,
  setEditingFieldId,
  setEditingFieldName,
  handleRenameField,
  isRenaming,
  setDeleteConfirmFieldId,
  onNavigateToSettings,
  setIsDropdownOpen,
}) => {
  const isSelectType = newFieldType === 'single_select' || newFieldType === 'multi_select';

  return (
    <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-200">
      {/* Create New Field Section */}
      <div className="p-3 border-b border-slate-100">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
          Create New Field
        </p>

        {/* Field name input */}
        <input
          type="text"
          value={newFieldName}
          onChange={(e) => setNewFieldName(e.target.value)}
          placeholder="Field name..."
          className="w-full px-3 py-1.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none mb-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isSelectType) handleCreateField();
          }}
        />

        {/* Type selector - compact grid */}
        <div className="grid grid-cols-4 gap-1 mb-2">
          {(Object.entries(FIELD_TYPE_CONFIG) as [CustomFieldType, { label: string; icon: React.ReactNode }][]).map(
            ([type, config]) => (
              <button
                key={type}
                type="button"
                onClick={() => setNewFieldType(type)}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors text-xs ${
                  newFieldType === type
                    ? 'bg-pilot-blue/10 text-pilot-blue border border-pilot-blue/30'
                    : 'hover:bg-slate-50 text-slate-500 border border-transparent'
                }`}
                title={config.label}
              >
                {config.icon}
                <span className="text-[9px] font-medium">{config.label}</span>
              </button>
            )
          )}
        </div>

        {/* Options editor for select types */}
        {isSelectType && (
          <div className="bg-slate-50 rounded-lg p-2 mb-2 space-y-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Options</p>
            {newFieldOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="color"
                  value={option.color || PRESET_COLORS[0]}
                  onChange={(e) => updateOption(index, { color: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={option.label}
                  onChange={(e) => updateOption(index, { label: e.target.value })}
                  placeholder="Option label"
                  className="flex-1 px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                />
                <button
                  onClick={() => removeOption(index)}
                  className="p-1 text-slate-400 hover:text-rose-500"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={addOption}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
            >
              <Plus size={12} />
              Add Option
            </button>
          </div>
        )}

        {/* Create button */}
        <button
          onClick={handleCreateField}
          disabled={!newFieldName.trim() || isCreating}
          className="w-full py-2 px-4 rounded-lg bg-pilot-blue text-white text-sm font-medium hover:bg-pilot-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? 'Creating...' : 'Create Field'}
        </button>
      </div>

      {/* Existing Fields Section */}
      {definitions.length > 0 && (
        <div className="p-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Existing Fields
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {definitions.map((field) => (
              <FieldListItem
                key={field.id}
                field={field}
                isEditing={editingFieldId === field.id}
                editingName={editingFieldName}
                onStartEdit={() => {
                  setEditingFieldId(field.id);
                  setEditingFieldName(field.name);
                }}
                onCancelEdit={() => {
                  setEditingFieldId(null);
                  setEditingFieldName('');
                }}
                onNameChange={setEditingFieldName}
                onSaveEdit={() => handleRenameField(field.id)}
                onDelete={() => setDeleteConfirmFieldId(field.id)}
                isRenaming={isRenaming}
              />
            ))}
          </div>
        </div>
      )}

      {/* Settings link */}
      {onNavigateToSettings && (
        <div className="p-3 pt-0 border-t border-slate-100">
          <button
            onClick={() => {
              setIsDropdownOpen(false);
              onNavigateToSettings();
            }}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 py-2"
          >
            <Settings size={12} />
            Advanced Settings
          </button>
        </div>
      )}
    </div>
  );
};

// Field List Item Component
interface FieldListItemProps {
  field: CustomFieldDefinition;
  isEditing: boolean;
  editingName: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onNameChange: (name: string) => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  isRenaming: boolean;
}

const FieldListItem: React.FC<FieldListItemProps> = ({
  field,
  isEditing,
  editingName,
  onStartEdit,
  onCancelEdit,
  onNameChange,
  onSaveEdit,
  onDelete,
  isRenaming,
}) => {
  const TypeIcon = FIELD_TYPE_CONFIG[field.fieldType].icon;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 group">
      <span className="text-slate-400 flex-shrink-0">{TypeIcon}</span>

      {isEditing ? (
        <>
          <input
            type="text"
            value={editingName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            className="flex-1 px-2 py-1 text-sm bg-white border border-slate-200 rounded focus:ring-2 focus:ring-blue-500/20 outline-none"
            autoFocus
          />
          <button
            onClick={onSaveEdit}
            disabled={isRenaming}
            className="p-1 text-emerald-500 hover:bg-emerald-50 rounded disabled:opacity-50"
          >
            <Check size={14} />
          </button>
          <button
            onClick={onCancelEdit}
            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
          >
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium text-slate-700 truncate">
            {field.name}
          </span>
          <button
            onClick={onStartEdit}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Rename"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </>
      )}
    </div>
  );
};

// Delete Confirmation Modal Component
interface DeleteConfirmModalProps {
  fieldId: string;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  fieldId,
  onCancel,
  onConfirm,
  isDeleting,
}) => {
  const { user } = useAuth();
  const { data: hasValues, isLoading } = useCustomFieldHasValues(user?.id, fieldId);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Custom Field</h3>
              {isLoading ? (
                <p className="text-sm text-gray-600">Checking for existing data...</p>
              ) : hasValues ? (
                <p className="text-sm text-gray-600">
                  This field has values on existing leads. Deleting it will{' '}
                  <span className="font-medium text-red-600">permanently remove all data</span> for this field.
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete this field? This action cannot be undone.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Field'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomFieldsSection;
