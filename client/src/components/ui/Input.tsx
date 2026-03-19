import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = '', id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-neutral-300">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`min-h-[44px] px-4 py-3 rounded-xl bg-white/10 border border-white/20
          text-[16px] text-white placeholder-neutral-400
          focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
          transition-all ${className}`}
        {...props}
      />
    </div>
  );
}
