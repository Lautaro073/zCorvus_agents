"use client";

import { MinaIconName } from "@zcorvus/z-icons/icons";
import { ZIcon } from "@zcorvus/z-icons/react";
import { cn } from "@/lib/utils";

type VerticalDirection = "up" | "down";
type HorizontalDirection = "left" | "right";

interface AnimatedIconProps {
  icons: MinaIconName[];
  duration: number;
  orientation?: "vertical" | "horizontal";
  direction: VerticalDirection | HorizontalDirection;
  className?: string;
  iconClassName?: string;
  gapClassName?: string;
}

export function AnimatedIcon({
  icons,
  duration,
  orientation = "vertical",
  direction,
  className,
  iconClassName,
  gapClassName,
}: AnimatedIconProps) {
  const animationClass =
    direction === "up"
      ? "animate-scroll-up"
      : direction === "down"
        ? "animate-scroll-down"
        : direction === "left"
          ? "animate-scroll-left"
          : "animate-scroll-right";

  const loopedIcons = [...icons, ...icons];
  const isVertical = orientation === "vertical";

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        isVertical
          ? "h-full min-h-0 w-[4.6rem] [mask-image:linear-gradient(to_bottom,transparent,black_9%,black_91%,transparent)]"
          : "h-10 w-full [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]",
        className
      )}
    >
      <div
        className={cn(
          "will-change-transform motion-reduce:animate-none",
          isVertical ? "flex h-full flex-col items-center" : "flex h-full items-center",
          gapClassName ?? (isVertical ? "gap-3.5" : "gap-6"),
          animationClass
        )}
        style={{
          animationDuration: `${duration}s`,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        }}
      >
        {loopedIcons.map((icon, idx) => (
          <ZIcon
            key={`${icon}-${idx}`}
            type="mina"
            name={icon}
            className={cn(
              "shrink-0 text-foreground/12",
              isVertical ? "size-6.5" : "size-7",
              iconClassName
            )}
          />
        ))}
      </div>
    </div>
  );
}
