import { serialize } from 'next-mdx-remote/serialize';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';
import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

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

  // Create a rehype plugin that uses the pre-initialized highlighter
  const rehypeShiki = () => {
    return (tree: Root) => {
      visit(tree, 'element', (node: Element) => {
        if (node.tagName !== 'pre') return;

        const codeNode = node.children?.[0] as Element | undefined;
        if (!codeNode || codeNode.tagName !== 'code') return;

        const className = (codeNode.properties?.className as string[])?.[0] || '';
        const langMatch = className.match(/language-(\w+)/);
        const lang = (langMatch?.[1] || 'plaintext') as BundledLanguage;

        const textNode = codeNode.children?.[0];
        const code = textNode && 'value' in textNode ? (textNode.value as string) : '';

        if (!code) return;

        try {
          const highlighted = hl.codeToHtml(code, {
            lang,
            theme: shikiTheme,
          });
          // Replace the pre element with raw HTML
          (node as unknown as { type: string; value: string }).type = 'raw';
          (node as unknown as { type: string; value: string }).value = highlighted;
        } catch {
          // If language not supported, fall back to plaintext
          try {
            const highlighted = hl.codeToHtml(code, {
              lang: 'plaintext',
              theme: shikiTheme,
            });
            (node as unknown as { type: string; value: string }).type = 'raw';
            (node as unknown as { type: string; value: string }).value = highlighted;
          } catch {
            // Leave as-is if highlighting fails completely
          }
        }
      });
    };
  };

  const result = await serialize(source, {
    mdxOptions: {
      rehypePlugins: [rehypeShiki],
    },
  });

  return result;
}

export type { MDXRemoteSerializeResult };
