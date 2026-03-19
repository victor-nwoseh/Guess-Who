import { motion } from 'framer-motion';
import type { ReactNode, MouseEventHandler } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-accent text-primary-dark font-semibold hover:bg-accent-light active:bg-accent-dark',
  secondary:
    'bg-primary-light text-white font-semibold hover:bg-primary active:bg-primary-dark',
  ghost:
    'bg-transparent text-neutral-300 hover:text-white hover:bg-white/10',
};

export default function Button({
  variant = 'primary',
  children,
  className = '',
  disabled,
  onClick,
  type = 'button',
}: ButtonProps) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.96 }}
      className={`min-h-[44px] px-6 py-3 rounded-xl text-base transition-colors cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </motion.button>
  );
}
