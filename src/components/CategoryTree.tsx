'use client';

/**
 * CategoryTree Component
 * Hierarchical navigation component for browsing categories
 *
 * Requirements:
 * - 4.1: Display categories hierarchically based on the Category collection
 * - 4.2: When a user selects a category, display entries belonging to that category
 * - 4.8: Display the count of entries in each category
 */

import { useState, useCallback } from 'react';
import type { CategoryTreeNode } from '@/types/category';

interface CategoryTreeProps {
  tree: CategoryTreeNode[];
  selectedCategoryId?: string;
  onSelect: (categoryId: string | null) => void;
}

interface CategoryNodeProps {
  node: CategoryTreeNode;
  level: number;
  selectedCategoryId?: string;
  expandedIds: Set<string>;
  onSelect: (categoryId: string | null) => void;
  onToggle: (categoryId: string) => void;
}

function CategoryNode({
  node,
  level,
  selectedCategoryId,
  expandedIds,
  onSelect,
  onToggle,
}: CategoryNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node._id);
  const isSelected = selectedCategoryId === node._id;

  const handleClick = () => {
    onSelect(node._id);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node._id);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`
          w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-md
          cursor-pointer transition-colors duration-150
          ${
            isSelected
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
              : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-foreground)]'
          }
        `}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {hasChildren && (
          <span
            onClick={handleToggle}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center cursor-pointer"
          >
            <svg
              className={`w-3 h-3 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
        {!hasChildren && <span className="w-4" />}
        <span className="flex-1 truncate">{node.name}</span>
        {node.entryCount > 0 && (
          <span
            className={`
              text-xs px-1.5 py-0.5 rounded-full
              ${
                isSelected
                  ? 'bg-[var(--color-primary-foreground)]/20 text-[var(--color-primary-foreground)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-foreground-muted)]'
              }
            `}
          >
            {node.entryCount}
          </span>
        )}
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <CategoryNode
              key={child._id}
              node={child}
              level={level + 1}
              selectedCategoryId={selectedCategoryId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryTree({ tree, selectedCategoryId, onSelect }: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Auto-expand categories that contain the selected category
    const expanded = new Set<string>();
    if (selectedCategoryId) {
      const findAndExpand = (nodes: CategoryTreeNode[], path: string[] = []): boolean => {
        for (const node of nodes) {
          if (node._id === selectedCategoryId) {
            path.forEach((id) => expanded.add(id));
            return true;
          }
          if (node.children.length > 0) {
            if (findAndExpand(node.children, [...path, node._id])) {
              return true;
            }
          }
        }
        return false;
      };
      findAndExpand(tree);
    }
    return expanded;
  });

  const handleToggle = useCallback((categoryId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = () => {
    onSelect(null);
  };

  return (
    <nav className="py-2" aria-label="Category navigation">
      <button
        onClick={handleSelectAll}
        className={`
          w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-md
          cursor-pointer transition-colors duration-150 font-medium
          ${
            !selectedCategoryId
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
              : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-foreground)]'
          }
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
        <span>All Entries</span>
      </button>
      <div className="mt-2">
        {tree.map((node) => (
          <CategoryNode
            key={node._id}
            node={node}
            level={0}
            selectedCategoryId={selectedCategoryId}
            expandedIds={expandedIds}
            onSelect={onSelect}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </nav>
  );
}
