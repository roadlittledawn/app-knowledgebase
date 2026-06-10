'use client';

import { type ReactNode } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

interface ResizableLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  rightSidebar?: ReactNode;
}

export function ResizableLayout({ sidebar, children, rightSidebar }: ResizableLayoutProps) {
  return (
    <>
      {/* Desktop: resizable panels (lg+) */}
      <div className="hidden lg:flex flex-1 min-h-0">
        <Group orientation="horizontal" id="nav-layout">
          <Panel
            id="nav-sidebar"
            defaultSize="20%"
            minSize="14%"
            maxSize="35%"
            className="border-r border-[var(--color-border)] bg-[var(--color-background-secondary)]"
          >
            <div className="h-full overflow-y-auto p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
                Browse
              </h2>
              {sidebar}
            </div>
          </Panel>
          <Separator className="w-1.5 bg-transparent hover:bg-[var(--color-border)] active:bg-[var(--color-primary)] transition-colors cursor-col-resize" />
          <Panel id="main-content" minSize="40%">
            {children}
          </Panel>
          {rightSidebar && (
            <>
              <Separator className="w-1.5 bg-transparent hover:bg-[var(--color-border)] active:bg-[var(--color-primary)] transition-colors cursor-col-resize" />
              <Panel id="right-sidebar" defaultSize="20%" minSize="14%" maxSize="30%">
                {rightSidebar}
              </Panel>
            </>
          )}
        </Group>
      </div>

      {/* Mobile: stacked (below lg) */}
      <div className="flex flex-col flex-1 min-h-0 lg:hidden">
        {children}
      </div>
    </>
  );
}
