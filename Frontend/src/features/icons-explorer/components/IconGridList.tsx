"use client"
import { memo, useCallback, useEffect, useEffectEvent, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual'

import { ZIcon } from '@zcorvus/z-icons/react';
import { UnifiedIcon } from '@/components/common/UnifiedIcon';
import { useRef, useState } from 'react';
import { toast } from "sonner"
import { IconGroup, LayerModes as LM } from '@/features/icons-explorer';
import { IconTypeInfo } from '@/types/icons/icons.types';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store';
import { Button } from '@/components/ui/button';

interface IconGridListProps {
  iconsData: IconGroup[]
  showDetail: boolean
  onShowDetail: (arg: IconTypeInfo) => void
}

const MAX_ICONS = 500;

const IconGridListComponent = memo(({ iconsData, onShowDetail, showDetail }: IconGridListProps) => {
  const parentRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const layer = useUIStore((s) => s.layer);

  const isCompact = layer === LM.COMPACT;
  const ITEM_WIDTH = isCompact ? 48 : 104;

  const updateColumns = useEffectEvent(() => {
    const width = parentRef.current?.clientWidth ?? 0;
    const cols = Math.max(Math.floor(width / ITEM_WIDTH), 1)
    setColumns(prev => (prev === cols ? prev : cols));
    setLoading(false);
  });

  useEffect(() => {
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => {
      window.removeEventListener('resize', updateColumns);
    };
  }, [layer, showDetail]);

  const icons = useMemo<IconTypeInfo[]>(() => {
    const expanded = iconsData.flatMap(group =>
      (group.icons ?? []).flatMap(icon =>
        group.type.map(variant => ({
          type: group.name,
          name: icon,
          variant,
        } as IconTypeInfo))
      )
    )

    return showAll ? expanded : expanded.slice(0, MAX_ICONS)
  }, [iconsData, showAll])

  const canShowAll = icons.length < MAX_ICONS
  const totalItems = icons.length;
  const rows = useMemo(() => Math.ceil(totalItems / columns), [totalItems, columns]);

  const estimateSize = useCallback(() => ITEM_WIDTH, [ITEM_WIDTH]);

  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: estimateSize,
    overscan: 5,
  })

  const handleCopyIcon = (iconName: string) => {
    if (!iconName) return;
    navigator.clipboard.writeText(iconName);
    toast.success("Icon name copied!", {
      description: iconName,
    });
  }

  const handleCopyReact = (i: IconTypeInfo) => {
    const codeSnippet = `<ZIcon type="${i.type}" name="${i.name}" variant="${i.variant}" />`;
    navigator.clipboard.writeText(codeSnippet);
    toast.success("Code REACT copied!", {
      description: codeSnippet,
    });
  }

  const handleCopyHTML = (i: IconTypeInfo) => {
    const codeSnippet = `<z-icon name="${i.name}" type="${i.type}" variant="${i.variant}" />`;
    navigator.clipboard.writeText(codeSnippet);
    toast.success("Icon HTML copied!", {
      description: codeSnippet,
    });
  }

  if (loading) {
    return <div ref={parentRef} className="h-auto mb-auto w-full flex flex-wrap gap-2 overflow-y-auto max-h-full" >
      {Array.from({ length: Math.max(15, icons.length) }).map((_, index) => (
        <div
          key={index}
          className={cn("rounded-lg border border-border grid h-10 w-10 place-content-center bg-card animate-pulse", isCompact ? "h-10 w-10 grid-rows-1" : "h-24 w-24")}
        >
        </div>
      ))}
    </div>;
  }

  return (
    <div ref={parentRef} className="h-full overflow-y-auto relative w-full">
      <div
        className="relative w-full transition-all duration-1000 ease-in-out"
        style={{ height: rowVirtualizer.getTotalSize() }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const from = virtualRow.index * columns;
          const to = Math.min(from + columns, totalItems);
          const rowIcons = icons.slice(from, to);

          return (
            <div
              key={virtualRow.key}
              className="absolute top-0 left-0 grid w-full transition-all duration-300 ease-in-out"
              style={{
                height: `${virtualRow.size}px`,
                gridTemplateColumns: `repeat(${columns}, ${ITEM_WIDTH}px)`,
                transform: `translateY(${virtualRow.start}px)`,
                willChange: 'transform',
              }}
            >
              {rowIcons.map((i, idx) => {
                const id = `${i.type}::${i.name}::${i.variant}::${from + idx}`
                return (
                  <div
                    key={id}
                    className={cn("group cursor-pointer rounded-lg border border-border grid justify-center px-2 bg-card relative transition-all duration-300 ease-in-out", isCompact ? "h-10 w-10 grid-rows-1" : "h-24 w-24 gap-2 grid-rows-[4fr_3fr]")}
                    onClick={() => {
                      onShowDetail(i)
                      handleCopyIcon(i.name);
                    }}
                  >
                    <UnifiedIcon {...i} className={cn("transition-all duration-300 ease-in-out justify-self-center", isCompact ? "self-center" : "self-end")} />
                    <p className={cn("text-xs transition-opacity duration-300 text-center", isCompact ? "opacity-0 h-0" : "opacity-100")}>{i.name}</p>
                    <div className={cn("border bg-accent shadow-xs hover:text-accent-foreground  dark:border-input rounded-tr-lg items-center justify-center gap-px absolute w-6 flex flex-col -top-px -right-px px-1 py-2 h-[calc(100%+2px)] rounded-b-none rounded-l-none rounded-br-lg opacity-0 group-hover:opacity-100 transition-all duration-300", isCompact && "hidden")} >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyHTML(i);
                        }}
                        className="cursor-pointer">
                        <ZIcon type={"mina"} name="file-text" className="text-muted-foreground hover:text-foreground transition-colors duration-300 w-full h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyReact(i);
                        }}
                        className="cursor-pointer">
                        <ZIcon type={"mina"} name="code" className="text-muted-foreground hover:text-foreground transition-colors duration-300 w-full h-4" />
                      </button>
                    </div>
                  </div>
                )
              }

              )}
            </div>
          )
        })}
      </div>
      {!showAll && !canShowAll && (
        <div className="sticky bottom-0 flex">
          <Button onClick={() => setShowAll(true)} variant="outline" className="ml-auto dark:bg-background">
            Show All
          </Button>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return Boolean(prevProps.showDetail) === Boolean(nextProps.showDetail);
});

IconGridListComponent.displayName = 'IconGridListComponent';
export const IconGridList = memo(IconGridListComponent);
