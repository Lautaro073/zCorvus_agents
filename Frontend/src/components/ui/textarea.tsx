import * as React from "react"

import { cn } from "@/lib/utils/index"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "ui-focus-ring ui-disabled-state ui-field-base placeholder:text-muted-foreground/90 focus-visible:border-ring aria-invalid:border-destructive aria-invalid:ring-destructive/20 flex field-sizing-content min-h-24 w-full rounded-[1.15rem] px-4 py-3 text-[15px] md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
