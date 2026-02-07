import React from "react";

interface ShinyTextProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  as?: React.ElementType;
}

const ShinyText: React.FC<ShinyTextProps> = ({
  children,
  className = '',
  speed = 3,
  as: Component = 'span',
}) => {
  return (
    <Component
      className={`relative inline-block ${className}`}
      style={{ position: 'relative' }}
    >
      <span className="relative z-10">{children}</span>

      <span
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background:
            'linear-gradient(120deg, transparent 0%, transparent 40%, rgba(255,255,255,0.9) 50%, transparent 60%, transparent 100%)',
          backgroundSize: '200% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: '0% 50%',
          animation: `shine ${speed}s linear infinite`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          color: 'transparent',
          mixBlendMode: 'screen',
          opacity: 0.9,
          filter: 'brightness(1.1)'
        }}
      />
    </Component>
  );
};

export default ShinyText;

