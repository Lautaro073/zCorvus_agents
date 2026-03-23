"use client"
import { ZIcon } from "@zcorvus/z-icons/react";
import { UnifiedIcon } from "@/components/common/UnifiedIcon";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { IconTypeInfo } from "@/types/icons/icons.types";
import { IconExportState, useIconExport } from "@/hooks/useIconExport";
import { Button } from "@/components/ui/button";

interface IconDetailPanelProps {
  icon: IconTypeInfo;
  onClose?: () => void;
}

type TypeActionButtons = {
  key: string;
  iconName: "download" | "copy";
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const IconDetailPanel = ({ icon, onClose }: IconDetailPanelProps) => {
  const [state, setState] = useState<IconExportState>("react");

  const { codeSnippet, handleCopyIcon, handleCopyCode, handleDownloadIcon } =
    useIconExport({ icon, state });

  const formatTabs: IconExportState[] = ["react", "svg", "html"];

  const actionButtons: TypeActionButtons[] = [
    { key: "download", iconName: "download", onClick: handleDownloadIcon },
    { key: "copy", iconName: "copy", onClick: handleCopyCode },
  ];

  return (
    <div className="h-full bg-card py-12 rounded-lg min-w-[300px] flex flex-col justify-between transition-all duration-300 ease-in-out relative">
      <div className="flex items-center gap-2 px-6 group cursor-pointer"
        onClick={handleCopyIcon}
      >
        <h1 className="text-xl font-secondary capitalize">{icon.name}</h1>
        <ZIcon type="mina" name="copy" className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="px-6 w-full flex flex-col gap-3 group">
        <div className="bg-accent w-[250px] h-auto p-8 rounded-lg grid place-content-center">
          <UnifiedIcon {...(icon)} size={150} />
        </div>

        <div className="relative">
          <pre className="bg-accent rounded-lg px-4 py-2 w-[250px] overflow-x-auto">
            <code className="text-xs select-all truncate">
              {codeSnippet}
            </code>
          </pre>
          <div className="absolute top-0 right-0 bg-accent rounded-md text-xs px-1 text-muted-foreground rounded-l-none rounded-br-xs dark:bg-accent h-full dark:hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {actionButtons.map((button) => (
              <Button
                key={button.key}
                variant="ghost"
                size="icon-sm"
                className="h-full w-fit px-1 py-1"
                onClick={button.onClick}
              >
                <ZIcon type="mina" name={button.iconName} className="w-4 h-4" />
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 items-center justify-end px-6">
        {formatTabs.map((tab) => (
          <Button key={tab} variant="ghost" className={cn("px-2", state === tab ? "text-foreground" : "text-muted-foreground")} onClick={() => setState(tab)}>
            <p className="font-medium capitalize">{tab}</p>
          </Button>
        ))}
      </div>

      <Button onClick={onClose} className="absolute top-4 right-4" variant="ghost" size="icon-sm">
        <ZIcon type="mina" name="x" className="w-4 h-4" />
      </Button>
    </div>
  )
}

export { IconDetailPanel };
