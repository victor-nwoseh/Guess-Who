import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'error' | 'accent';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-neutral-200',
  success: 'bg-success/20 text-success-light',
  error: 'bg-error/20 text-error-light',
  accent: 'bg-accent/20 text-accent-light',
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
