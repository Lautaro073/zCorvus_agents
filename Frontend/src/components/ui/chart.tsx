"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils/index"

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode
    color?: string
  }
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
}) {
  const uniqueId = React.useId().replace(/:/g, "")
  const chartId = `chart-${id || uniqueId}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-legend-item-text]:text-muted-foreground [&_.recharts-reference-line_line]:stroke-border [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorEntries = Object.entries(config).filter(([, value]) => value.color)

  if (!colorEntries.length) {
    return null
  }

  const cssVars = colorEntries
    .map(([key, value]) => `--color-${key}: ${value.color};`)
    .join("\n")

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart="${id}"] { ${cssVars} }`,
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

type TooltipItem = {
  color?: string
  dataKey?: string | number
  name?: string
  value?: number | string
}

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  hideLabel = false,
  formatter,
  labelFormatter,
}: React.ComponentProps<"div"> & {
  active?: boolean
  payload?: TooltipItem[]
  label?: string | number
  hideLabel?: boolean
  formatter?: (value: number | string, name: string, item: TooltipItem, index: number) => React.ReactNode
  labelFormatter?: (value: string | number) => React.ReactNode
}) {
  const { config } = useChart()

  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className={cn("min-w-[12rem] rounded-lg border border-border/70 bg-background/95 p-2.5 text-xs shadow-sm", className)}>
      {!hideLabel && label !== undefined && (
        <p className="mb-2 font-medium text-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}

      <div className="space-y-1.5">
        {payload.map((item, index) => {
          const itemKey = String(item.dataKey ?? item.name ?? index)
          const itemConfig = config[itemKey]
          const itemLabel = itemConfig?.label ?? item.name ?? itemKey
          const rawValue = item.value ?? 0
          const itemValue = formatter
            ? formatter(rawValue, itemKey, item, index)
            : rawValue

          return (
            <div key={`${itemKey}-${index}`} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: item.color || itemConfig?.color || "var(--muted-foreground)" }}
                />
                <span className="truncate text-muted-foreground">{itemLabel}</span>
              </div>
              <span className="font-medium tabular-nums text-foreground">{itemValue}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
  payload,
  className,
}: React.ComponentProps<"div"> & {
  payload?: Array<{
    color?: string
    dataKey?: string | number
    value?: string
  }>
}) {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-1", className)}>
      {payload.map((item) => {
        const itemKey = String(item.dataKey ?? item.value ?? "")
        const itemConfig = config[itemKey]
        const itemLabel = itemConfig?.label ?? item.value ?? itemKey

        return (
          <div key={itemKey} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: item.color || itemConfig?.color || "var(--muted-foreground)" }}
            />
            <span>{itemLabel}</span>
          </div>
        )
      })}
    </div>
  )
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
}
