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
  Tabs,
  Tab,
  TabList,
  TabPanel,
  CodePlayground,
} from '@/mdx-components';

const components = {
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
