# MDX Code Blocks

This document covers how to add code blocks in MDX content.

## Fenced Code Blocks (Recommended)

Use standard markdown fenced code blocks with triple backticks. Syntax highlighting is automatic via `rehype-pretty-code`.

````mdx
```javascript
const greeting = 'Hello, world!';
console.log(greeting);
```
````

Supported languages include: javascript, typescript, jsx, tsx, json, bash, shell, python, rust, go, java, c, cpp, csharp, ruby, php, sql, yaml, markdown, html, css, scss, graphql, dockerfile, and more.

## CodeBlock Component

The `<CodeBlock>` component from DDS provides additional features like copy button, filename display, and line highlighting.

### Basic Usage

```mdx
<CodeBlock language="javascript" code="const x = 1;" />
```

### Multi-line Code

Use actual newlines within the string attribute:

```mdx
<CodeBlock
  language="javascript"
  code="const greeting = 'Hello, world!';
console.log(greeting);
const sum = (a, b) => a + b;"
/>
```

### With Filename

```mdx
<CodeBlock
  language="typescript"
  filename="utils.ts"
  code="export function add(a: number, b: number): number {
  return a + b;
}"
/>
```

## Known Limitations

### JSX Expressions Don't Work in Props

Due to how `next-mdx-remote` serializes MDX, JSX expression syntax `{...}` in component props does not work:

```mdx
<!-- ❌ Does NOT work -->

<CodeBlock language="javascript" code={`const x = 1;`} />
<CodeBlock language="javascript" code={'const x = 1;'} />

<!-- ✅ Works -->

<CodeBlock language="javascript" code="const x = 1;" />
```

### Quote Handling

Since the `code` attribute uses double quotes, use single quotes inside your code:

```mdx
<!-- ✅ Works -->

<CodeBlock language="javascript" code="const msg = 'Hello';" />

<!-- ❌ Breaks the attribute -->

<CodeBlock language="javascript" code="const msg = "Hello";" />
```

For code that requires double quotes, use fenced code blocks instead.

### Escape Characters

The `\n` escape sequence does not work. Use actual newlines:

```mdx
<!-- ❌ Does NOT work -->

<CodeBlock language="javascript" code="line1;\nline2;" />

<!-- ✅ Works -->

<CodeBlock
  language="javascript"
  code="line1;
line2;"
/>
```

## Recommendation

For most use cases, **fenced code blocks are simpler and more reliable**. Use the `<CodeBlock>` component only when you need its specific features (copy button styling, filename display, line highlighting).
