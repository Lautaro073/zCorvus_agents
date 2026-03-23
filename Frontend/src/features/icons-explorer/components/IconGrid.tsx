"use client";

import { useCallback } from 'react';
import { useState } from 'react';
import { IconDetailPanel } from './IconDetailPanel';
import { IconGridList } from './IconGridList';
import { IconTypeInfo } from '@/types/icons/icons.types';
import { cn } from '@/lib/utils';
import { IconGroup } from '../constants/icon.constants';

interface IconGridProps {
  data: IconGroup[];
}

const IconGrid = ({ data }: IconGridProps) => {
  const [showDetail, setShowDetail] = useState<IconTypeInfo | null>(null);

  const handleShowDetail = useCallback((info: IconTypeInfo) => {
    setShowDetail(info);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetail(null);
  }, []);

  const idIcon = showDetail ? `${showDetail.type}::${showDetail.name}::${showDetail.variant}` : ""

  return (
    <div
      data-active-icon={idIcon}
      className={cn("container flex items-center justify-between h-[calc(100%-60px)] w-full gap-4")}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          .${idIcon} {
            background-color: var(--accent);
            border-color: var(--muted-foreground);
          }
        `}} />
      <IconGridList iconsData={data} onShowDetail={handleShowDetail} showDetail={Boolean(showDetail)} />
      {
        showDetail && (
          <IconDetailPanel icon={showDetail} onClose={handleCloseDetail} />
        )
      }
    </div >
  )
}

export { IconGrid };
