# Design System

All values below are extracted from the actual codebase — primarily `artifacts/lora-trainer/src/index.css` and the components under `artifacts/lora-trainer/src/components/ui/`. Where nothing exists in code, it's marked **UNKNOWN**.

## UI Style

- **Aesthetic:** Dark-first, "ML/dev tool" vibe. The CSS comment literally says *"Default to dark mode for the ML vibe"* and *"Deep dark slate/zinc for ML vibe"*.
- **Component library:** [shadcn/ui](https://ui.shadcn.com) (Radix primitives + Tailwind). The full shadcn set is present under `artifacts/lora-trainer/src/components/ui/` (50+ components — accordion, alert, badge, button, card, dialog, drawer, dropdown-menu, form, input, popover, progress, select, sidebar, slider, table, tabs, toast, tooltip, etc.).
- **Theming:** `next-themes` via a custom `ThemeProvider` (`artifacts/lora-trainer/src/components/theme-provider.tsx`) with `defaultTheme="dark"` and `storageKey="vite-ui-theme"`. A `.light` class variant is defined.
- **Animations:** `tw-animate-css` plugin + `framer-motion` is installed. Pages use Tailwind utilities like `animate-in fade-in slide-in-from-bottom-4 duration-500`.
- **Icons:** `lucide-react` for app icons, `react-icons` is installed but UNKNOWN if used.

## Colors

All colors are HSL CSS variables defined in `artifacts/lora-trainer/src/index.css` and exposed to Tailwind via `@theme inline`.

### Dark theme (default — `:root`)

| Token | HSL | Notes |
|---|---|---|
| `--background` | `240 10% 4%` | Near-black slate |
| `--foreground` | `0 0% 98%` | Off-white text |
| `--card` | `240 10% 6%` | Slightly lighter than background |
| `--card-border` | `240 6% 15%` | |
| `--popover` | `240 10% 6%` | |
| `--primary` | `262 80% 65%` | **Violet — brand color** |
| `--primary-foreground` | `0 0% 100%` | White on primary |
| `--secondary` | `240 6% 15%` | Dark muted slate |
| `--muted` | `240 6% 15%` | |
| `--muted-foreground` | `240 5% 65%` | Mid-gray text |
| `--accent` | `262 80% 65%` | Same violet as primary |
| `--destructive` | `0 84% 60%` | Red |
| `--border` / `--input` / `--ring` | `240 6% 15%` / `240 6% 15%` / `262 80% 65%` | |
| `--sidebar` | `240 10% 4%` | Same as background |
| `--sidebar-primary` | `262 80% 65%` | |

### Light theme (`.light`)

| Token | HSL |
|---|---|
| `--background` | `0 0% 100%` |
| `--foreground` | `240 10% 4%` |
| `--card` | `0 0% 100%` |
| `--card-border` | `240 6% 90%` |
| `--primary` | `262 80% 65%` *(same violet)* |
| `--secondary` | `240 5% 96%` |
| `--muted` | `240 5% 96%` |
| `--muted-foreground` | `240 4% 46%` |
| `--destructive` | `0 84% 60%` |
| `--border` / `--input` | `240 6% 90%` |

### Status colors *(used inline in `dashboard.tsx`)*

These are Tailwind palette colors used directly for status badges, not custom tokens:

| Status | Tailwind class |
|---|---|
| `starting` | `text-blue-500 bg-blue-500/10 border-blue-500/20` |
| `processing` | `text-amber-500 bg-amber-500/10 border-amber-500/20 animate-pulse` |
| `succeeded` | `text-green-500 bg-green-500/10 border-green-500/20` |
| `failed` | `text-red-500 bg-red-500/10 border-red-500/20` |
| `canceled` | `text-muted-foreground` |

### Effects

- `--elevate-1: rgba(255,255,255,.04)` and `--elevate-2: rgba(255,255,255,.09)` — subtle elevation overlays.
- `--button-outline: rgba(255,255,255,.10)` and `--badge-outline: rgba(255,255,255,.05)`.
- `--opaque-button-border-intensity: 9` — used to derive border colors from base colors via `hsl(from ... calc(l + var(--opaque-button-border-intensity)))`.

## Typography

Imported from Google Fonts in `index.css`:

```
Outfit (400, 500, 600, 700)
Inter (400, 500, 600)
Space Mono (400, 700)
```

Mapped to CSS variables → Tailwind font tokens:

| Variable | Family | Tailwind class | Used for |
|---|---|---|---|
| `--app-font-display` → `--font-display` | **Outfit** | `font-display` | All headings (`h1`–`h6` set globally in `@layer base`) and the "LoRA Forge" wordmark |
| `--app-font-sans` → `--font-sans` | **Inter** | `font-sans` (default `body`) | Body text |
| `--app-font-mono` → `--font-mono` | **Space Mono** | `font-mono` | Form labels (uppercase tracking-wider), numeric values, status text, file metadata |
| `--app-font-serif` → `--font-serif` | Georgia | `font-serif` | UNKNOWN — declared but no use found in pages |

Heading patterns observed:
- Page title: `text-3xl font-display font-bold text-foreground`
- Section title: `font-display font-bold text-lg`
- Form field label: `font-mono text-xs uppercase tracking-wider text-muted-foreground`

## Spacing & Layout

Built on Tailwind's default 4px scale.

- **Border radius scale** *(from `@theme inline`)*:
  - `--radius: 0.5rem` (base = `radius-lg`)
  - `--radius-sm: calc(var(--radius) - 4px)` → `0.25rem`
  - `--radius-md: calc(var(--radius) - 2px)` → `0.375rem`
  - `--radius-xl: calc(var(--radius) + 4px)` → `0.75rem`

- **Layout shell** *(`artifacts/lora-trainer/src/components/layout.tsx`)*:
  - Two-column flex layout: fixed-width sidebar + main content.
  - Sidebar: `w-64`, hidden on `<md` screens, replaced with a top header.
  - Main padding: `p-6 lg:p-10`.
  - Content max-width: `max-w-6xl mx-auto`.
  - Sidebar inner padding: `p-6` for the brand header, `px-4 py-2` for nav items.
  - Nav item: `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium`.

- **Common gap/spacing tokens used in pages**:
  - Vertical section spacing: `space-y-8` between page sections, `space-y-6` for form blocks, `space-y-4`/`space-y-3` for tighter groups, `space-y-2` for tightest.
  - Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` for stat cards; `grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2` for image thumbnails.
  - Form row: `flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`.

## Component Patterns

Patterns observed across the actual pages:

### Stat / KPI Card
Used on the Dashboard. `Card` + `CardHeader` + `CardContent`, with an icon + label in the header and a large number in the content.

### Status Badge
Reusable `<StatusBadge status={...} />` component (`dashboard.tsx`) that maps a status string to one of five color treatments listed in the **Status colors** section.

### Form
- Built with `react-hook-form` + `zod` validators via `@hookform/resolvers/zod`.
- Uses shadcn `<Form>` / `<FormField>` / `<FormItem>` / `<FormLabel>` / `<FormControl>` / `<FormMessage>` / `<FormDescription>`.
- Labels are styled as `font-mono text-xs uppercase tracking-wider text-muted-foreground` with a leading lucide icon.
- Inputs use `bg-background border-border/50 font-mono focus-visible:ring-primary/50`.

### Dropzone (custom, in `job-new.tsx`)
- Dashed-border container with hover/drag states:
  - Idle: `border-border/50 bg-background hover:border-primary/50 hover:bg-muted/30`
  - Dragging: `border-primary bg-primary/10`
- Click-to-browse via a hidden `<input type="file" multiple accept="image/*">`.
- Selected files render as `aspect-square` thumbnails in a responsive grid with hover-revealed remove buttons.

### Progress
shadcn `<Progress>` component, height `h-1.5`, paired with a small `font-mono` percentage label.

### Action Button
- Primary: `bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide`, usually with a leading lucide icon (`Zap`, `Plus`, `UploadCloud`).
- Secondary/outline: `border-primary/30 text-primary hover:bg-primary/10`.

### Toast / Notifications
- shadcn `<Toaster>` mounted at the App root.
- Triggered via `useToast()` from `@/hooks/use-toast`.
- `sonner` is also installed as an alternative — UNKNOWN whether it's actively used.

### Page entrance animation
Pages wrap content in a div with `animate-in fade-in slide-in-from-bottom-4 duration-500`.
