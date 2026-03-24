"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSolidIcons } from '@/lib/fontawesome/solid';
import { cn } from '@/lib/utils';

export default function FASolidRenderer({ name, className, size }: { name: string, className?: string, size?: number }) {
  const icon = faSolidIcons[name];
  if (!icon) return null;
  return <FontAwesomeIcon icon={icon} className={cn(className)} style={{ width: size, height: size }} />;
}
