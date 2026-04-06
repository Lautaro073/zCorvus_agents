import * as React from "react"

import { cn } from "@/lib/utils/index"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "ui-focus-ring ui-disabled-state ui-field-base placeholder:text-muted-foreground focus-visible:border-ring aria-invalid:border-destructive aria-invalid:ring-destructive/20 flex field-sizing-content min-h-16 w-full rounded-md px-3 py-2 text-base md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
