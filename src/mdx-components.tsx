import type { MDXComponents } from 'mdx/types';
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
} from '@roadlittledawn/docs-design-system-react';

// Custom CodePlayground component for iframe embeds (CodeSandbox, JSFiddle, CodePen)
interface CodePlaygroundProps {
  src: string;
  title?: string;
  height?: string | number;
}

function CodePlayground({ src, title = 'Code Playground', height = 400 }: CodePlaygroundProps) {
  return (
    <div className="my-4 overflow-hidden rounded-lg border border-[var(--border)]">
      <iframe
        src={src}
        title={title}
        width="100%"
        height={height}
        style={{ border: 0 }}
        allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
      />
    </div>
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // DDS components
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
    // Custom components
    CodePlayground,
    // Pass through any additional components
    ...components,
  };
}

// Export components for direct use in the app
export {
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
