---
name: Vite dep re-optimization transient hook error
description: After adding a new client dep, Vite re-optimizes + reloads, which can briefly throw "Invalid hook call / multiple copies of React" that self-resolves.
---

After installing a new client-side dependency, the Vite dev server logs
"new dependencies optimized: <pkg>" then "optimized dependencies changed.
reloading". During that reload it can momentarily throw runtime errors like
"Invalid hook call" or "null is not an object (evaluating 'dispatcher.useEffect')",
often surfacing through the app's root provider (e.g. QueryClientProvider).

**Why:** The dep pre-bundle swap happens mid-render. It is NOT a real
duplicate-React bug as long as `resolve.dedupe: ["react","react-dom"]` is set in
vite.config and the lockfile resolves a single React version.

**How to apply:** Don't chase it as a duplicate-React problem. Restart the
workflow (or reload the page) and re-check — if it's gone, it was transient.
Only investigate dedupe / peer resolution if the error persists after a clean
restart.
