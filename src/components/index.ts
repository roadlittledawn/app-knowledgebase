// React components
// This directory contains:
// - UI components (ThemeToggle, TopNav, etc.)
// - Feature components (CategoryTree, EntryEditor, etc.)
// - MDX components (Callout, CodeBlock, etc.)

// Theme components
export { ThemeProvider, useTheme } from './ThemeProvider';
export { ThemeToggle } from './ThemeToggle';

// Navigation components
export { TopNav } from './TopNav';

// Browse components
export { CategoryTree } from './CategoryTree';
export { EntryCard } from './EntryCard';
export { EntryMetadata } from './EntryMetadata';
export { Breadcrumbs } from './Breadcrumbs';
export { RelatedEntries } from './RelatedEntries';
export { ExternalResources } from './ExternalResources';

// Search components
export { SearchBar } from './SearchBar';
export { SearchResults } from './SearchResults';

// Filter components
export { TagFilter } from './TagFilter';

// Editor components
export { EntryEditor } from './EntryEditor';
export { FrontmatterForm } from './FrontmatterForm';
export { CategoryPicker } from './CategoryPicker';
export { MonacoPane } from './MonacoPane';
export { PreviewPane } from './PreviewPane';

// Chat components
export { ChatInterface } from './ChatInterface';
export { ChatInput } from './ChatInput';
export { MessageList, type ChatMessage } from './MessageList';
export { MessageBubble } from './MessageBubble';
export { SourceCitations, type SourceCitation } from './SourceCitations';

// AI Writing components
export { AIWritingPanel } from './AIWritingPanel';

// Image management components
export { ImageCard } from './ImageCard';
export { ImageUploader } from './ImageUploader';
export { ImageGallery } from './ImageGallery';
export { ImageDetailPanel } from './ImageDetailPanel';

// Admin components
export { StatsPanel } from './StatsPanel';
export { RecentEntries } from './RecentEntries';
export { TopTagsChart } from './TopTagsChart';
export { CategoryManager } from './CategoryManager';
export { WritingConfigEditor } from './WritingConfigEditor';

// Error handling components
export {
  ErrorBoundary,
  CompactErrorBoundary,
  MDXErrorBoundary,
  withErrorBoundary,
} from './ErrorBoundary';
export {
  ErrorFallback,
  CompactErrorFallback,
  MDXErrorFallback,
  type ErrorFallbackProps,
} from './ErrorFallback';
