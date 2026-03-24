"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRegularIcons } from '@/lib/fontawesome/regular';
import { cn } from '@/lib/utils';

export default function FARegularRenderer({ name, className, size }: { name: string, className?: string, size?: number }) {
  const icon = faRegularIcons[name];
  if (!icon) return null;
  return <FontAwesomeIcon icon={icon} className={cn(className)} style={{ width: size, height: size }} />;
}
