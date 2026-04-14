"use client";

import { ZIcon } from '@zcorvus/z-icons/react';
import { IconTypeInfo } from '@/types/icons/icons.types';
import dynamic from 'next/dynamic';

const FASolidRenderer = dynamic(() => import('./FASolidRenderer'), { ssr: false });
const FARegularRenderer = dynamic(() => import('./FARegularRenderer'), { ssr: false });

interface UnifiedIconProps extends Omit<IconTypeInfo, 'variant'> {
  variant?: string;
  className?: string;
  size?: number;
}

export const UnifiedIcon = ({ type, name, variant, className, size }: UnifiedIconProps) => {
  // Font Awesome icons lazily loaded
  if (type === 'fa-solid') {
    return <FASolidRenderer name={name as string} className={className} size={size} />;
  }

  if (type === 'fa-regular') {
    return <FARegularRenderer name={name as string} className={className} size={size} />;
  }

  // ZCorvus icons (core, neo, mina)
  return (
    <ZIcon
      type={type as 'core' | 'neo' | 'mina'}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name={name as any}
      variant={variant}
      className={className}
      size={size}
    />
  );
};
