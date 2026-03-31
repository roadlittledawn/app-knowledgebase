import { serialize } from 'next-mdx-remote/serialize';
import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import { createHighlighter, type Highlighter } from 'shiki';
import remarkGfm from 'remark-gfm';
import rehypePrettyCode from 'rehype-pretty-code';
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

// Custom rehype plugin to unwrap block elements from paragraphs
// This fixes the "p cannot be descendant of p" hydration error
function rehypeUnwrapBlocks() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'p' || !parent || index === undefined) return;

      // Check if paragraph contains only block-level elements or JSX
      const hasBlockChild = node.children.some((child) => {
        if (child.type === 'element') {
          const blockTags = [
            'div',
            'pre',
            'ul',
            'ol',
            'table',
            'blockquote',
            'figure',
            'section',
            'article',
            'aside',
            'header',
            'footer',
            'nav',
            'main',
          ];
          return blockTags.includes(child.tagName);
        }
        // MDX JSX elements
        if (child.type === 'mdxJsxFlowElement' || child.type === 'mdxJsxTextElement') {
          return true;
        }
        return false;
      });

      if (hasBlockChild && 'children' in parent) {
        // Replace the p with its children
        (parent.children as (typeof node)[]).splice(index, 1, ...(node.children as Element[]));
      }
    });
  };
}

export async function serializeMDX(
  source: string,
  options: SerializeOptions = {}
): Promise<MDXRemoteSerializeResult> {
  const { theme = 'dark' } = options;
  const shikiTheme = theme === 'dark' ? 'github-dark' : 'github-light';

  const result = await serialize(source, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        [
          rehypePrettyCode,
          {
            theme: shikiTheme,
            getHighlighter,
          },
        ],
        rehypeUnwrapBlocks,
      ],
    },
  });

  return result;
}

export type { MDXRemoteSerializeResult };
