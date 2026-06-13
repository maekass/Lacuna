---
name: Tailwind v4 font theme trap
description: Why app-wide "wrong font" bugs in this project hide in the @theme inline block, not inline styles
---

# Tailwind v4 `@theme inline` font mapping trap

When fonts look wrong across the *entire* app (e.g. body/code rendering as a serif
display face), the cause is almost always the Tailwind v4 `@theme inline` block in
`artifacts/lacuna/src/app/globals.css` mapping `--font-sans` and/or `--font-mono`
to the display font (it was once set to `var(--font-playfair)`). Every Tailwind
`font-sans`/`font-mono` utility then resolves to that face.

**Why:** A prior task spent many turns stripping inline `fontFamily: 'Bodoni MT'` /
`'Arial Narrow'` overrides from a dozen components and the bug persisted — because
the real source was the theme variable, which a grep for font names won't surface.

**How to apply:** Before chasing per-component overrides, open the `@theme inline`
block and confirm `--font-sans` points at the body font (DM Sans) and `--font-mono`
at a real monospace stack. `:root` may define a correct `--font-sans`, but the
`@theme inline` value is what Tailwind utilities actually use — they can disagree.
Headings get Playfair via the explicit `h1..h4, .font-display` rule + `--font-display`.
