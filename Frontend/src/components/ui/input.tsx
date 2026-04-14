import * as React from "react"

import { cn } from "@/lib/utils/index"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "ui-focus-ring ui-disabled-state ui-field-base file:text-foreground placeholder:text-muted-foreground/90 selection:bg-primary selection:text-primary-foreground h-11 w-full min-w-0 rounded-[1.15rem] px-4 py-2 text-[15px] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium md:text-sm",
        "focus-visible:border-ring aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
