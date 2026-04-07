'use client';

import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote';
import { MDXErrorBoundary } from '@/components/ErrorBoundary';
import {
  Callout,
  Card,
  CardGrid,
  CodeBlock,
  Collapser,
  CollapserGroup,
  Column,
  Grid,
  Link,
  List,
  ListItem,
  Popover,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Tabs,
  Tab,
  TabList,
  TabPanel,
  CodePlayground,
  Heading,
} from '@/mdx-components';
import type { ReactNode, ReactElement } from 'react';

/**
 * Extract text content from React children recursively
 */
function extractTextContent(children: ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }
  if (typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(extractTextContent).join('');
  }
  if (children && typeof children === 'object' && 'props' in children) {
    const element = children as ReactElement<{ children?: ReactNode }>;
    return extractTextContent(element.props?.children);
  }
  return '';
}

/**
 * Generate a URL-safe slug from a text string
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface HeadingElementProps {
  children?: ReactNode;
  id?: string;
  className?: string;
  [key: string]: unknown;
}

// Track seen slugs within a render to deduplicate
const seenSlugs = new Map<string, number>();

/**
 * Get a unique ID for a heading, deduplicating if needed
 */
function getUniqueId(baseSlug: string, explicitId?: string): string | undefined {
  // Use explicit ID if provided by author
  if (explicitId) return explicitId;

  if (!baseSlug) return undefined;

  const count = seenSlugs.get(baseSlug) || 0;
  seenSlugs.set(baseSlug, count + 1);

  return count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
}

interface CodeElementProps {
  className?: string;
  children?: ReactNode;
}

interface PreProps {
  children?: ReactNode;
  [key: string]: unknown;
}

const components = {
  h2: ({ children, id: explicitId, ...props }: HeadingElementProps) => {
    const text = extractTextContent(children);
    const id = getUniqueId(slugify(text), explicitId);
    return (
      <Heading level={2} id={id} {...props}>
        {children}
      </Heading>
    );
  },
  h3: ({ children, id: explicitId, ...props }: HeadingElementProps) => {
    const text = extractTextContent(children);
    const id = getUniqueId(slugify(text), explicitId);
    return (
      <Heading level={3} id={id} {...props}>
        {children}
      </Heading>
    );
  },
  Callout,
  Card,
  CardGrid,
  CodeBlock,
  pre: ({ children, ...props }: PreProps) => {
    // Check if this is a code block (pre > code)
    if (children && typeof children === 'object' && 'type' in children) {
      const childElement = children as ReactElement<CodeElementProps>;
      if (childElement.type === 'code') {
        const codeProps = childElement.props || {};
        const className = codeProps.className || '';
        const language = className.replace('language-', '') || 'text';

        // Extract text content from the code element
        const codeContent = extractTextContent(codeProps.children);

        return <CodeBlock code={codeContent} language={language} />;
      }
    }
    // Fallback for other pre elements (like those processed by rehype-pretty-code)
    return <pre {...props}>{children}</pre>;
  },
  Collapser,
  CollapserGroup,
  Column,
  Grid,
  Link,
  List,
  ListItem,
  Popover,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Tabs,
  Tab,
  TabList,
  TabPanel,
  CodePlayground,
};

interface MDXContentProps {
  source: MDXRemoteSerializeResult;
}

export function MDXContent({ source }: MDXContentProps) {
  // Reset slug deduplication map on each render
  seenSlugs.clear();

  return (
    <MDXErrorBoundary resetKeys={[source]}>
      <MDXRemote {...source} components={components} />
    </MDXErrorBoundary>
  );
}
