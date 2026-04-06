"use client"

import { ZIcon } from '@zcorvus/z-icons/react';
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  //     theme?: 'light' | 'dark' | 'system';
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <ZIcon type="mina"  name="check" className="size-4" />,
        info: <ZIcon type="mina"  name="info" className="size-4" />,
        warning: <ZIcon type="mina"  name="danger" className="size-4" />,
        error: <ZIcon type="mina"  name="x-diamond" className="size-4" />,
        loading: <ZIcon type="mina" name="spinner" className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast border-surface-border bg-surface text-foreground shadow-lg",
          title: "text-foreground",
          description: "text-muted-foreground!",
          actionButton:
            "!bg-primary !text-primary-foreground !rounded-full !shadow-none hover:!bg-primary/92",
          cancelButton:
            "!border !border-surface-border !bg-surface-muted !text-foreground !rounded-full hover:!bg-surface-emphasis",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
