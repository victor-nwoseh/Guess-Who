import type { ReactNode } from 'react';

interface ScreenLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function ScreenLayout({ children, className = '' }: ScreenLayoutProps) {
  return (
    <div
      className={`min-h-[100dvh] w-full bg-primary flex flex-col relative
        px-4 py-6 safe-area-inset ${className}`}
    >
      {children}
    </div>
  );
}
