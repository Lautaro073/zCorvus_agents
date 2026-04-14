"use client"

import { useState } from "react"
import { ZIcon } from "@zcorvus/z-icons/react"
import { UnifiedIcon } from "@/components/common/UnifiedIcon"
import { IconTypeInfo } from "@/types/icons/icons.types"
import { IconExportState, useIconExport } from "@/hooks/useIconExport"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface IconDetailPanelProps {
  icon: IconTypeInfo
  onClose?: () => void
}

type ActionButton = {
  key: string
  iconName: "download" | "copy"
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
}

const IconDetailPanel = ({ icon, onClose }: IconDetailPanelProps) => {
  const [state, setState] = useState<IconExportState>("react")

  const { codeSnippet, handleCopyIcon, handleCopyCode, handleDownloadIcon } =
    useIconExport({ icon, state })

  const formatTabs: IconExportState[] = ["react", "svg", "html"]

  const actionButtons: ActionButton[] = [
    { key: "download", iconName: "download", onClick: handleDownloadIcon },
    { key: "copy", iconName: "copy", onClick: handleCopyCode },
  ]

  return (
    <aside className="ui-surface-panel flex h-full min-h-[24rem] min-w-0 w-full flex-col overflow-hidden rounded-[1.65rem] p-4 sm:p-5 lg:p-6">
      <div className="flex flex-none items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <button
            onClick={handleCopyIcon}
            className="inline-flex max-w-full items-start gap-2 text-left text-xl capitalize text-foreground transition-colors duration-150 hover:text-foreground/80"
          >
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{icon.name}</span>
            <ZIcon type="mina" name="copy" className="mt-1 size-4 shrink-0 text-muted-foreground" />
          </button>
        </div>

        <Button onClick={onClose} variant="ghost" size="icon-sm">
          <ZIcon type="mina" name="x" className="size-4" />
        </Button>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid gap-4 max-[820px]:gap-3">
          <div className="rounded-[1.5rem] border border-surface-border bg-secondary/68 p-5 max-[820px]:p-4 max-[720px]:p-3">
            <div className="grid min-h-[220px] place-items-center rounded-[1.2rem] border border-border/60 bg-background/72 max-[820px]:min-h-[180px] max-[720px]:min-h-[148px]">
              <UnifiedIcon
                {...icon}
                size={132}
                className="text-foreground max-[820px]:scale-[0.86] max-[720px]:scale-[0.74]"
              />
            </div>
          </div>

          <div className="min-w-0 space-y-3 max-[820px]:space-y-2">
            <div className="flex flex-wrap gap-2">
              {formatTabs.map((tab) => (
                <Button
                  key={tab}
                  variant={state === tab ? "secondary" : "ghost"}
                  className={cn("rounded-full px-3 capitalize", state === tab && "shadow-[var(--shadow-soft)]")}
                  onClick={() => setState(tab)}
                >
                  {tab}
                </Button>
              ))}
            </div>

            <div className="ui-code-block min-w-0 max-w-full overflow-auto p-4 max-[820px]:max-h-[10.5rem] max-[720px]:max-h-[8rem]">
              <code className="block max-w-full select-all whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {codeSnippet}
              </code>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-none items-center justify-end gap-2">
        {actionButtons.map((button) => (
          <Button key={button.key} variant="outline" size="sm" className="rounded-full" onClick={button.onClick}>
            <ZIcon type="mina" name={button.iconName} className="size-4" />
          </Button>
        ))}
      </div>
    </aside>
  )
}

export { IconDetailPanel }
