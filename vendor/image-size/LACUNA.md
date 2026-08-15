# Vendored `image-size` 2.0.3 (Lacuna)

Copy of published [`image-size@2.0.2`](https://www.npmjs.com/package/image-size)
with hang guards. npm still has no `2.0.3` (advisories list
`>=2.0.3`; see [github/advisory-database#9028](https://github.com/github/advisory-database/issues/9028)).

This tree is versioned **2.0.3** so Dependabot / `npm audit` ranges
(`<=2.0.2`) resolve. Drop the override when registry `2.0.3+` exists.

## Advisories

- [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) —
  ICNS entry length `0` never advances `imageOffset`
- [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) —
  JXL `jxlp` / HEIF `ispe` box `size === 0` never advances the caller offset

Upstream `findBox` already skips zero-size boxes; the loops that hang are
the **callers** that do `offset = box.offset + box.size`.

## Patch

In every bundled CJS/ESM copy (entry + `dist/types/*`):

- ICNS: `break` when entry length `< 8`
- HEIF: `break` when `ispeBox.size <= 0`
- JXL: `break` when `jxlpBox.size <= 0`

MIT license of the original package is in `LICENSE`.
