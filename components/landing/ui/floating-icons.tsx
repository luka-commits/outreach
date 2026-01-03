import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Instagram, Linkedin, Mail, Phone, MessageCircle, Facebook, Twitter, Send } from 'lucide-react';

interface IconConfig {
  icon: React.ReactNode;
  bgColor: string;
  initialXPercent: number;
  initialYPercent: number;
  velocityX: number;
  velocityY: number;
}

interface BouncingIconProps extends IconConfig {
  containerWidth: number;
  containerHeight: number;
}

const BouncingIcon: React.FC<BouncingIconProps> = ({
  icon,
  bgColor,
  initialXPercent,
  initialYPercent,
  velocityX: initialVelX,
  velocityY: initialVelY,
  containerWidth,
  containerHeight,
}) => {
  const iconSize = 56;
  const [position, setPosition] = useState({
    x: containerWidth * initialXPercent,
    y: containerHeight * initialYPercent,
  });
  const [velocity, setVelocity] = useState({ x: initialVelX, y: initialVelY });

  useEffect(() => {
    // Reset position when container size changes
    setPosition({
      x: Math.min(containerWidth * initialXPercent, containerWidth - iconSize),
      y: Math.min(containerHeight * initialYPercent, containerHeight - iconSize),
    });
  }, [containerWidth, containerHeight, initialXPercent, initialYPercent]);

  useEffect(() => {
    const animate = () => {
      setPosition((prev) => {
        let newX = prev.x + velocity.x;
        let newY = prev.y + velocity.y;
        let newVelX = velocity.x;
        let newVelY = velocity.y;

        const maxX = containerWidth - iconSize;
        const maxY = containerHeight - iconSize;

        if (newX <= 0 || newX >= maxX) {
          newVelX = -velocity.x;
          newX = newX <= 0 ? 0 : maxX;
        }
        if (newY <= 0 || newY >= maxY) {
          newVelY = -velocity.y;
          newY = newY <= 0 ? 0 : maxY;
        }

        if (newVelX !== velocity.x || newVelY !== velocity.y) {
          setVelocity({ x: newVelX, y: newVelY });
        }

        return { x: newX, y: newY };
      });
    };

    const intervalId = setInterval(animate, 16);
    return () => clearInterval(intervalId);
  }, [velocity, containerWidth, containerHeight]);

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        width: iconSize,
        height: iconSize,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className={`w-full h-full ${bgColor} rounded-2xl shadow-lg flex items-center justify-center`}
      >
        {icon}
      </div>
    </motion.div>
  );
};

export const FloatingIcons: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const icons: IconConfig[] = [
    {
      icon: <Instagram className="w-7 h-7 text-white" />,
      bgColor: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
      initialXPercent: 0.05,
      initialYPercent: 0.15,
      velocityX: 1.1,
      velocityY: 0.7,
    },
    {
      icon: <Linkedin className="w-7 h-7 text-white" />,
      bgColor: "bg-[#0A66C2]",
      initialXPercent: 0.88,
      initialYPercent: 0.1,
      velocityX: -0.8,
      velocityY: 1.0,
    },
    {
      icon: <Mail className="w-7 h-7 text-white" />,
      bgColor: "bg-[#EA4335]",
      initialXPercent: 0.03,
      initialYPercent: 0.55,
      velocityX: 0.9,
      velocityY: -0.6,
    },
    {
      icon: <Phone className="w-7 h-7 text-white" />,
      bgColor: "bg-[#25D366]",
      initialXPercent: 0.92,
      initialYPercent: 0.45,
      velocityX: -1.0,
      velocityY: 0.8,
    },
    {
      icon: <Facebook className="w-7 h-7 text-white" />,
      bgColor: "bg-[#1877F2]",
      initialXPercent: 0.08,
      initialYPercent: 0.78,
      velocityX: 0.7,
      velocityY: -0.9,
    },
    {
      icon: <Twitter className="w-7 h-7 text-white" />,
      bgColor: "bg-[#1DA1F2]",
      initialXPercent: 0.85,
      initialYPercent: 0.7,
      velocityX: -0.65,
      velocityY: -0.85,
    },
    {
      icon: <MessageCircle className="w-7 h-7 text-white" />,
      bgColor: "bg-gradient-to-r from-[#0088CC] to-[#00C6FF]",
      initialXPercent: 0.45,
      initialYPercent: 0.08,
      velocityX: 0.55,
      velocityY: 1.1,
    },
    {
      icon: <Send className="w-7 h-7 text-white" />,
      bgColor: "bg-[#0088CC]",
      initialXPercent: 0.25,
      initialYPercent: 0.35,
      velocityX: -0.75,
      velocityY: -0.65,
    },
  ];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 1 }}
    >
      {dimensions.width > 0 &&
        icons.map((iconConfig, index) => (
          <BouncingIcon
            key={index}
            {...iconConfig}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
          />
        ))}
    </div>
  );
};

export default FloatingIcons;
