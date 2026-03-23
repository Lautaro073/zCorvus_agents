"use client";

import { ZIcon } from "@zcorvus/z-icons/react";
import { MinaIconName } from "@zcorvus/z-icons/icons";

interface AnimatedIconProps {
    icons: MinaIconName[];
    direction: "up" | "down";
    duration: number;
}

export function AnimatedIcon({ icons, direction, duration }: AnimatedIconProps) {
    const animationClass = direction === "up" ? "animate-scroll-up" : "animate-scroll-down";

    return (
        <div className="relative overflow-hidden h-full w-10">
            <div
                className={`flex flex-col gap-4 ${animationClass}`}
                style={{
                    animationDuration: `${duration}s`,
                    animationTimingFunction: 'linear',
                    animationIterationCount: 'infinite',
                }}
            >
                {icons.map((icon, idx) => (
                    <ZIcon
                        key={idx}
                        type="mina"
                        name={icon}
                        className="size-6 text-muted-foreground/30 shrink-0"
                    />
                ))}
                {/* Duplicar para loop infinito */}
                {icons.map((icon, idx) => (
                    <ZIcon
                        key={`dup-${idx}`}
                        type="mina"
                        name={icon}
                        className="size-6 text-muted-foreground/30 shrink-0"
                    />
                ))}
            </div>
        </div>
    );
}
