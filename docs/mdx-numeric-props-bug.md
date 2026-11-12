# next-mdx-remote v6: JSX Expression Props Were Silently Dropped (fixed)

## Symptom

JSX expression props in MDX entries never reached the component:

```mdx
<Heading level={2}>Title</Heading>   <!-- rendered as <hundefined> -->
<CardGrid columns={2}>               <!-- columns undefined → defaults to 3 -->
```

String attributes (`columns="2"`) worked.

## Root Cause

`next-mdx-remote@6`'s `serialize()` defaults to **`blockJS: true`**. That setting
enables the `removeJavaScriptExpressions` remark plugin
(`node_modules/next-mdx-remote/dist/plugins/remove-javascript-expressions.js`),
which removes **every** JSX attribute whose value is a `{...}` expression, along with
inline `{expr}` text nodes. It gives no warning. Numbers aren't special here.
`{false}`, `{[...]}` and `{{...}}` were dropped as well.

DDS `Heading` builds its tag with `"h".concat(level)`, so a missing `level`
renders `<hundefined>`.

## Fix

`src/lib/mdx/serialize.ts` passes `blockJS: false` to `serialize()`. Expression
props now work. `blockDangerousJS` stays at its default of `true`, which still
blocks dangerous globals (`eval`, `Function`, `process`, etc.). This is acceptable
because only the single admin user writes MDX.

**Do not remove `blockJS: false`** or expression props will break again.

## Authoring

`columns={2}` and `columns="2"` both work now. DDS components that build class
names by string concatenation produce the same output for either form.
