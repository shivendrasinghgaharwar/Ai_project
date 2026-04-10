import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimatedClickWrapperProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedClickWrapper({ children, onClick, className = '', style }: AnimatedClickWrapperProps) {
  return (
    <motion.div
      onClick={onClick}
      className={className}
      style={{ cursor: 'pointer', ...style }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ 
        scale: 0.96, 
        opacity: 0.8,
        filter: 'brightness(0.95)'
      }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 17 
      }}
    >
      {children}
    </motion.div>
  );
}
