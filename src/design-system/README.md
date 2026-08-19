# Slippy Goalz Design System

Single source of truth for the AI Repair Shop SaaS.

**Feel:** Premium · Elegant · Quiet · Confident · Fast · Timeless  
**Not:** AI-generated · Cyberpunk · Template · Neon · Glass

The interface should disappear. The information should stand out.

---

## Import

```js
import {
  Button, Input, Field, Card, Badge, Alert, Modal,
  color, space, radius, shadow, type, layout,
} from "../design-system";
```

CSS primitives are global via `src/design-system/primitives.css` (imported from `index.css`).

CSS variables (`--ds-*`) are applied by `ThemeContext`.

---

## 1. Colour

**Budget:** ~90% neutral · ~8% semantic · ~2% brand

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg.primary` | `#FAFAFB` | `#0B0D10` | App canvas |
| `bg.secondary` | `#F6F7F9` | `#111318` | Sidebar / sunk |
| `bg.card` | `#FFFFFF` | `#15181E` | Cards |
| `border` | `#E5E7EB` | `rgba(255,255,255,.07)` | 1px borders |
| `divider` | `#ECEEF2` | `rgba(255,255,255,.05)` | Separators |
| `text.primary` | `#111827` | `#FFFFFF` | Headings, body |
| `text.secondary` | `#4B5563` | `#A5ACB8` | Supporting |
| `text.muted` | `#6B7280` | `#737B87` | Captions |
| `text.disabled` | `#9CA3AF` | `#5C6370` | Disabled |
| `brand` | `#F43F5E` | `#F43F5E` | Primary CTA, active nav, focus |
| `brand.hover` | `#E11D48` | `#E11D48` | Hover (deepens — never brightens) |
| `brand.press` | `#BE123C` | `#BE123C` | Pressed |
| `brand.soft` | `#FFF1F2` | `rgba(244,63,94,.10)` | Soft fills only |
| `brand.softBorder` | `#FECDD3` | — | Soft chip borders |
| `brand.ring` | `rgba(244,63,94,.24)` | same | Focus rings |
| `success` | `#22C55E` | same | Positive |
| `warning` | `#F59E0B` | same | Caution |
| `danger` | `#EF4444` | same | Destructive |
| `info` | `#3B82F6` | same | Informational |
| `chart` | `#64748B` | `#94A3B8` | Charts (never brand) |

**Brand rose only on:** primary buttons, active navigation/tabs, important badges, focus rings, links, AI highlights, critical actions.  
Never large brand backgrounds, cards, tables, or charts.


---

## 2. Typography — Inter

Weights: `400 · 500 · 600 · 700`

| Role | Size | Weight | LH | Class |
|---|---|---|---|---|
| Display | 48 | 600 | 120% | `.ds-display` |
| H1 | 36 | 600 | 120% | `.ds-h1` |
| H2 | 30 | 600 | 120% | `.ds-h2` |
| H3 | 24 | 600 | 120% | `.ds-h3` |
| Large | 18 | 400 | 150% | `.ds-large` |
| Body | 16 | 400 | 150% | `.ds-body` |
| Small | 14 | 400 | 150% | `.ds-small` |
| Caption | 12 | 500 | 150% | `.ds-caption` |

Headings use slightly tighter tracking.

---

## 3. Spacing — 8-point grid

`4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64 · 80 · 96`

```js
import { space } from "../design-system";
space[5] // 24
```

Never invent spacing outside this scale.

---

## 4. Radius

| Token | px | Use |
|---|---|---|
| `sm` | 10 | Buttons, inputs, nav |
| `md` | 14 | Alerts, dropdowns |
| `lg` | 18 | Cards, tables |
| `modal` | 24 | Modals |
| `pill` | 9999 | Badges only |

---

## 5. Shadows

Prefer borders. Shadows are almost invisible.

- **sm** `0 1px 2px rgba(0,0,0,.15)` — cards
- **md** `0 8px 24px rgba(0,0,0,.20)` — dropdowns
- **lg** `0 18px 48px rgba(0,0,0,.25)` — modals

No glowing shadows.

---

## 6. Components

### Button

```jsx
<Button variant="primary">Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">Skip</Button>
<Button variant="danger">Delete</Button>
```

- Height **44px** · weight **500** · radius **10**
- Primary: brand red, white text, hover lifts 1px
- Secondary: transparent + border
- Ghost: text only
- Danger: red text, soft fill on hover

### Input

```jsx
<Field label="Phone" hint="WhatsApp number">
  <Input placeholder="03XX…" />
</Field>
```

- Height **48px** · radius **10** · 1px border  
- Focus: brand red ring

### Card

```jsx
<Card>…</Card>
<Card variant="elevated">…</Card>
<Card variant="quiet" interactive>…</Card>
```

- Padding **24** · radius **18** · 1px border

### Badge

```jsx
<Badge variant="brand" dot>VIP</Badge>
<Badge variant="success">Paid</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Overdue</Badge>
<Badge variant="neutral">Draft</Badge>
```

### Alert

```jsx
<Alert variant="warning" title="Pending bookings">
  3 need attention.
</Alert>
```

### Modal

```jsx
<Modal open={open} onClose={…} title="Confirm" footer={<>…</>}>
  …
</Modal>
```

### Table

Use `.ds-table-wrap` + `.ds-table` — row height **56px**, soft dividers, no zebra.

### Navigation

`.ds-nav` / `.ds-nav__item` — active = soft brand tint + **2px red indicator**, not a solid red block.

### Sidebar / Topbar

- Sidebar width **280px**
- Topbar height **72px**

---

## 7. Icons

Lucide · **20px** · **2px** stroke · consistent everywhere.

---

## 8. Motion

Calm · Natural · Responsive · Elegant. Never decorative.

The app should feel **alive without feeling animated**.

**Ease:** `cubic-bezier(0.2, 0, 0, 1)`  
**Allowed:** opacity · translateY (4–8px) · translateX (16–24px drawers) · scale (0.98–1.01)  
**Never:** bounce · elastic · rotate · overshoot · flash · large zoom · spring (product UI)

| Interaction | Duration |
|---|---|
| Hover | 120–180ms (`150ms`) |
| Press | 80–120ms (`100ms`) |
| Buttons / inputs / nav | 150ms |
| Cards / tabs / dropdowns | 180ms |
| Tooltips / tables | 120ms |
| Notifications / AI | 200ms |
| Page / drawers / dialogs | 220ms |
| Charts | 250ms |
| Skeleton → content | 180ms |

**Page:** sidebar + topbar fixed · content only fades + rises 6px @ 220ms.  
**Hover:** buttons deepen · cards lift **2px** · rows soft highlight.  
**Loading:** skeletons only — fade into content via `.content-reveal` / `<ContentReveal>`.  
**Drawers:** opacity + soft X (24px), not a full-screen wipe.

```js
import { motionPresets, tween } from "../design-system/motion";
```

Quality gate: improves clarity? feels natural? would Apple / Linear ship it? If not — remove it.

---

## 9. Accessibility

- AA contrast minimum
- Click targets ≥ 44px
- Visible `:focus-visible` brand ring
- Keyboard-dismissible modals (Escape)

---

## 10. Forbidden

- Heavy gradients  
- Glassmorphism  
- Neon glow  
- Random colours / radii / spacing  
- Thick shadows  
- Over-designed cards  
- Complex decoration  

---

## Quality gate

Before shipping a component:

1. Is it simpler?  
2. Is it more readable?  
3. Is it more premium?  
4. Would Apple / Linear / Stripe / Vercel ship it?

If not — refine it.

---

## File map

| Path | Role |
|---|---|
| `src/design-system/tokens.js` | JS tokens + `cssVars()` |
| `src/design-system/motion.js` | Framer presets · tween recipes |
| `src/design-system/primitives.css` | CSS component classes |
| `src/design-system/components/*` | React primitives |
| `src/design-system/index.js` | Public API |
| `src/context/ThemeContext.jsx` | Applies `--ds-*` + legacy aliases |
| `tailwind.config.js` | Tailwind bridge |
| `/ds-tokens` | Living documentation |

---

## Migrating a page

1. Prefer DS components (`Button`, `Card`, …) over local styles.  
2. Use `space` / `radius` / `color` from tokens — never hardcode.  
3. Brand red only where specified.  
4. Keep pages quiet; let hierarchy do the work.
