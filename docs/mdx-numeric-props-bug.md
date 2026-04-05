# next-mdx-remote v6: Numeric JSX Props Are Silently Dropped

## The Bug

`next-mdx-remote` v6 silently drops JSX expression props whose value is a number
literal during serialization. The prop never reaches the component, so it falls
back to its default value.

**Broken:**
```mdx
<CardGrid columns={2}>   <!-- columns arrives as undefined → defaults to 3 -->
<SomeComponent height={400}>
```

**Works:**
```mdx
<CardGrid columns="2">   <!-- string attribute survives serialization -->
<SomeComponent height="400">
```

## Why It Happens

`next-mdx-remote`'s `serialize()` compiles MDX to a JS string. Numeric literals
wrapped in `{}` (JSX expressions) are stripped from the compiled `_jsxDEV()` call
during this step. String attributes are preserved. There is no warning or error.

Verified with `next-mdx-remote@6.0.0` (the version in this project):

```js
// columns={2}  →  _jsxDEV(CardGrid, { children: ... })       ← columns missing
// columns="2"  →  _jsxDEV(CardGrid, { columns: "2", ... })   ← preserved
```

## Rule

**In all MDX entry bodies, use string attribute syntax for any numeric or boolean
prop on a DDS component:**

| Wrong | Correct |
|---|---|
| `columns={2}` | `columns="2"` |
| `columns={3}` | `columns="3"` |
| `height={400}` | `height="400"` |

The DDS components use string concatenation (`.concat(columns)`) to build CSS
class names, so string `"2"` and number `2` produce identical output.

## Affected Components (known)

- `CardGrid` — `columns` prop (defaults to `3` when dropped)
- Any DDS component that accepts numeric props

## AI Writing Agent Note

When drafting or improving MDX entries that use DDS components, always write
numeric props as string attributes (`columns="2"`, not `columns={2}`).
