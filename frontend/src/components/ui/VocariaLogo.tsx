import React from 'react';

interface Props {
  size?: number; // size of the container squircle
  animated?: boolean;
  withText?: boolean;
  textColor?: string;
  onClick?: () => void;
  className?: string;
}

export function VocariaLogo({ 
  size = 36, 
  animated = true, 
  withText = false, 
  textColor = 'black',
  onClick,
  className = ''
}: Props) {
  const heights = [0.35, 0.65, 0.85, 0.55, 0.35];
  const innerSize = size * 0.55;
  
  return (
    <div onClick={onClick} className={`flex items-center gap-3 ${onClick ? 'cursor-pointer group' : ''} ${className}`}>
      <div 
        className="relative flex items-center justify-center transition-transform group-hover:scale-105 shrink-0"
        style={{ 
          width: size, 
          height: size, 
          borderRadius: size * 0.35, 
          background: '#050505', 
          boxShadow: '0 0 0 1.5px rgba(124, 58, 237, 0.5), inset 0 0 12px rgba(124, 58, 237, 0.2)' 
        }}
      >
        <div className="flex items-center justify-center" style={{ gap: Math.max(1.5, innerSize * 0.15), width: innerSize, height: innerSize }}>
          {heights.map((h, i) => (
            <div
              key={i}
              className={animated ? 'vocaria-bar' : ''}
              style={{ 
                width: Math.max(1.5, innerSize * 0.18), 
                height: innerSize * h, 
                background: 'white', 
                borderRadius: 999, 
                animationDelay: `${i * 0.15}s` 
              }}
            />
          ))}
        </div>
      </div>
      
      {withText && (
        <div className="hidden sm:flex items-baseline">
          <span className="font-extrabold tracking-tight" style={{ color: textColor, fontSize: size * 0.55, fontFamily: 'Inter, sans-serif' }}>Vocaria</span>
          <span className="font-extrabold text-[#7c3aed] ml-[2px] mb-[-2px]" style={{ fontSize: size * 0.55 }}>.</span>
        </div>
      )}
    </div>
  );
}
