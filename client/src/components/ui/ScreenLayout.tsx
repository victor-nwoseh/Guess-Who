import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ScreenLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function ScreenLayout({ children, className = '' }: ScreenLayoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={`min-h-[100dvh] w-full bg-primary flex flex-col relative
        safe-area-inset ${className}`}
    >
      {children}
    </motion.div>
  );
}
