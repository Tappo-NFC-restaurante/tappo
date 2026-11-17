import React from 'react';

interface TappoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'white' | 'red';
  showSubtitle?: boolean;
  className?: string;
}

export const TappoLogo: React.FC<TappoLogoProps> = ({
  size = 'md',
  variant = 'white',
  showSubtitle = false,
  className = '',
}) => {
  const sizeMap = {
    sm: { text: 'text-base', dot: 'w-1.5 h-1.5' },
    md: { text: 'text-xl', dot: 'w-2 h-2' },
    lg: { text: 'text-2xl', dot: 'w-2.5 h-2.5' },
    xl: { text: 'text-3xl', dot: 'w-3 h-3' },
  };

  const currentSize = sizeMap[size];
  const colorClass = variant === 'red' ? 'text-tappo-red' : 'text-white';
  const dotColor = variant === 'red' ? 'bg-tappo-red' : 'bg-white';

  return (
    <div className={`inline-flex items-center gap-1.5 select-none font-sans ${className}`}>
      <span
        className={`font-black tracking-tight ${currentSize.text} ${colorClass} lowercase`}
        style={{ letterSpacing: '-0.04em' }}
      >
        tappo
      </span>
      {/* Símbolo minimalista NFC (ponto indicador sólido) */}
      <span className={`${currentSize.dot} rounded-full ${dotColor} opacity-90`} />

      {showSubtitle && (
        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider ml-1">
          NFC
        </span>
      )}
    </div>
  );
};

export default TappoLogo;
