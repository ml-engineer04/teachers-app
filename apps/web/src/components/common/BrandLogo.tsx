import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import logoDark from '../../assets/brand/logo-dark.png';
import logoLight from '../../assets/brand/logo-light.png';

interface BrandLogoProps {
  size?: number; // Height in px (e.g. 32, 36, 44, 48)
  darkSurface?: boolean;
  className?: string;
  subtitle?: string;
}

/**
 * Official ilmçi Logo (Emblem + ILMÇI Wordmark together)
 * Automatically adapts between Light mode and Dark mode using the user-provided brand assets.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 36,
  darkSurface,
  className = '',
  subtitle,
}) => {
  const { isDark } = useTheme();
  const isLightText = darkSurface !== undefined ? darkSurface : isDark;
  const currentLogoSrc = isLightText ? logoDark : logoLight;

  // Exact aspect ratio from user image: 624 / 219 ≈ 2.85
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
        <span className="text-[9px] font-black tracking-widest uppercase text-indigo-500 dark:text-indigo-400 mt-1 pl-1 leading-none">
          {subtitle}
        </span>
      )}
    </div>
  );
};
