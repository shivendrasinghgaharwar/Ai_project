import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { ReactNode, MouseEvent } from 'react';

interface Hover3DCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Hover3DCard({ children, className = '', style }: Hover3DCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  // Soft, 5 degree max 3D tilt
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["3deg", "-3deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-3deg", "3deg"]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`card-glass ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.5 }}
    >
      <div style={{ transform: "translateZ(10px)", height: '100%' }}>
        {children}
      </div>
    </motion.div>
  );
}
