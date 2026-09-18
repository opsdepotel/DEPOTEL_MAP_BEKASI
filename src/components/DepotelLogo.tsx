import React from 'react';

interface DepotelLogoProps {
  className?: string;
  height?: number;
}

export const DepotelLogo: React.FC<DepotelLogoProps> = ({ className = '', height = 32 }) => {
  return (
    <div className={`inline-flex items-center px-3 py-1 bg-white rounded-lg shadow-sm border border-slate-200/80 transition-transform hover:scale-105 ${className}`}>
      <img
        src="/DEPOTEL_rounded22.jpg"
        alt="DEPOTEL Logo"
        style={{ height: `${height}px`, width: 'auto' }}
        className="object-contain max-w-full"
      />
    </div>
  );
};

