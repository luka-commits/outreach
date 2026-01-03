import React, { useRef, useState, useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame
} from "framer-motion";

/**
 * Helper component for the SVG grid pattern.
 */
const GridPattern = ({ offsetX, offsetY, size }: { offsetX: ReturnType<typeof useMotionValue<number>>; offsetY: ReturnType<typeof useMotionValue<number>>; size: number }) => {
  return (
    <svg className="w-full h-full">
      <defs>
        <motion.pattern
          id="grid-pattern-bg"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d={`M ${size} 0 L 0 0 0 ${size}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-slate-400"
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern-bg)" />
    </svg>
  );
};

/**
 * Static fallback for mobile - just decorative blur spheres without animations
 */
const StaticBackground: React.FC = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
    <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white" />
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute right-[-20%] top-[-20%] w-[40%] h-[40%] rounded-full bg-orange-500/20 blur-[120px]" />
      <div className="absolute right-[10%] top-[-10%] w-[20%] h-[20%] rounded-full bg-blue-500/15 blur-[100px]" />
      <div className="absolute left-[-10%] bottom-[-20%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="absolute left-[30%] top-[40%] w-[25%] h-[25%] rounded-full bg-purple-500/10 blur-[100px]" />
    </div>
  </div>
);

/**
 * Infinite Grid Background Component
 * A fixed background layer with scrolling grid and mouse-reveal effect.
 * On mobile, renders a static gradient instead to improve performance.
 */
export const InfiniteGridBackground: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const gridSize = 40;
  const containerRef = useRef<HTMLDivElement>(null);

  // All hooks must be called before any conditional returns
  // Track mouse position with Motion Values for performance
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Grid offsets for infinite scroll animation
  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  // Create a dynamic radial mask for the "flashlight" effect
  const maskImage = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const speedX = 0.3;
  const speedY = 0.3;

  useAnimationFrame(() => {
    if (isMobile) return; // Skip animation on mobile
    const currentX = gridOffsetX.get();
    const currentY = gridOffsetY.get();
    gridOffsetX.set((currentX + speedX) % gridSize);
    gridOffsetY.set((currentY + speedY) % gridSize);
  });

  // Return static background on mobile for performance
  if (isMobile) {
    return <StaticBackground />;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Layer 1: Subtle background grid (always visible) */}
      <div className="absolute inset-0 opacity-[0.03]">
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} size={gridSize} />
      </div>

      {/* Layer 2: Highlighted grid (revealed by mouse mask) */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} size={gridSize} />
      </motion.div>

      {/* Decorative Blur Spheres */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute right-[-20%] top-[-20%] w-[40%] h-[40%] rounded-full bg-orange-500/20 blur-[120px]" />
        <div className="absolute right-[10%] top-[-10%] w-[20%] h-[20%] rounded-full bg-blue-500/15 blur-[100px]" />
        <div className="absolute left-[-10%] bottom-[-20%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute left-[30%] top-[40%] w-[25%] h-[25%] rounded-full bg-purple-500/10 blur-[100px]" />
      </div>
    </div>
  );
};

export default InfiniteGridBackground;
