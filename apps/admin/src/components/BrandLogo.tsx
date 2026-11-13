import React from 'react';
import logoDark from '../assets/brand/logo-dark.png';
import logoLight from '../assets/brand/logo-light.png';

interface BrandLogoProps {
  size?: number;
  darkSurface?: boolean;
  className?: string;
  subtitle?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 34,
  darkSurface = false,
  className = '',
  subtitle,
}) => {
  const currentLogoSrc = darkSurface ? logoDark : logoLight;
  const height = size;
  const width = Math.round(size * (624 / 219));

  return (
    <div className={`inline-flex flex-col select-none ${className}`}>
      <img
        src={currentLogoSrc}
        alt="ilmçi"
        style={{ height: `${height}px`, width: `${width}px` }}
        className="object-contain block shrink-0"
        loading="eager"
      />
      {subtitle && (
        <span className="text-[9px] font-black tracking-widest uppercase text-indigo-500 mt-1 pl-1 leading-none">
          {subtitle}
        </span>
      )}
    </div>
  );
};
