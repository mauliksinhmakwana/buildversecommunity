
## What changes

1. **Logo swap (everywhere the Flame icon appears)**
   - Upload the attached "F" logo as a Lovable asset and import it as `src/assets/logo.png`.
   - Replace the `Flame` icon in `Navbar.tsx`, `Footer.tsx`, `auth.tsx`, and `reset-password.tsx` with a circular `<img src={logo}>` (rounded-full, same sizes as current icons: h-6/h-7).
   - Keep the soft blue glow halo behind it that the Flame currently has.
   - Update favicon and OG `theme-color` meta to blue.

2. **Theme recolor: orange → blue**
   In `src/styles.css`, change the primary token chain only:
   - `--primary` from orange `oklch(0.72 0.20 45)` → vivid blue `oklch(0.62 0.22 250)` (≈ #2f6bff)
   - `--primary-glow` → lighter blue `oklch(0.74 0.18 245)`
   - `--ring`, `--sidebar-primary`, gradient-primary, shadow-glow, ember-bg, grid-bg lines — all derived from `--primary`, so they update automatically. I'll double-check any hard-coded oranges (`#ff6a1a`, `bg-orange-*`) and convert them.
   - Keep background dark `#0a0a0a` and text tokens unchanged — only the accent flips.

3. **Sweep remaining "fire" semantics**
   - Replace `Flame` lucide icon usages used purely as decoration (e.g. streak badges in `FeaturedMembers`, `Hero`) with `Zap` so the brand no longer reads as fire. Streak counts/labels stay the same.
   - The `🔥` emoji in Hero stats line → `⚡`.

## Out of scope
- No layout, copy, component, or auth changes.
- Section names ("the forge", "streak burning") stay — only the visual fire iconography is removed.

## Technical notes
- Logo file becomes a Lovable asset pointer JSON so it isn't committed as a binary; imported via `import logo from "@/assets/logo.png.asset.json"` and rendered with `<img src={logo.url} />`.
- All color changes are token-level in `styles.css`; component files keep using `bg-primary`, `text-primary`, `gradient-primary`, etc., so no per-component color edits are needed beyond the Flame→logo swap.
