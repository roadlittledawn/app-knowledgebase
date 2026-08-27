/**
 * Converts entry body MDX (using the DDS component set from src/mdx-components.tsx)
 * into plain Markdown for LLM/agent consumption — no JSX, just Markdown a model can
 * read without knowing the component library. Regex-based by design (matching the
 * precedent in the sibling writing-samples-website project), tailored to the actual
 * component usage found in this app's stored entries rather than a generic MDX AST
 * transform.
 */

function extractAttr(attrs: string, name: string): string | undefined {
  const doubleQuoted = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
  if (doubleQuoted) return doubleQuoted[1];
  const braced = new RegExp(`\\b${name}=\\{['"\`]([\\s\\S]*?)['"\`]\\}`).exec(attrs);
  if (braced) return braced[1];
  return undefined;
}

function isExplicitlyFalse(attrs: string, name: string): boolean {
  return new RegExp(`\\b${name}=\\{\\s*false\\s*\\}|\\b${name}="false"`).test(attrs);
}

function unescapeJsString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\`/g, '`')
    .replace(/\\\\/g, '\\');
}

function transformLinks(md: string): string {
  return md.replace(
    /<Link\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/Link>/g,
    (_m, href: string, inner: string) => `[${inner.trim()}](${href})`
  );
}

function transformCodeBlocks(md: string): string {
  // <CodeBlock snippets={[{ code: "...", language: "...", tabTitle: "..." }, ...]} />
  md = md.replace(/<CodeBlock\b[^>]*\bsnippets=\{\[([\s\S]*?)\]\}[^>]*\/>/g, (_m, arrayBody: string) => {
    const itemRe =
      /code:\s*(["'`])((?:\\.|(?!\1)[\s\S])*)\1\s*,\s*language:\s*(["'`])((?:\\.|(?!\3)[\s\S])*)\3(?:\s*,\s*(?:tabTitle|filename):\s*(["'`])((?:\\.|(?!\5)[\s\S])*)\5)?/g;
    const blocks: string[] = [];
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = itemRe.exec(arrayBody)) !== null) {
      i++;
      const code = unescapeJsString(m[2]!);
      const language = m[4] || '';
      const label = m[6] || `Snippet ${i}`;
      blocks.push(`**${label}**\n\n\`\`\`${language}\n${code}\n\`\`\``);
    }
    return blocks.join('\n\n');
  });

  // <CodeBlock language="bash" code={`...multi-line, may contain > characters...`} />
  md = md.replace(
    /<CodeBlock\b([^`]*?)code=\{`([\s\S]*?)`\}([^`]*?)\/>/g,
    (_m, pre: string, code: string, post: string) => {
      const language = extractAttr(pre, 'language') || extractAttr(post, 'language') || '';
      return `\`\`\`${language}\n${code.trim()}\n\`\`\``;
    }
  );

  // <CodeBlock language="bash" code="single-line" />
  md = md.replace(
    /<CodeBlock\b([^>]*?)code="((?:\\.|[^"\\])*)"([^>]*?)\/>/g,
    (_m, pre: string, code: string, post: string) => {
      const language = extractAttr(pre, 'language') || extractAttr(post, 'language') || '';
      return `\`\`\`${language}\n${unescapeJsString(code)}\n\`\`\``;
    }
  );

  // <CodeBlock path="..." /> — loads from an external file we can't resolve here
  md = md.replace(
    /<CodeBlock\b[^>]*\bpath="([^"]+)"[^>]*\/>/g,
    (_m, path: string) => `> _Code example loaded from \`${path}\` (not available in this export)_`
  );

  return md;
}

function transformMermaid(md: string): string {
  md = md.replace(
    /<MermaidDiagram\b([^`]*?)chart=\{`([\s\S]*?)`\}([^`]*?)\/>/g,
    (_m, _pre: string, chart: string) => `\`\`\`mermaid\n${chart.trim()}\n\`\`\``
  );
  md = md.replace(
    /<MermaidDiagram\b[^>]*\bchart="((?:\\.|[^"\\])*)"[^>]*\/>/g,
    (_m, chart: string) => `\`\`\`mermaid\n${unescapeJsString(chart)}\n\`\`\``
  );
  return md;
}

function transformCallouts(md: string): string {
  return md.replace(/<Callout([^>]*)>([\s\S]*?)<\/Callout>/g, (_m, attrs: string, inner: string) => {
    const variant = extractAttr(attrs, 'variant') || 'important';
    const title = extractAttr(attrs, 'title');
    const label = title || variant.charAt(0).toUpperCase() + variant.slice(1);
    const lines = inner.trim().split('\n');
    const quoted = lines.map((l) => (l.trim() === '' ? '>' : `> ${l}`)).join('\n');
    return `> **${label}:**\n${quoted}`;
  });
}

function transformCollapsers(md: string): string {
  // (?![A-Za-z]) prevents matching the <CollapserGroup> wrapper as a bogus <Collapser> tag
  md = md.replace(/<Collapser(?![A-Za-z])([^>]*)>([\s\S]*?)<\/Collapser>/g, (_m, attrs: string, inner: string) => {
    const title = extractAttr(attrs, 'title') || 'Details';
    return `\n#### ${title}\n\n${inner.trim()}\n`;
  });
  return md.replace(/<\/?CollapserGroup[^>]*>/g, '');
}

function transformCards(md: string): string {
  // (?![A-Za-z]) prevents matching the <CardGrid> wrapper as a bogus <Card> tag
  md = md.replace(/<Card(?![A-Za-z])([^>]*)>([\s\S]*?)<\/Card>/g, (_m, attrs: string, inner: string) => {
    const title = extractAttr(attrs, 'title');
    const href = extractAttr(attrs, 'href');
    const content = inner.trim();
    if (!title) return content ? `${content}\n` : '';
    const heading = href ? `### [${title}](${href})` : `### ${title}`;
    return content ? `${heading}\n\n${content}\n` : `${heading}\n`;
  });
  return md.replace(/<\/?CardGrid[^>]*>/g, '');
}

function transformTables(md: string): string {
  return md.replace(/<Table[^>]*>([\s\S]*?)<\/Table>/g, (_m, tableInner: string) => {
    const extractCells = (row: string, tag: string): string[] => {
      const cells: string[] = [];
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(row)) !== null) {
        cells.push(
          m[1]!
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
        );
      }
      return cells;
    };

    const headMatch = tableInner.match(/<TableHead[^>]*>([\s\S]*?)<\/TableHead>/);
    const bodyMatch = tableInner.match(/<TableBody[^>]*>([\s\S]*?)<\/TableBody>/);

    const headers = headMatch ? extractCells(headMatch[1]!, 'TableHeaderCell') : [];
    const bodyRows: string[][] = [];
    if (bodyMatch) {
      const rowRe = /<TableRow[^>]*>([\s\S]*?)<\/TableRow>/g;
      let rm: RegExpExecArray | null;
      while ((rm = rowRe.exec(bodyMatch[1]!)) !== null) {
        bodyRows.push(extractCells(rm[1]!, 'TableCell'));
      }
    }

    if (!headers.length) return '';

    const headerLine = `| ${headers.join(' | ')} |`;
    const sepLine = `| ${headers.map(() => '---').join(' | ')} |`;
    const dataLines = bodyRows.map((r) => `| ${r.join(' | ')} |`);
    return [headerLine, sepLine, ...dataLines].join('\n');
  });
}

function transformTabs(md: string): string {
  return md.replace(/<Tabs[^>]*>([\s\S]*?)<\/Tabs>/g, (_m, tabsInner: string) => {
    const labelById = new Map<string, string>();
    const tabRe = /<Tab\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/Tab>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tabRe.exec(tabsInner)) !== null) {
      labelById.set(tm[1]!, tm[2]!.trim());
    }

    const panels: string[] = [];
    const panelRe = /<TabPanel\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/TabPanel>/g;
    let pm: RegExpExecArray | null;
    while ((pm = panelRe.exec(tabsInner)) !== null) {
      const label = labelById.get(pm[1]!) || pm[1]!;
      panels.push(`#### ${label}\n\n${pm[2]!.trim()}`);
    }

    return panels.join('\n\n');
  });
}

function transformLists(md: string): string {
  return md.replace(/<List([^>]*)>([\s\S]*?)<\/List>/g, (_m, attrs: string, inner: string) => {
    const ordered = !isExplicitlyFalse(attrs, 'ordered');
    const itemRe = /<List\.Item[^>]*>([\s\S]*?)<\/List\.Item>/g;
    const items: string[] = [];
    let match: RegExpExecArray | null;
    let idx = 0;
    while ((match = itemRe.exec(inner)) !== null) {
      idx++;
      const marker = ordered ? `${idx}. ` : '- ';
      const content = match[1]!.trim();
      const lines = content.split('\n');
      const formatted = lines
        .map((line, i) => {
          if (i === 0) return `${marker}${line}`;
          return line.trim() === '' ? '' : `   ${line}`;
        })
        .join('\n');
      items.push(formatted);
    }
    return items.join('\n\n');
  });
}

function transformGrid(md: string): string {
  return md.replace(/<\/?Grid[^>]*>/g, '').replace(/<\/?Column[^>]*>/g, '');
}

function transformHeadings(md: string): string {
  return md.replace(/<Heading([^>]*)>([\s\S]*?)<\/Heading>/g, (_m, attrs: string, inner: string) => {
    const levelMatch = /level=\{(\d+)\}/.exec(attrs);
    const level = levelMatch ? parseInt(levelMatch[1]!, 10) : 2;
    return `${'#'.repeat(level)} ${inner.trim()}`;
  });
}

function transformCodePlayground(md: string): string {
  return md.replace(/<CodePlayground([^>]*)\/>/g, (_m, attrs: string) => {
    const src = extractAttr(attrs, 'src') || '';
    const title = extractAttr(attrs, 'title') || 'Interactive code playground';
    const url = src.startsWith('//') ? `https:${src}` : src;
    return `[${title}](${url})`;
  });
}

export function mdxToMarkdown(mdx: string): string {
  let md = mdx;

  // Strip import/export statements
  md = md.replace(/^(import|export)\s+.*$/gm, '');

  // Leaf components first — no children that need prior transformation
  md = transformLinks(md);
  md = transformCodeBlocks(md);
  md = transformMermaid(md);

  // Block components that may wrap leaf components (already transformed above)
  md = transformCallouts(md);
  md = transformCollapsers(md); // before List: Collapsers are commonly nested inside List.Item
  md = transformCards(md);
  md = transformTables(md);
  md = transformTabs(md);
  md = transformLists(md); // last block transform: List.Item content should already be plain by now

  // Structural wrappers with no markdown equivalent — strip, keep content
  md = transformGrid(md);
  md = transformHeadings(md);
  md = transformCodePlayground(md);

  // Safety net for any stray wrapper tags left behind
  md = md.replace(/<\/?TabList[^>]*>/g, '');

  // Whitespace-only lines (e.g. leftover JSX indentation from stripped Grid/Column
  // wrappers) count as blank for the collapse below, but don't match \n{3,} as-is
  md = md.replace(/^[ \t]+$/gm, '');

  // Collapse excess blank lines
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}
