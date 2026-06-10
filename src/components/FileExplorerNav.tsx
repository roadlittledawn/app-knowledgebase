'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, Folder, FolderOpen, FileText } from 'lucide-react';
import type { FileExplorerTreeNode } from '@/types/category';

const STORAGE_KEY = 'nav-expanded-ids';

interface FileExplorerNavProps {
  tree: FileExplorerTreeNode[];
  activeEntrySlug?: string;
  onEntryClick?: () => void;
}

interface CategoryNodeProps {
  node: FileExplorerTreeNode;
  level: number;
  activeEntrySlug?: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onEntryClick?: () => void;
}

function CategoryNode({
  node,
  level,
  activeEntrySlug,
  expandedIds,
  onToggle,
  onEntryClick,
}: CategoryNodeProps) {
  const hasChildren = node.children.length > 0 || node.entries.length > 0;
  const isExpanded = expandedIds.has(node._id);

  const handleToggle = () => {
    onToggle(node._id);
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        className={`
          w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-sm rounded-md
          cursor-pointer transition-colors duration-150
          hover:bg-[var(--color-surface-hover)] text-[var(--color-foreground)]
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <ChevronRight
            className={`w-3.5 h-3.5 flex-shrink-0 text-[var(--color-foreground-muted)] transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
          />
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 flex-shrink-0 text-[var(--color-primary)]" />
        ) : (
          <Folder className="w-4 h-4 flex-shrink-0 text-[var(--color-foreground-muted)]" />
        )}
        <span className="flex-1 truncate">{node.name}</span>
        {node.totalEntryCount > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-foreground-muted)]">
            {node.totalEntryCount}
          </span>
        )}
      </button>

      {isExpanded && (
        <div>
          {node.children.map((child) => (
            <CategoryNode
              key={child._id}
              node={child}
              level={level + 1}
              activeEntrySlug={activeEntrySlug}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onEntryClick={onEntryClick}
            />
          ))}
          {node.entries.map((entry) => (
            <Link
              key={entry._id}
              href={`/browse/${entry.slug}`}
              onClick={onEntryClick}
              className={`
                flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-md
                transition-colors duration-150
                ${
                  activeEntrySlug === entry.slug
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                    : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-foreground-secondary)]'
                }
              `}
              style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
            >
              <FileText
                className={`w-3.5 h-3.5 flex-shrink-0 ${
                  activeEntrySlug === entry.slug
                    ? 'text-[var(--color-primary-foreground)]'
                    : 'text-[var(--color-foreground-muted)]'
                }`}
              />
              <span className="flex-1 truncate">{entry.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function findAncestorsOfEntry(
  nodes: FileExplorerTreeNode[],
  slug: string,
  path: string[] = []
): string[] | null {
  for (const node of nodes) {
    if (node.entries.some((e) => e.slug === slug)) {
      return [...path, node._id];
    }
    const found = findAncestorsOfEntry(node.children, slug, [...path, node._id]);
    if (found) return found;
  }
  return null;
}

export function FileExplorerNav({ tree, activeEntrySlug, onEntryClick }: FileExplorerNavProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    let initial = new Set<string>();

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          initial = new Set(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
    }

    if (activeEntrySlug) {
      const ancestors = findAncestorsOfEntry(tree, activeEntrySlug);
      if (ancestors) {
        ancestors.forEach((id) => initial.add(id));
      }
    }

    return initial;
  });


  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedIds]));
    } catch {
      // ignore
    }
  }, [expandedIds]);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <nav className="py-2" aria-label="File explorer navigation">
      {tree.map((node) => (
        <CategoryNode
          key={node._id}
          node={node}
          level={0}
          activeEntrySlug={activeEntrySlug}
          expandedIds={expandedIds}
          onToggle={handleToggle}
          onEntryClick={onEntryClick}
        />
      ))}
    </nav>
  );
}
