"use client"

import { memo, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ZIcon } from "@zcorvus/z-icons/react"
import { UnifiedIcon } from "@/components/common/UnifiedIcon"
import { toast } from "sonner"
import { IconGroup, LayerModes as LM } from "@/features/icons-explorer"
import { IconTypeInfo } from "@/types/icons/icons.types"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

interface IconGridListProps {
  iconsData: IconGroup[]
  showDetail: boolean
  onShowDetail: (arg: IconTypeInfo) => void
}

const MAX_ICONS = 500

const IconGridListComponent = memo(({ iconsData, onShowDetail, showDetail }: IconGridListProps) => {
  const parentRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const layer = useUIStore((s) => s.layer)
  const common = useTranslations("common")

  const isCompact = layer === LM.COMPACT
  const itemWidth = isCompact ? 56 : 120

  const updateColumns = useEffectEvent(() => {
    const width = parentRef.current?.clientWidth ?? 0
    const cols = Math.max(Math.floor(width / itemWidth), 1)
    setColumns((prev) => (prev === cols ? prev : cols))
    setLoading(false)
  })

  useEffect(() => {
    updateColumns()
    window.addEventListener("resize", updateColumns)
    return () => {
      window.removeEventListener("resize", updateColumns)
    }
  }, [layer, showDetail])

  const expandedIcons = useMemo<IconTypeInfo[]>(
    () =>
      iconsData.flatMap((group) =>
        (group.icons ?? []).flatMap((icon) =>
          group.type.map(
            (variant) =>
              ({
                type: group.name,
                name: icon,
                variant,
              }) as IconTypeInfo
          )
        )
      ),
    [iconsData]
  )

  const icons = useMemo(
    () => (showAll ? expandedIcons : expandedIcons.slice(0, MAX_ICONS)),
    [expandedIcons, showAll]
  )
  const hasMore = expandedIcons.length > MAX_ICONS
  const totalItems = icons.length
  const rows = useMemo(() => Math.ceil(totalItems / columns), [totalItems, columns])

  const estimateSize = useCallback(() => itemWidth, [itemWidth])

  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 5,
  })

  const handleCopyIcon = (iconName: string) => {
    if (!iconName) return
    navigator.clipboard.writeText(iconName)
    toast.success(common("toasts.iconNameCopied"), {
      description: iconName,
    })
  }

  const handleCopyReact = (icon: IconTypeInfo) => {
    const codeSnippet = `<ZIcon type="${icon.type}" name="${icon.name}" variant="${icon.variant}" />`
    navigator.clipboard.writeText(codeSnippet)
    toast.success(common("toasts.reactCodeCopied"), {
      description: codeSnippet,
    })
  }

  const handleCopyHTML = (icon: IconTypeInfo) => {
    const codeSnippet = `<z-icon name="${icon.name}" type="${icon.type}" variant="${icon.variant}" />`
    navigator.clipboard.writeText(codeSnippet)
    toast.success(common("toasts.htmlCodeCopied"), {
      description: codeSnippet,
    })
  }

  if (loading) {
    return (
      <div ref={parentRef} className="flex h-auto max-h-full w-full flex-wrap gap-3 overflow-y-auto pb-1">
        {Array.from({ length: Math.max(15, icons.length || 15) }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "animate-pulse rounded-[1.25rem] border border-surface-border bg-muted/70",
              isCompact ? "h-12 w-12" : "h-28 w-28"
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div ref={parentRef} className="relative h-full overflow-y-auto pr-1">
      <div
        className="relative w-full"
        style={{ height: rowVirtualizer.getTotalSize() }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const from = virtualRow.index * columns
          const to = Math.min(from + columns, totalItems)
          const rowIcons = icons.slice(from, to)

          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 top-0 grid w-full"
              style={{
                height: `${virtualRow.size}px`,
                gridTemplateColumns: `repeat(${columns}, ${itemWidth}px)`,
                transform: `translateY(${virtualRow.start}px)`,
                willChange: "transform",
              }}
            >
              {rowIcons.map((icon, idx) => {
                const id = `${icon.type}::${icon.name}::${icon.variant}::${from + idx}`

                return (
                  <div
                    key={id}
                    className={cn(
                      id,
                      "group relative grid cursor-pointer justify-center rounded-[1.25rem] border border-surface-border bg-surface/92 px-2 py-2 shadow-[var(--shadow-soft)] transition-[transform,border-color,background-color,box-shadow] duration-[180ms] ease-[var(--ease-out)] hover:-translate-y-[1px] hover:border-foreground/14 hover:bg-surface",
                      isCompact ? "h-12 w-12 grid-rows-1" : "h-28 w-28 gap-2 grid-rows-[4fr_3fr]"
                    )}
                    onClick={() => {
                      onShowDetail(icon)
                      handleCopyIcon(icon.name)
                    }}
                  >
                    <UnifiedIcon
                      {...icon}
                      className={cn(
                        "justify-self-center text-foreground transition-transform duration-200 ease-[var(--ease-out)]",
                        isCompact ? "self-center" : "self-end"
                      )}
                    />
                    <p className={cn("text-center text-xs text-muted-foreground", isCompact ? "hidden" : "line-clamp-2")}>
                      {icon.name}
                    </p>

                    {!isCompact && (
                      <div className="absolute -right-px -top-px flex h-[calc(100%+2px)] w-8 flex-col items-center justify-center gap-1 rounded-r-[1.25rem] rounded-tl-none border border-surface-border bg-background/94 opacity-0 transition-opacity duration-150 ease-[var(--ease-out)] group-hover:opacity-100">
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            handleCopyHTML(icon)
                          }}
                          className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:text-foreground"
                        >
                          <ZIcon type="mina" name="file-text" className="size-3.5" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            handleCopyReact(icon)
                          }}
                          className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:text-foreground"
                        >
                          <ZIcon type="mina" name="code" className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {!showAll && hasMore && (
        <div className="sticky bottom-0 flex pt-4">
          <Button onClick={() => setShowAll(true)} variant="outline" className="ml-auto rounded-full bg-background/88">
            {common("actions.showAll")}
          </Button>
        </div>
      )}
    </div>
  )
})

IconGridListComponent.displayName = "IconGridListComponent"
export const IconGridList = IconGridListComponent
