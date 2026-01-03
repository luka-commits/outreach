import React, { useState } from 'react';
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Type,
  Hash,
  Calendar,
  ChevronDown,
  CheckSquare,
  Link,
  List,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import {
  useCustomFieldDefinitionsQuery,
  useCreateCustomFieldDefinition,
  useUpdateCustomFieldDefinition,
  useDeleteCustomFieldDefinition,
  useReorderCustomFieldDefinitions,
  useCustomFieldHasValues,
} from '../../hooks/queries';
import { useToast } from '../Toast';
import { getErrorMessage } from '../../utils/errorMessages';
import { radius, transitions, inputStyles, modalStyles, cardStyles } from '../../lib/designTokens';
import type { CustomFieldDefinition, CustomFieldType, SelectOption } from '../../types';

const FIELD_TYPE_CONFIG: Record<CustomFieldType, { label: string; icon: React.ReactNode; description: string }> = {
  text: { label: 'Text', icon: <Type size={16} />, description: 'Single line of text' },
  number: { label: 'Number', icon: <Hash size={16} />, description: 'Numeric value' },
  date: { label: 'Date', icon: <Calendar size={16} />, description: 'Date picker' },
  single_select: { label: 'Single Select', icon: <ChevronDown size={16} />, description: 'Dropdown with one choice' },
  multi_select: { label: 'Multi Select', icon: <List size={16} />, description: 'Multiple choices allowed' },
  checkbox: { label: 'Checkbox', icon: <CheckSquare size={16} />, description: 'Yes/No toggle' },
  url: { label: 'URL', icon: <Link size={16} />, description: 'Web link' },
};

const PRESET_COLORS = [
  '#6B7280', // gray
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
];

interface FieldFormData {
  name: string;
  fieldType: CustomFieldType;
  isRequired: boolean;
  options: SelectOption[];
  showInList: boolean;
  showInFilters: boolean;
}

const CustomFieldsTab: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const { showToast } = useToast();

  const { data: fields = [], isLoading } = useCustomFieldDefinitionsQuery(userId);
  const createField = useCreateCustomFieldDefinition(userId);
  const updateField = useUpdateCustomFieldDefinition(userId);
  const deleteField = useDeleteCustomFieldDefinition(userId);
  const reorderFields = useReorderCustomFieldDefinitions(userId);

  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [formData, setFormData] = useState<FieldFormData>({
    name: '',
    fieldType: 'text',
    isRequired: false,
    options: [],
    showInList: false,
    showInFilters: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      fieldType: 'text',
      isRequired: false,
      options: [],
      showInList: false,
      showInFilters: true,
    });
    setEditingField(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      options: field.options,
      showInList: field.showInList,
      showInFilters: field.showInFilters,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('Field name is required', 'error');
      return;
    }

    if ((formData.fieldType === 'single_select' || formData.fieldType === 'multi_select') && formData.options.length === 0) {
      showToast('Add at least one option for select fields', 'error');
      return;
    }

    if (editingField) {
      updateField.mutate(
        {
          fieldId: editingField.id,
          updates: {
            name: formData.name,
            isRequired: formData.isRequired,
            options: formData.options,
            showInList: formData.showInList,
            showInFilters: formData.showInFilters,
          },
        },
        {
          onSuccess: () => {
            showToast('Field updated', 'success');
            setShowModal(false);
            resetForm();
          },
          onError: (error) => showToast(getErrorMessage(error), 'error'),
        }
      );
    } else {
      createField.mutate(
        {
          name: formData.name,
          fieldType: formData.fieldType,
          isRequired: formData.isRequired,
          options: formData.options,
          showInList: formData.showInList,
          showInFilters: formData.showInFilters,
        },
        {
          onSuccess: () => {
            showToast('Field created', 'success');
            setShowModal(false);
            resetForm();
          },
          onError: (error) => showToast(getErrorMessage(error), 'error'),
        }
      );
    }
  };

  const handleDelete = (fieldId: string) => {
    deleteField.mutate(fieldId, {
      onSuccess: () => {
        showToast('Field deleted', 'success');
        setDeleteConfirmId(null);
      },
      onError: (error) => showToast(getErrorMessage(error), 'error'),
    });
  };

  const handleDragStart = (fieldId: string) => {
    setDraggedId(fieldId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const currentOrder = fields.map((f) => f.id);
    const draggedIndex = currentOrder.indexOf(draggedId);
    const targetIndex = currentOrder.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedId);

    reorderFields.mutate(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const addOption = () => {
    const newValue = `option_${formData.options.length + 1}`;
    setFormData({
      ...formData,
      options: [
        ...formData.options,
        { value: newValue, label: `Option ${formData.options.length + 1}`, color: PRESET_COLORS[formData.options.length % PRESET_COLORS.length] },
      ],
    });
  };

  const updateOption = (index: number, updates: Partial<SelectOption>) => {
    const newOptions = [...formData.options];
    const current = newOptions[index];
    if (!current) return;
    // Keep value in sync with label for simplicity
    newOptions[index] = {
      value: updates.label ? updates.label.toLowerCase().replace(/\s+/g, '_') : current.value,
      label: updates.label ?? current.label,
      color: updates.color ?? current.color,
    };
    setFormData({ ...formData, options: newOptions });
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pilot-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Custom Fields</h2>
          <p className="text-sm text-gray-500 mt-1">
            Add custom fields to track additional information on your leads
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
          Add Field
        </Button>
      </div>

      {/* Fields List */}
      {fields.length === 0 ? (
        <div className={`${cardStyles.base} p-8 text-center`}>
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <List size={24} className="text-gray-400" />
          </div>
          <h3 className="text-gray-900 font-medium mb-1">No custom fields yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Create fields to track things like budget, company size, or deal stage
          </p>
          <Button variant="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
            Create Your First Field
          </Button>
        </div>
      ) : (
        <div className={`${cardStyles.base} divide-y divide-gray-100`}>
          {fields.map((field) => (
            <div
              key={field.id}
              draggable
              onDragStart={() => handleDragStart(field.id)}
              onDragOver={(e) => handleDragOver(e, field.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-4 p-4 ${transitions.fast} ${
                draggedId === field.id ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="cursor-grab text-gray-400 hover:text-gray-600">
                <GripVertical size={16} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">
                    {FIELD_TYPE_CONFIG[field.fieldType].icon}
                  </span>
                  <span className="font-medium text-gray-900 truncate">{field.name}</span>
                  {field.isRequired && (
                    <span className="text-xs text-red-500">Required</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{FIELD_TYPE_CONFIG[field.fieldType].label}</span>
                  {field.showInList && <span className="text-pilot-blue">Shown in list</span>}
                  {field.showInFilters && <span className="text-emerald-600">Filterable</span>}
                  {(field.fieldType === 'single_select' || field.fieldType === 'multi_select') && (
                    <span>{field.options.length} options</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(field)}
                  className={`p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 ${radius.sm} ${transitions.fast}`}
                  aria-label="Edit field"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleteConfirmId(field.id)}
                  className={`p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 ${radius.sm} ${transitions.fast}`}
                  aria-label="Delete field"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className={modalStyles.overlay} onClick={() => setShowModal(false)}>
          <div className={`${modalStyles.container} max-w-md`} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.header}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingField ? 'Edit Field' : 'Create Custom Field'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={`${modalStyles.body} space-y-4`}>
                {/* Field Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Budget, Company Size"
                    className={`${inputStyles.base} ${inputStyles.focus}`}
                    autoFocus
                  />
                </div>

                {/* Field Type (only for new fields) */}
                {!editingField && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Field Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(FIELD_TYPE_CONFIG) as [CustomFieldType, typeof FIELD_TYPE_CONFIG[CustomFieldType]][]).map(
                        ([type, config]) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFormData({ ...formData, fieldType: type, options: [] })}
                            className={`flex items-center gap-2 p-3 ${radius.sm} border ${transitions.fast} text-left ${
                              formData.fieldType === type
                                ? 'border-pilot-blue bg-pilot-blue/5 text-pilot-blue'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                          >
                            {config.icon}
                            <div>
                              <div className="text-sm font-medium">{config.label}</div>
                              <div className="text-xs text-gray-500">{config.description}</div>
                            </div>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Options for select types */}
                {(formData.fieldType === 'single_select' || formData.fieldType === 'multi_select') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options
                    </label>
                    <div className="space-y-2">
                      {formData.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="color"
                            value={option.color || PRESET_COLORS[0]}
                            onChange={(e) => updateOption(index, { color: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer border-0"
                          />
                          <input
                            type="text"
                            value={option.label}
                            onChange={(e) => updateOption(index, { label: e.target.value })}
                            placeholder="Option label"
                            className={`flex-1 ${inputStyles.base} ${inputStyles.focus}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="p-2 text-gray-400 hover:text-red-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={<Plus size={14} />}
                        onClick={addOption}
                      >
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}

                {/* Toggles */}
                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isRequired}
                      onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-pilot-blue focus:ring-pilot-blue"
                    />
                    <span className="text-sm text-gray-700">Required field</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showInList}
                      onChange={(e) => setFormData({ ...formData, showInList: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-pilot-blue focus:ring-pilot-blue"
                    />
                    <span className="text-sm text-gray-700">Show as column in lead list</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showInFilters}
                      onChange={(e) => setFormData({ ...formData, showInFilters: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-pilot-blue focus:ring-pilot-blue"
                    />
                    <span className="text-sm text-gray-700">Allow filtering by this field</span>
                  </label>
                </div>
              </div>

              <div className={modalStyles.footer}>
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={createField.isPending || updateField.isPending}
                >
                  {editingField ? 'Save Changes' : 'Create Field'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <DeleteConfirmModal
          fieldId={deleteConfirmId}
          onCancel={() => setDeleteConfirmId(null)}
          onConfirm={() => handleDelete(deleteConfirmId)}
          isDeleting={deleteField.isPending}
        />
      )}
    </div>
  );
};

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
    <div className={modalStyles.overlay} onClick={onCancel}>
      <div className={`${modalStyles.container} max-w-sm`} onClick={(e) => e.stopPropagation()}>
        <div className={modalStyles.body}>
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

        <div className={modalStyles.footer}>
          <Button variant="ghost" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={isDeleting}>
            Delete Field
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomFieldsTab;
