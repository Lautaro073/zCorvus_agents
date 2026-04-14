import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils/index"

const buttonVariants = cva(
  "ui-focus-ring ui-disabled-state inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[calc(var(--radius)-3px)] text-sm font-medium tracking-[-0.01em] transition-[transform,background-color,color,border-color,box-shadow,opacity] duration-[180ms] ease-[var(--ease-out)] active:scale-[0.98] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/92",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--shadow-soft)] hover:bg-destructive/92 focus-visible:ring-destructive/30",
        outline:
          "border border-surface-border bg-surface text-foreground shadow-[var(--shadow-soft)] hover:border-foreground/15 hover:bg-surface-muted",
        secondary:
          "bg-surface-muted text-foreground shadow-[var(--shadow-soft)] hover:bg-surface-emphasis",
        ghost:
          "text-muted-foreground shadow-none hover:bg-secondary/78 hover:text-foreground",
        link: "rounded-none px-0 text-primary shadow-none hover:text-foreground",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 rounded-[calc(var(--radius)-5px)] gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-[calc(var(--radius)-2px)] px-6 text-[15px] has-[>svg]:px-4",
        icon: "size-10 rounded-full",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
