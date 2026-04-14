"use client";

import { useCallback, useState } from "react";
import { IconDetailPanel } from "./IconDetailPanel";
import { IconGridList } from "./IconGridList";
import { IconTypeInfo } from "@/types/icons/icons.types";
import { cn } from "@/lib/utils";
import { IconGroup } from "../constants/icon.constants";

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

  const idIcon = showDetail ? `${showDetail.type}:${showDetail.name}:${showDetail.variant}` : "";

  return (
    <div
      data-active-icon={idIcon}
      className={cn("flex h-full min-h-[32rem] flex-col gap-4 lg:flex-row")}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            [data-icon-id="${idIcon}"] {
              background-color: color-mix(in oklab, var(--primary) 12%, var(--surface));
              border-color: color-mix(in oklab, var(--primary) 40%, var(--surface-border));
              box-shadow: var(--shadow-soft);
            }
          `,
        }}
      />

      <div className="min-h-[24rem] min-w-0 flex-1 overflow-hidden rounded-[1.6rem] border border-surface-border bg-background/58 p-3 sm:p-4">
        <IconGridList iconsData={data} onShowDetail={handleShowDetail} showDetail={Boolean(showDetail)} />
      </div>

      {showDetail && (
        <div className="min-w-0 lg:w-[360px] lg:min-w-[320px]">
          <IconDetailPanel icon={showDetail} onClose={handleCloseDetail} />
        </div>
      )}
    </div>
  );
};

export { IconGrid };
