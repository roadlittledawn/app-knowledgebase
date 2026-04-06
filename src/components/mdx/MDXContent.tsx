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
  h2: ({ children }: HeadingElementProps) => {
    const text = extractTextContent(children);
    const id = slugify(text) || undefined;
    return (
      <Heading level={2} id={id}>
        {children}
      </Heading>
    );
  },
  h3: ({ children }: HeadingElementProps) => {
    const text = extractTextContent(children);
    const id = slugify(text) || undefined;
    return (
      <Heading level={3} id={id}>
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
  return (
    <MDXErrorBoundary resetKeys={[source]}>
      <MDXRemote {...source} components={components} />
    </MDXErrorBoundary>
  );
}
