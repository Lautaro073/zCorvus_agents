"use client";

import { ZIcon } from '@zcorvus/z-icons/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconTypeInfo } from '@/types/icons/icons.types';
import { faSolidIcons, faRegularIcons } from '@/lib/fontawesome';
import { cn } from '@/lib/utils';

interface UnifiedIconProps extends Omit<IconTypeInfo, 'variant'> {
  variant?: string;
  className?: string;
  size?: number;
}

export const UnifiedIcon = ({ type, name, variant, className, size }: UnifiedIconProps) => {
  // Font Awesome icons
  if (type === 'fa-solid') {
    const icon = faSolidIcons[name as string];
    if (!icon) return null;
    return <FontAwesomeIcon icon={icon} className={cn(className)} style={{ width: size, height: size }} />;
  }

  if (type === 'fa-regular') {
    const icon = faRegularIcons[name as string];
    if (!icon) return null;
    return <FontAwesomeIcon icon={icon} className={cn(className)} style={{ width: size, height: size }} />;
  }

  // ZCorvus icons (core, neo, mina)
  return (
    <ZIcon
      type={type as any}
      name={name as any}
      variant={variant}
      className={className}
      size={size}
    />
  );
};
