'use client';

import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote';
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
  CodePlayground,
};

interface MDXContentProps {
  source: MDXRemoteSerializeResult;
}

export function MDXContent({ source }: MDXContentProps) {
  return <MDXRemote {...source} components={components} />;
}
