# AgentMonitor V2 - Design System

## Overview
This document describes the visual design system for AgentMonitor V2, built with React + Vite + TypeScript + shadcn/ui.

## Color Palette

### Base Colors (shadcn/ui)
- **Background**: `hsl(var(--background))` - Main background
- **Foreground**: `hsl(var(--foreground))` - Main text
- **Primary**: `hsl(var(--primary))` - Primary actions
- **Secondary**: `hsl(var(--secondary))` - Secondary elements
- **Muted**: `hsl(var(--muted))` - Muted/disabled elements
- **Accent**: `hsl(var(--accent))` - Accent highlights
- **Destructive**: `hsl(var(--destructive))` - Error/destructive actions

### MCP State Colors (Semantic Tokens)
| State | CSS Variable | Tailwind Class | Description |
|-------|-------------|----------------|-------------|
| Idle | `--state-idle` | `.state-idle` | Agent is available but not working |
| Active | `--state-active` | `.state-active` | Agent is actively processing |
| In Progress | `--state-in-progress` | `.state-in-progress` | Task is in progress |
| Blocked | `--state-blocked` | `.state-blocked` | Task is blocked |
| Completed | `--state-completed` | `.state-completed` | Task completed successfully |
| Failed | `--state-failed` | `.state-failed` | Task failed |
| Pending | `--state-pending` | `.state-pending` | Task is pending |
| Incident | `--state-incident` | `.state-incident` | Critical incident |

## Typography
- **Font Family**: `system-ui, -apple-system, sans-serif`
- **Headings**: Bold, tracking-tight
- **Body**: Regular weight, normal tracking

## Spacing
| Token | Value |
|-------|-------|
| `--space-xs` | 0.25rem |
| `--space-sm` | 0.5rem |
| `--space-md` | 1rem |
| `--space-lg` | 1.5rem |
| `--space-xl` | 2rem |
| `--space-2xl` | 3rem |

## Shadows
| Token | Value |
|-------|-------|
| `--shadow-sm` | 0 1px 2px |
| `--shadow-md` | 0 4px 6px |
| `--shadow-lg` | 0 10px 15px |
| `--shadow-glow-active` | 0 0 12px (state-active glow) |
| `--shadow-glow-blocked` | 0 0 12px (state-blocked glow) |

## Layout

### AppShell Structure
- **Sidebar**: 64px (collapsed) / 256px (expanded)
- **Header**: 56px height, fixed
- **Main Content**: Fluid, responsive

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: 1024px - 1440px
- Wide: > 1440px

## Components

### Navigation (Sidebar)
- Collapsible with smooth transition
- Icons: lucide-react
- Active state: `bg-accent`

### Header
- Search bar (64px width collapsed)
- Connection status indicator (WiFi/WiFiOff icons)
- Notification bell with badge

### Cards
- Used for agent summaries and metrics
- Header, Content sections
- Support for Badges and stats

### Badges
- Variants: `default`, `secondary`, `destructive`, `outline`
- State-specific colors via semantic tokens

## Dark Mode
- Enabled via `class` strategy
- Toggle by adding/removing `.dark` class on root element
- All semantic tokens have dark mode overrides

## Animation
- Default shadcn animations: accordion (200ms ease-out)
- Custom pulse animation for critical alerts
- Smooth transitions on hover states (150ms)

## Usage Examples

```tsx
import { Badge } from '@/components/ui/badge';

// State badge
<Badge className="state-active">Active</Badge>
<Badge variant="destructive" className="state-blocked">Blocked</Badge>

// Card with state
<Card>
  <CardHeader>
    <CardTitle>Agent Name</CardTitle>
    <Badge className="state-in-progress">In Progress</Badge>
  </CardHeader>
</Card>
```

## shadcn/ui Hardening Notes (2026-03-30)

- Standardized focus behavior across base controls (`Button`, `Input`, `Select`, `Checkbox`, `Tabs`) with visible keyboard ring using `focus-visible:ring-2` + offset.
- Normalized elevated surface style in base `Card`, `Popover`, and `Tooltip` using semantic border and backdrop blur so all panels share the same visual depth.
- Introduced explicit semantic color tokens in Tailwind theme for MCP states (`--color-state-*`) so feature components can use state colors without hardcoded hex values.
- Added extended `Badge` variants (`success`, `warning`, `info`) for status communication consistency.
- Set dark mode as default at app boot (`document.documentElement.classList.add('dark')`) to match V2 visual direction.
- Added typography tokens for sans/mono usage consistency and improved readability in task/event identifiers.
