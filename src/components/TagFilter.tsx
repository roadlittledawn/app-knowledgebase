'use client';

/**
 * TagFilter Component
 * Multi-select filter component for tags, topics, and languages
 *
 * Requirements:
 * - 13.4: Provide a TagFilter component for multi-select filtering on the browse page
 */

import { useState, useRef, useEffect } from 'react';

interface FilterSection {
  label: string;
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
}

interface TagFilterProps {
  tags: string[];
  topics: string[];
  languages: string[];
  selectedTags: string[];
  selectedTopics: string[];
  selectedLanguages: string[];
  onTagsChange: (tags: string[]) => void;
  onTopicsChange: (topics: string[]) => void;
  onLanguagesChange: (languages: string[]) => void;
  onClearAll: () => void;
}

function FilterDropdown({ section }: { section: FilterSection }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCount = section.selected.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border
          transition-colors
          ${
            selectedCount > 0
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]'
          }
          hover:bg-[var(--color-surface-hover)]
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{section.label}</span>
        {selectedCount > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-[var(--color-primary)] text-white">
            {selectedCount}
          </span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && section.items.length > 0 && (
        <div
          className="absolute z-10 mt-1 w-56 max-h-60 overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
          role="listbox"
          aria-label={`Select ${section.label.toLowerCase()}`}
        >
          <ul className="py-1">
            {section.items.map((item) => {
              const isSelected = section.selected.includes(item);
              return (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => section.onToggle(item)}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                      hover:bg-[var(--color-surface-hover)]
                      ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-foreground)]'}
                    `}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span
                      className={`
                        flex-shrink-0 w-4 h-4 rounded border
                        ${
                          isSelected
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                            : 'border-[var(--color-border)]'
                        }
                      `}
                    >
                      {isSelected && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">{item}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isOpen && section.items.length === 0 && (
        <div className="absolute z-10 mt-1 w-56 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg p-3">
          <p className="text-sm text-[var(--color-foreground-muted)]">
            No {section.label.toLowerCase()} available
          </p>
        </div>
      )}
    </div>
  );
}

export function TagFilter({
  tags,
  topics,
  languages,
  selectedTags,
  selectedTopics,
  selectedLanguages,
  onTagsChange,
  onTopicsChange,
  onLanguagesChange,
  onClearAll,
}: TagFilterProps) {
  const toggleItem = (item: string, selected: string[], onChange: (items: string[]) => void) => {
    if (selected.includes(item)) {
      onChange(selected.filter((i) => i !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  const sections: FilterSection[] = [
    {
      label: 'Topics',
      items: topics,
      selected: selectedTopics,
      onToggle: (item) => toggleItem(item, selectedTopics, onTopicsChange),
    },
    {
      label: 'Tags',
      items: tags,
      selected: selectedTags,
      onToggle: (item) => toggleItem(item, selectedTags, onTagsChange),
    },
    {
      label: 'Languages',
      items: languages,
      selected: selectedLanguages,
      onToggle: (item) => toggleItem(item, selectedLanguages, onLanguagesChange),
    },
  ];

  const totalSelected = selectedTags.length + selectedTopics.length + selectedLanguages.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {sections.map((section) => (
        <FilterDropdown key={section.label} section={section} />
      ))}

      {totalSelected > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="px-3 py-1.5 text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
        >
          Clear all ({totalSelected})
        </button>
      )}
    </div>
  );
}

export default TagFilter;
