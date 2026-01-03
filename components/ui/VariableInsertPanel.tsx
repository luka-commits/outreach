import React from 'react';
import { User, MapPin, Briefcase, Globe, Puzzle } from 'lucide-react';
import type { CustomFieldDefinition } from '../../types';

interface VariableDefinition {
  key: string;
  label: string;
  example?: string;
}

interface VariableCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  variables: VariableDefinition[];
}

// Standard lead fields organized by category
const STANDARD_CATEGORIES: VariableCategory[] = [
  {
    id: 'contact',
    label: 'Contact',
    icon: <User size={14} />,
    variables: [
      { key: 'companyName', label: 'Company Name', example: 'Acme Corp' },
      { key: 'contactName', label: 'Contact Name', example: 'John Smith' },
      { key: 'email', label: 'Email', example: 'john@acme.com' },
      { key: 'phone', label: 'Phone', example: '(555) 123-4567' },
      { key: 'ownerTitle', label: 'Title', example: 'CEO' },
    ],
  },
  {
    id: 'location',
    label: 'Location',
    icon: <MapPin size={14} />,
    variables: [
      { key: 'location', label: 'City', example: 'San Francisco' },
      { key: 'address', label: 'Address', example: '123 Main St' },
      { key: 'zipCode', label: 'ZIP Code', example: '94102' },
      { key: 'country', label: 'Country', example: 'USA' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    icon: <Briefcase size={14} />,
    variables: [
      { key: 'niche', label: 'Niche', example: 'SaaS' },
      { key: 'category', label: 'Category', example: 'Technology' },
      { key: 'googleRating', label: 'Rating', example: '4.5' },
      { key: 'googleReviewCount', label: 'Reviews', example: '127' },
    ],
  },
  {
    id: 'social',
    label: 'Social',
    icon: <Globe size={14} />,
    variables: [
      { key: 'websiteUrl', label: 'Website', example: 'https://acme.com' },
      { key: 'instagramUrl', label: 'Instagram', example: '@acmecorp' },
      { key: 'linkedinUrl', label: 'LinkedIn', example: 'linkedin.com/...' },
      { key: 'facebookUrl', label: 'Facebook', example: 'facebook.com/...' },
    ],
  },
];

interface VariableChipProps {
  variable: VariableDefinition;
  onInsert: (key: string) => void;
}

function VariableChip({ variable, onInsert }: VariableChipProps) {
  return (
    <button
      type="button"
      onClick={() => onInsert(variable.key)}
      className="inline-flex items-center gap-1 px-2 py-1
                 bg-white hover:bg-blue-50
                 border border-slate-200 hover:border-blue-300
                 rounded-md text-xs font-medium text-slate-600 hover:text-blue-600
                 transition-all duration-150 cursor-pointer"
      title={variable.example ? `Example: ${variable.example}` : undefined}
    >
      <span className="text-slate-400">{'{'}</span>
      {variable.label}
      <span className="text-slate-400">{'}'}</span>
    </button>
  );
}

interface CategorySectionProps {
  category: VariableCategory;
  onInsert: (key: string) => void;
}

function CategorySection({ category, onInsert }: CategorySectionProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        {category.icon}
        <span>{category.label}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {category.variables.map((v) => (
          <VariableChip key={v.key} variable={v} onInsert={onInsert} />
        ))}
      </div>
    </div>
  );
}

export interface VariableInsertPanelProps {
  onInsert: (variableKey: string) => void;
  customFields?: CustomFieldDefinition[];
  className?: string;
}

export function VariableInsertPanel({
  onInsert,
  customFields,
  className = '',
}: VariableInsertPanelProps) {
  // Build custom fields category if there are any
  const customCategory: VariableCategory | null =
    customFields && customFields.length > 0
      ? {
          id: 'custom',
          label: 'Custom Fields',
          icon: <Puzzle size={14} />,
          variables: customFields.map((cf) => ({
            key: cf.fieldKey,
            label: cf.name,
          })),
        }
      : null;

  const allCategories = customCategory
    ? [...STANDARD_CATEGORIES, customCategory]
    : STANDARD_CATEGORIES;

  return (
    <div
      className={`bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3 ${className}`}
    >
      <div className="text-xs text-slate-500 mb-2">
        Click a variable to insert it at cursor position
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allCategories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            onInsert={onInsert}
          />
        ))}
      </div>
    </div>
  );
}

export default VariableInsertPanel;
