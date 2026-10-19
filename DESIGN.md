# Design System

Dark "night cabin" instrument for cabin crew: graphite surfaces, one Avianca-red ember glow, white pill actions. Operate mode: the map is the product; chrome stays quiet.

## Theme & Palette

- **Modes**: Dark (night/dim cabins) and Light (daylight/glare), switched with the sun/moon button in the top bar. `<html data-theme="dark|light">` is set before first paint from `localStorage.theme`, falling back to the OS preference.
- **Light**: canvas `#f3f1ee`, panels `#ffffff`, text `#12141a` / `#3a4150` / `#5a6270`, brand text `#c4000f`. Tokens flip in `:root[data-theme='light']`; components use tokens only, with `dark:` variants for tinted text (`text-amber-700 dark:text-amber-300`).
- **Tokens** (`src/styles.css`, `@theme`):
  - `--color-ink` `#0b0c0f`: canvas, with two faint radial glows (Avianca red top-left, ember top-right)
  - `--color-panel` `#13151a`, `--color-panel-2` `#1a1d24`, `--color-panel-3` `#232730`: surfaces
  - `--color-line` / `--color-line-strong`: white at 8% / 16%, the only elevation device (border, no shadow)
  - `--color-fg` `#f5f5f6`, `--color-fg-2` `#c9ccd3`, `--color-fg-3` `#9da3af`: text, all >= 4.5:1 on panel
  - `--color-brand` `#e20613` (fills; white text 4.9:1), `--color-brand-hi` `#ff2d3b` (hover), `--color-brand-text` `#ff6670` (red text on dark, 5.6:1)
- **Semantic**: Magno purple gradient, Diamond silver, Gold amber, NPS alert rose, comanda complete emerald. Tier colors mark status only; they are not decoration.
- **Selection**: white ring with ink offset (red is reserved for brand, primary action, and alerts).

## Typography

- **Display**: `Outfit` (route codes, headings), medium weight, tight tracking (not below -0.04em)
- **Body/UI**: `Hanken Grotesk`, tabular numerals on
- **Scale**: 12px floor for data and labels (11px only for uppercase micro-labels), 14px body, 16-18px section titles, 36-60px for route codes.
- No italic, no all-caps black headings.

## Layout & Spacing

- App shell: 64px top bar, flight strip (origin → destination as the dominant element), then a two-column grid on >= 1024px: seat map (fluid) + stats panel (340-420px). Single column below.
- Touch: seats are 44x44 with 8px gaps; pills and buttons are 44px high.
- Fuselage: rounded nose, hairline border, one red glow at the nose; seats outlined when free, filled when occupied.

## Components

- **Primary action**: white pill (`bg-fg text-ink`), turning red on hover or when in progress. Comanda state: white (empty), red (in progress), emerald (complete).
- **Panels**: `.glass-panel` (translucent graphite, 18px blur, hairline border), radius 24px.
- **Seats**: free = transparent + hairline; occupied = `panel-3`; tiers as above; every seat has an `aria-label` and the map has a legend.
- **Badges**: 20px circles with 11px icons on seat corners.
- **Dialogs**: `role="dialog"`, close on Escape and backdrop.

## Motion

- 150-250ms feedback, 300ms for overlays; exponential ease-out.
- NPS alert glow is the only looping animation. `prefers-reduced-motion` collapses all motion.
