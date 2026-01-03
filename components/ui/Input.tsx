import React, { forwardRef } from 'react';
import { inputStyles, radius, transitions } from '../../lib/designTokens';
import type { Radius } from '../../lib/designTokens';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  error?: boolean;
  rounded?: Radius;
  inputSize?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'py-2 text-sm',
  md: 'py-3 text-base',
  lg: 'py-4 text-base',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      icon,
      iconPosition = 'left',
      error = false,
      rounded = 'sm',
      inputSize = 'md',
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const hasLeftIcon = icon && iconPosition === 'left';
    const hasRightIcon = icon && iconPosition === 'right';

    const inputClasses = [
      inputStyles.base,
      inputStyles.focus,
      error ? inputStyles.error : '',
      disabled ? inputStyles.disabled : '',
      radius[rounded],
      transitions.fast,
      sizeClasses[inputSize],
      hasLeftIcon ? 'pl-12' : 'pl-4',
      hasRightIcon ? 'pr-12' : 'pr-4',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="relative">
        {hasLeftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={inputClasses}
          {...props}
        />
        {hasRightIcon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea variant
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  rounded?: Radius;
  showCharCount?: boolean;
  maxLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      error = false,
      rounded = 'sm',
      showCharCount = false,
      maxLength,
      disabled,
      className = '',
      value,
      ...props
    },
    ref
  ) => {
    const charCount = typeof value === 'string' ? value.length : 0;

    const textareaClasses = [
      inputStyles.base,
      inputStyles.focus,
      error ? inputStyles.error : '',
      disabled ? inputStyles.disabled : '',
      radius[rounded],
      transitions.fast,
      'p-4 min-h-[120px] resize-y',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="relative">
        <textarea
          ref={ref}
          disabled={disabled}
          value={value}
          maxLength={maxLength}
          className={textareaClasses}
          {...props}
        />
        {showCharCount && maxLength && (
          <div className="absolute bottom-3 right-3 text-xs text-gray-400">
            {charCount}/{maxLength}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Select variant
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  rounded?: Radius;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      error = false,
      rounded = 'sm',
      inputSize = 'md',
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const selectClasses = [
      inputStyles.base,
      inputStyles.focus,
      error ? inputStyles.error : '',
      disabled ? inputStyles.disabled : '',
      radius[rounded],
      transitions.fast,
      sizeClasses[inputSize],
      'px-4 pr-10 appearance-none cursor-pointer',
      'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2394a3b8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <select ref={ref} disabled={disabled} className={selectClasses} {...props}>
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';

// Label component
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({
  required = false,
  className = '',
  children,
  ...props
}) => (
  <label
    className={`block text-sm font-medium text-gray-700 mb-1.5 ${className}`}
    {...props}
  >
    {children}
    {required && <span className="text-rose-500 ml-0.5">*</span>}
  </label>
);

// Form field wrapper with label and error
export interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  hint,
  children,
  className = '',
}) => (
  <div className={`space-y-1 ${className}`}>
    {label && <Label required={required}>{label}</Label>}
    {children}
    {error && <p className="text-sm text-rose-500">{error}</p>}
    {hint && !error && <p className="text-sm text-gray-500">{hint}</p>}
  </div>
);
