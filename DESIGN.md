# Design System

## Theme & Palette

- **Mode Support**: Light (Primary) with dark-slate UI details.
- **Brand Colors**:
  - Primary (Avianca Red): `#E20613` (`--color-primary`) - Used for active states, primary branding, selection.
  - Secondary (Blue): `#3b82f6` (`--color-secondary`) - Used for services, standard occupied seats.
  - Neutral Dark (Slate 900): `#0f172a` (`--color-dark`) - Used for text, Diamond Elite tier card.
  - Accent/VIP (Amber 500): `#f59e0b` (`--color-accent`) - Used for Gold Elite tier, highlights.
  - Alert (Rose 600): `#e11d48` (`--color-alert`) - Used for NPS alerts, safety exit indicators.
  - Background (Slate 50): `#f8fafc` (`--color-bg`) - Overall page background.
  - Card/Surface: `#ffffff` (`--color-surface`) - Main component backgrounds.

## Typography

- **Heading Family**: `'Outfit', sans-serif`
- **Body Family**: `'Inter', sans-serif`
- **Typographic Scale**:
  - h1 (App title): font-black, italic, tracking-tight, uppercase
  - h2 (Section headers): font-black, text-lg, tracking-tighter, uppercase
  - body (Standard info): font-medium, text-xs/sm, text-slate-700
  - captions/eyebrows: font-bold, text-[9px]/[10px], text-slate-400, uppercase, tracking-wider

## Layout & Spacing

- **Grid Spacing**: 4px/8px rhythm (`--space-xs` = 4px, `--space-sm` = 8px, `--space-md` = 16px, `--space-lg` = 24px)
- **Bento Grid**: Used in dashboards to group metrics cleanly.
- **Fuselage Structure**: Double curved nose border (`rounded-t-[140px]`), exit indicator margins, aisle corridor lighting markers.

## Motion & Transitions

- **Duration Guidelines**:
  - Tactile micro-interactions (hover, active scale): 150-250ms
  - Structural overlays (modals, list entrances): 250-350ms
- **Transitions**:
  - Smooth fade and slide entrances (`animate-in fade-in slide-in-from-bottom-4`)
  - Scaling tactile feedback on click (`active:scale-95`)
  - Glowing alert animation for NPS recovering indicators (`animate-glow-rose` using breathing box-shadow pulses).
