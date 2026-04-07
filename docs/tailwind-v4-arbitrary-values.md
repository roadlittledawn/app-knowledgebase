# Tailwind v4: Arbitrary Values Not Reliably Applied

## The Problem

Tailwind v4's JIT engine sometimes fails to generate or apply utility classes that
use arbitrary values (the `[value]` bracket syntax), such as `max-h-[375px]` or
`pb-[40px]`. The class appears in source but has no effect in the browser. The
failure is silent — no build error, no warning.

**Observed behavior in this project:**

- `max-h-[375px]` on a scrollable `<ul>` — element grew to fit content, ignoring the cap
- `pb-8` / `pb-16` (standard scale) also had no effect inside the same overflow container
- `pb-32` did apply, suggesting inconsistent class generation rather than a
  systematic overflow/layout issue

## Rule

**Do not use Tailwind arbitrary value classes for sizing/spacing on elements where
the value matters precisely.** Use inline styles instead:

```tsx
// Wrong — may silently not apply
<ul className="max-h-[375px] overflow-y-auto pb-8">

// Correct — always applies
<ul className="overflow-y-auto" style={{ maxHeight: '375px', paddingBottom: '2.5rem' }}>
```

## When to Use Inline Styles

Use inline styles (not Tailwind arbitrary values) for:

- `maxHeight` / `minHeight` on scroll containers
- `paddingBottom` inside `overflow-y-auto` elements
- Any sizing value that is load-bearing for layout or UX

Standard Tailwind scale classes (`p-4`, `max-h-96`, etc.) and named utilities
(`overflow-y-auto`, `flex`, etc.) are fine — this issue is specific to the
`[value]` arbitrary syntax.

## Affected Areas (known)

- `OnThisPage.tsx` — `<ul>` scroll container: `maxHeight` and `paddingBottom`
  moved to inline styles after Tailwind arbitrary values had no effect.
