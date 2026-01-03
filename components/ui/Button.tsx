import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { buttonVariants, buttonSizes, radius, transitions } from '../../lib/designTokens';
import type { ButtonVariant, ButtonSize, Radius } from '../../lib/designTokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  rounded?: Radius;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      rounded = 'sm',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseClasses = [
      'inline-flex items-center justify-center gap-2',
      'font-medium',
      'transition-all',
      transitions.fast,
      radius[rounded],
      buttonVariants[variant],
      buttonSizes[size],
      fullWidth ? 'w-full' : '',
      isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={baseClasses}
        {...props}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : icon && iconPosition === 'left' ? (
          icon
        ) : null}
        {children}
        {!loading && icon && iconPosition === 'right' ? icon : null}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Icon-only button variant
export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon' | 'iconPosition'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'md', rounded = 'full', className = '', icon, ...props }, ref) => {
    // Adjust padding for icon-only buttons
    const iconSizes = {
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-2.5',
      xl: 'p-3',
    };

    return (
      <Button
        ref={ref}
        size={size}
        rounded={rounded}
        className={`${iconSizes[size]} ${className}`}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';
