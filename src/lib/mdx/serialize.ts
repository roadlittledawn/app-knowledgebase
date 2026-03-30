import { serialize } from 'next-mdx-remote/serialize';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';

let highlighter: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        'javascript',
        'typescript',
        'jsx',
        'tsx',
        'json',
        'bash',
        'shell',
        'python',
        'rust',
        'go',
        'java',
        'c',
        'cpp',
        'csharp',
        'ruby',
        'php',
        'sql',
        'yaml',
        'markdown',
        'html',
        'css',
        'scss',
        'graphql',
        'dockerfile',
        'plaintext',
      ],
    });
  }
  return highlighter;
}

interface SerializeOptions {
  theme?: 'dark' | 'light';
}

export async function serializeMDX(
  source: string,
  options: SerializeOptions = {}
): Promise<MDXRemoteSerializeResult> {
  const { theme = 'dark' } = options;
  const hl = await getHighlighter();
  const shikiTheme = theme === 'dark' ? 'github-dark' : 'github-light';

  const result = await serialize(source, {
    mdxOptions: {
      rehypePlugins: [
        () => (_tree) => {
          // Process code blocks for syntax highlighting
          const visit = async (node: unknown) => {
            const n = node as {
              type?: string;
              tagName?: string;
              children?: unknown[];
              properties?: Record<string, unknown>;
              value?: string;
            };
            if (n.type === 'element' && n.tagName === 'pre') {
              const codeNode = n.children?.[0] as
                | {
                    tagName?: string;
                    properties?: { className?: string[] };
                    children?: { value?: string }[];
                  }
                | undefined;
              if (codeNode?.tagName === 'code') {
                const className = codeNode.properties?.className?.[0] || '';
                const langMatch = className.match(/language-(\w+)/);
                const lang = (langMatch?.[1] || 'plaintext') as BundledLanguage;
                const code = codeNode.children?.[0]?.value || '';

                try {
                  const highlighted = hl.codeToHtml(code, {
                    lang,
                    theme: shikiTheme,
                  });
                  // Replace the pre element with highlighted HTML
                  n.type = 'raw';
                  (n as { value: string }).value = highlighted;
                } catch {
                  // If language not supported, fall back to plaintext
                  const highlighted = hl.codeToHtml(code, {
                    lang: 'plaintext',
                    theme: shikiTheme,
                  });
                  n.type = 'raw';
                  (n as { value: string }).value = highlighted;
                }
              }
            }
            if (n.children) {
              for (const child of n.children) {
                await visit(child);
              }
            }
          };
          return async (tree: { children?: unknown[] }) => {
            if (tree.children) {
              for (const child of tree.children) {
                await visit(child);
              }
            }
          };
        },
      ],
    },
  });

  return result;
}

export type { MDXRemoteSerializeResult };
