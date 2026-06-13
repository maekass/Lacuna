---
name: Lacuna spatial depth system
description: The "Stratified Depth" visual system and its performance/accessibility constraints
---

# "Stratified Depth" spatial UI system

Lacuna's visual language is layered depth (not flat): elevation tokens
(`--elev-1..--elev-float`), `.depth-card` (hover lift), `.glass-layer` /
`.glass-layer-tint` (backdrop-blur strata), and a fixed `.ambient-field` of
blurred brand-color orbs that parallax on scroll (`AmbientDepth.tsx`, framer-motion
`useScroll`/`useTransform`). Section reveal is a Z-axis rise (`MotionSection` uses
`whileInView` opacity+y+scale, `once:true`). All tokens/utilities live in `globals.css`.

**Why these constraints exist (perf on a data-dense app):**
- Do NOT animate `filter: blur()` on `MotionSection` — sections wrap charts/SVG
  dashboards and blur forces expensive repaints. Reveal uses opacity/translate/scale only.
- The `.ambient-field` is `display:none` under 768px — three 520–640px orbs at
  `blur(90px)` plus backdrop-filter glass are too GPU-heavy for mobile.
- Decorative orbs are `aria-hidden`; `prefers-reduced-motion` drops the parallax
  transform and the `.depth-card` hover lift.

**How to apply:** Reuse `.depth-card` / `.glass-layer` / `.elev-*` for new surfaces
rather than ad-hoc shadows. Keep the no-blur-animation and mobile-ambient-off rules
when extending the system. Stacking: ambient field `z-0` fixed, content wrapper
`relative z-10`, sticky header `z-50` inside it.
