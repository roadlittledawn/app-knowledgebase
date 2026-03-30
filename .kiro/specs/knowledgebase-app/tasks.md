# Implementation Plan: Knowledgebase Application

## Overview

This implementation plan covers a full-featured knowledgebase web application built with Next.js 16, MongoDB Atlas, Pinecone vector search, and AI-powered features. The plan follows six phases: Foundation, Migration + Browse, Search, MDX Editor, AI Features, and Admin + Polish.

For all tasks that include `npm` commands, you must prepend the command with `NPM_CONFIG_REGISTRY=https://registry.npmjs.org/`

## Tasks

- [-] 1. Foundation - Project Setup and Core Infrastructure
  - [x] 1.1 Initialize Next.js 16 project with TypeScript and App Router
    - Create project with `create-next-app` using App Router
    - Configure TypeScript strict mode
    - Set up ESLint and Prettier
    - Configure path aliases in tsconfig.json
    - _Requirements: 12.1, 12.5, 12.6_

  - [x] 1.2 Set up environment configuration and project structure
    - Create `.env.local` template with required variables (MONGODB_URI, PINECONE_API_KEY, ANTHROPIC_API_KEY, AUTH_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD_HASH)
    - Create directory structure: `src/lib/`, `src/types/`, `src/components/`, `src/app/`
    - _Requirements: 1.6, 1.7_

  - [x] 1.3 Implement MongoDB connection and base models
    - Create `src/lib/db/connection.ts` with connection pooling
    - Create `src/types/entry.ts` with IEntry, EntryFrontmatter, Resource interfaces
    - Create `src/types/category.ts` with ICategory interface
    - Create `src/lib/db/models/Entry.ts` Mongoose schema with all indexes
    - Create `src/lib/db/models/Category.ts` Mongoose schema with compound unique index
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.6, 17.7, 17.8_

  - [ ]\* 1.4 Write property tests for Category model
    - **Property 12a: Category Slug Uniqueness Within Parent**
    - **Validates: Requirements 3.6**

  - [ ]\* 1.5 Write property tests for slug generation
    - **Property 6: Slug URL-Safety**
    - **Validates: Requirements 2.5**

  - [x] 1.6 Implement authentication system
    - Create `src/lib/auth/jwt.ts` with sign/verify functions using AUTH_SECRET
    - Create `src/lib/auth/password.ts` with bcryptjs verification
    - Create `src/app/api/auth/login/route.ts` POST handler
    - Create `src/app/api/auth/logout/route.ts` POST handler
    - Create `src/middleware.ts` for JWT verification on protected routes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]\* 1.7 Write property tests for authentication
    - **Property 1: Authentication Cookie Round-Trip**
    - **Property 2: Invalid Credentials Rejection**
    - **Property 3: Unauthenticated Access Protection**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

  - [x] 1.8 Implement theme system with dark mode default
    - Create `src/lib/theme/theme-script.ts` for pre-paint theme detection
    - Create `src/components/ThemeProvider.tsx` context provider
    - Create `src/components/ThemeToggle.tsx` component
    - Define CSS custom properties in `src/app/globals.css` for dark/light variants
    - Inject theme script in `src/app/layout.tsx` head
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ]\* 1.9 Write property tests for theme persistence
    - **Property 44: Theme Preference Round-Trip**
    - **Validates: Requirements 12.4**

  - [x] 1.10 Create login page UI
    - Create `src/app/login/page.tsx` with login form
    - Handle form submission and error display
    - Redirect to browse on successful login
    - _Requirements: 1.1, 1.2_

- [x] 2. Checkpoint - Foundation Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Category Management System
  - [x] 3.1 Implement Category CRUD API routes
    - Create `src/app/api/categories/route.ts` GET (list) and POST (create)
    - Create `src/app/api/categories/[id]/route.ts` GET, PUT, DELETE
    - Create `src/app/api/categories/tree/route.ts` GET for full tree
    - Implement parent validation on create/update
    - Implement deletion protection when entries reference category
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 3.2 Implement Category tree building logic
    - Create `src/lib/db/queries/categories.ts` with buildTree function
    - Implement getCategoryPath for breadcrumb generation
    - Include entry counts in tree nodes
    - _Requirements: 3.9, 4.1, 4.8_

  - [ ]\* 3.3 Write property tests for Category hierarchy
    - **Property 12: Category Tree Structure**
    - **Property 12b: Category Parent Validation**
    - **Property 12c: Category Deletion Protection**
    - **Validates: Requirements 3.1, 3.4, 3.8, 4.1**

- [-] 4. Entry Management System
  - [x] 4.1 Implement Entry CRUD API routes
    - Create `src/app/api/entries/route.ts` GET (list with filters) and POST (create)
    - Create `src/app/api/entries/[id]/route.ts` GET, PUT, DELETE
    - Implement visibility filtering based on auth state
    - Implement categoryId validation against Category collection
    - Auto-generate URL-safe slugs with uniqueness check
    - _Requirements: 2.1, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12_

  - [x] 4.2 Implement Pinecone vector synchronization
    - Create `src/lib/pinecone/client.ts` with connection setup
    - Create `src/lib/pinecone/sync.ts` with upsert/delete functions
    - Sync on publish, remove on unpublish/delete
    - Store pineconeId on entry document
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ]\* 4.3 Write property tests for Entry visibility
    - **Property 8: Visibility Filter for Unauthenticated Users**
    - **Property 9: Authenticated User Full Visibility**
    - **Property 10: Public Entry Visibility**
    - **Validates: Requirements 2.7, 2.8, 2.9, 14.1, 14.2, 14.3, 14.4, 14.5**

  - [ ]\* 4.4 Write property tests for Entry creation
    - **Property 4: Entry Default Status on Creation**
    - **Property 5: Pinecone Sync Consistency**
    - **Property 7: Slug Uniqueness Invariant**
    - **Property 12d: Entry Category Reference Validation**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 2.11, 2.12**

  - [ ]\* 4.5 Write property tests for Entry filtering
    - **Property 11: Entry Filter Accuracy**
    - **Validates: Requirements 2.10**

- [x] 5. Checkpoint - Core Data Layer Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Migration Script
  - [x] 6.1 Implement content migration script
    - Create `scripts/migrate.ts` with gray-matter parsing
    - Derive category hierarchy from directory paths
    - Create Category documents with proper parentId references
    - Derive slugs from filename or frontmatter
    - Apply default values for missing fields
    - Check existing slugs for idempotent re-runs
    - Set migrated entries to 'published' status
    - Handle ai-agents directory with special topic tagging
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.10, 11.11_

  - [x] 6.2 Implement Pinecone vector creation during migration
    - Generate embeddings for each entry
    - Upsert vectors with entry metadata
    - Update pineconeId field on entries
    - _Requirements: 11.8, 11.9_

  - [ ]\* 6.3 Write property tests for migration
    - **Property 37: Migration Category Creation**
    - **Property 38: Migration Slug Derivation**
    - **Property 39: Migration Default Values**
    - **Property 40: Migration Idempotency**
    - **Property 41: Migration Entry-Pinecone Sync**
    - **Property 42: Migration Default Published Status**
    - **Property 43: Migration AI Agent Files Topic**
    - **Validates: Requirements 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11**

- [x] 7. Browse UI and Entry Display
  - [x] 7.1 Create browse page layout with CategoryTree sidebar
    - Create `src/app/browse/page.tsx` with sidebar layout
    - Create `src/components/CategoryTree.tsx` hierarchical navigation
    - Display entry counts per category
    - Handle category selection state
    - _Requirements: 4.1, 4.2, 4.8_

  - [x] 7.2 Implement entry list and detail views
    - Create `src/components/EntryCard.tsx` for list items
    - Create `src/app/browse/[...slug]/page.tsx` for entry detail
    - Display entry metadata (title, topics, tags, languages, skillLevel)
    - Display related entries and external resources
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

  - [x] 7.3 Implement breadcrumb navigation
    - Create `src/components/Breadcrumbs.tsx` component
    - Generate path from category hierarchy
    - _Requirements: 4.7_

  - [ ]\* 7.4 Write unit tests for browse components
    - Test CategoryTree rendering and selection
    - Test breadcrumb path generation
    - **Property 16: Breadcrumb Path Accuracy**
    - **Validates: Requirements 4.7**

- [x] 8. MDX Content Rendering
  - [x] 8.1 Set up MDX serialization with next-mdx-remote
    - Create `src/lib/mdx/serialize.ts` with serialization function
    - Configure Shiki for syntax highlighting
    - _Requirements: 15.1, 15.3_

  - [x] 8.2 Create DDS component mapping for MDX
    - Create `src/components/mdx/` directory with component wrappers
    - Map Callout, Card, CardGrid, Heading, CodeBlock, Link, List, ListItem, Collapser, CollapserGroup, Grid, Column, Popover, Table, Tabs
    - Create CodePlayground component for iframe embeds
    - _Requirements: 15.2, 15.4_

  - [ ]\* 8.3 Write property tests for MDX rendering
    - **Property 46: DDS Component Mapping**
    - **Property 47: CodePlayground Embed Support**
    - **Validates: Requirements 15.2, 15.4**

- [x] 9. Checkpoint - Browse and Content Display Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Hybrid Search Implementation
  - [x] 10.1 Create Atlas Search index configuration
    - Document Atlas Search index JSON configuration
    - Create `src/lib/search/atlas.ts` with search query function
    - _Requirements: 17.5_

  - [x] 10.2 Implement Pinecone semantic search
    - Create `src/lib/search/pinecone.ts` with query function
    - Generate query embeddings
    - _Requirements: 5.1_

  - [x] 10.3 Implement search result merging
    - Create `src/lib/search/merge.ts` with score normalization
    - Normalize Atlas scores to 0-1 range
    - Apply 50/50 weighting
    - Rank dual-source matches higher
    - Deduplicate by entry ID
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [x] 10.4 Create Search API route
    - Create `src/app/api/search/route.ts` GET handler
    - Support hybrid, atlas-only, and pinecone-only modes
    - Apply visibility filtering based on auth state
    - Support tag, topic, language filters
    - Return excerpts with highlighted matches
    - _Requirements: 5.1, 5.6, 5.7, 5.8, 5.9_

  - [ ]\* 10.5 Write property tests for search
    - **Property 17: Search Score Merge Correctness**
    - **Property 18: Search Result Deduplication**
    - **Property 19: Search Filter Accuracy**
    - **Property 20: Search Excerpt Presence**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.8, 5.9**

  - [x] 10.6 Create search UI components
    - Create `src/components/SearchBar.tsx` with input and submit
    - Create `src/components/SearchResults.tsx` for result display
    - Integrate search into browse page
    - _Requirements: 5.1_

- [x] 11. Tags and Topics API
  - [x] 11.1 Implement tags/topics/languages aggregation API
    - Create `src/app/api/tags/route.ts` GET handler
    - Aggregate unique values from all entries
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 11.2 Create TagFilter component
    - Create `src/components/TagFilter.tsx` multi-select component
    - Integrate with browse page filtering
    - _Requirements: 13.4_

  - [ ]\* 11.3 Write property tests for aggregation
    - **Property 45: Tag/Topic/Language Aggregation Accuracy**
    - **Validates: Requirements 13.1, 13.2, 13.3**

- [x] 12. Checkpoint - Search Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. MDX Editor with Live Preview
  - [x] 13.1 Create editor page layout
    - Create `src/app/entries/new/page.tsx` for new entries
    - Create `src/app/entries/[id]/edit/page.tsx` for editing
    - Create `src/components/EntryEditor.tsx` main editor component
    - Implement split-pane layout with react-resizable-panels
    - _Requirements: 6.1, 6.2_

  - [x] 13.2 Integrate Monaco editor
    - Create `src/components/MonacoPane.tsx` with dynamic import (SSR disabled)
    - Sync Monaco theme with app dark/light mode
    - _Requirements: 6.9, 6.10_

  - [x] 13.3 Implement live preview with debouncing
    - Create `src/app/api/preview/route.ts` POST handler
    - Create `src/components/PreviewPane.tsx` with MDX rendering
    - Implement 600ms debounce on content changes
    - Use same DDS component map as entry detail pages
    - _Requirements: 6.3, 6.4, 6.5_

  - [ ]\* 13.4 Write property tests for preview
    - **Property 21: Preview Debounce Behavior**
    - **Property 22: MDX Serialization Round-Trip**
    - **Validates: Requirements 6.3, 6.4**

  - [x] 13.5 Create frontmatter form
    - Create `src/components/FrontmatterForm.tsx` with all fields
    - Include title, topics, tags, languages, skillLevel, needsHelp, isPrivate, resources, relatedEntries
    - _Requirements: 6.6_

  - [x] 13.6 Create CategoryPicker component
    - Create `src/components/CategoryPicker.tsx` with tree display
    - Support inline category creation without leaving editor
    - _Requirements: 3.11, 3.12_

  - [x] 13.7 Implement entry save functionality
    - Create status toggle (draft/published)
    - Serialize frontmatter to YAML on save
    - Wire save to Entry API
    - _Requirements: 6.7, 6.8_

  - [ ]\* 13.8 Write property tests for frontmatter serialization
    - **Property 23: Frontmatter YAML Round-Trip**
    - **Validates: Requirements 6.8**

- [x] 14. Checkpoint - Editor Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. AI RAG Chat
  - [ ] 15.1 Implement Chat API with SSE streaming
    - Create `src/app/api/chat/route.ts` POST handler with SSE
    - Set maxDuration to 300 seconds
    - Query Pinecone for top 5 similar entries
    - Fetch entry bodies from MongoDB
    - Truncate context entries to ~1500 tokens
    - Include last 10 conversation turns
    - Use Claude claude-opus-4-6 model
    - Emit source citations on completion
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 16.1, 16.3, 16.4_

  - [ ] 15.2 Create Chat UI
    - Create `src/app/chat/page.tsx` chat page
    - Create `src/components/ChatInterface.tsx` main component
    - Create `src/components/MessageList.tsx` and `src/components/MessageBubble.tsx`
    - Create `src/components/ChatInput.tsx` input component
    - Create `src/components/SourceCitations.tsx` for displaying sources
    - _Requirements: 7.8_

  - [ ]\* 15.3 Write property tests for chat context
    - **Property 24: Chat Context Token Limit**
    - **Property 25: Chat History Limit**
    - **Property 26: Chat Citation Completeness**
    - **Validates: Requirements 7.3, 7.4, 7.6**

- [ ] 16. AI Writing Assistance
  - [ ] 16.1 Create WritingConfig model and API
    - Create `src/types/writing-config.ts` with interfaces
    - Create `src/lib/db/models/WritingConfig.ts` Mongoose schema
    - Create `src/app/api/admin/writing-config/route.ts` GET and PUT
    - Implement singleton pattern (upsert, never multiple)
    - _Requirements: 9.2, 9.8_

  - [ ]\* 16.2 Write property tests for WritingConfig
    - **Property 32: WritingConfig Singleton Invariant**
    - **Property 33: WritingConfig CRUD Consistency**
    - **Validates: Requirements 9.2, 9.5, 9.6**

  - [ ] 16.3 Implement Writing Agent API with SSE streaming
    - Create `src/app/api/ai/writing-agent/route.ts` POST handler with SSE
    - Set maxDuration to 300 seconds
    - Support researcher, writer, reviewer personas
    - Load WritingConfig on each invocation
    - Select persona system prompt or fall back to baseSystemPrompt
    - Query Pinecone for top 3 similar entries as examples
    - Inject styleGuide and skill prompts into context
    - Handle text selection context
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.12, 16.2, 16.3, 16.4_

  - [ ]\* 16.4 Write property tests for Writing Agent
    - **Property 27: Writing Agent Persona Support**
    - **Property 28: Writing Agent Persona Selection**
    - **Property 29: Writing Agent Style Guide Injection**
    - **Property 30: Writing Agent Skill Injection**
    - **Property 31: Writing Agent Selection Context**
    - **Validates: Requirements 8.1, 8.3, 8.6, 8.7, 8.12**

  - [ ] 16.5 Create AI Writing Panel UI
    - Create `src/components/AIWritingPanel.tsx` with action buttons
    - Include Review, Improve, Expand, Suggest Tags, Suggest Title actions
    - Create tabbed artifact view for multiple outputs
    - Implement Apply button to insert content into Monaco
    - _Requirements: 8.9, 8.10, 8.11_

  - [ ]\* 16.6 Write property tests for SSE streaming
    - **Property 48: Stream Completion Event**
    - **Validates: Requirements 16.4**

- [ ] 17. Checkpoint - AI Features Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Admin Dashboard
  - [ ] 18.1 Implement Admin Stats API
    - Create `src/app/api/admin/stats/route.ts` GET handler
    - Calculate totalEntries, totalTopics, totalTags, needsHelpCount
    - Get recentlyCreated and recentlyUpdated entries
    - Calculate topTags and topTopics by count
    - Calculate skillLevelDistribution
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]\* 18.2 Write property tests for admin stats
    - **Property 35: Admin Stats Accuracy**
    - **Property 36: Recent Entries Ordering**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

  - [ ] 18.3 Create Admin Dashboard UI
    - Create `src/app/admin/page.tsx` dashboard page
    - Create `src/components/StatsPanel.tsx` for counts display
    - Create `src/components/RecentEntries.tsx` for activity lists
    - Create `src/components/TopTagsChart.tsx` for tag/topic visualization
    - Protect route for authenticated users only
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 18.4 Create CategoryManager component
    - Create `src/components/CategoryManager.tsx` for admin category management
    - Support creating, renaming, reordering, and deleting categories
    - Display category tree with drag-and-drop reordering
    - _Requirements: 3.10_

  - [ ] 18.5 Create WritingConfigEditor component
    - Create `src/components/WritingConfigEditor.tsx` with tabs
    - Create Prompts tab with Monaco editors for baseSystemPrompt and persona prompts
    - Create Style Guide tab with Monaco editor
    - Create Skills tab with add/edit/reorder/delete functionality
    - Create Templates tab with add/edit/delete functionality
    - _Requirements: 9.1, 9.3, 9.4, 9.5, 9.6_

  - [ ]\* 18.6 Write property tests for template pre-fill
    - **Property 34: Template Pre-fill Accuracy**
    - **Validates: Requirements 9.7**

- [ ] 19. Entry Metadata Display
  - [ ] 19.1 Enhance entry detail view with full metadata
    - Display all frontmatter fields in entry detail
    - Render related entries as clickable links
    - Render external resources with titles and URLs
    - _Requirements: 4.4, 4.5, 4.6_

  - [ ]\* 19.2 Write property tests for metadata display
    - **Property 13: Entry Metadata Display Completeness**
    - **Property 14: Related Entries Display**
    - **Property 15: Resources Display**
    - **Validates: Requirements 4.4, 4.5, 4.6**

- [ ] 20. Error Handling and Validation
  - [ ] 20.1 Implement consistent API error handling
    - Create `src/lib/errors.ts` with custom error classes (ValidationError, NotFoundError)
    - Create `src/lib/api/error-handler.ts` wrapper function
    - Apply consistent error response format across all API routes
    - _Requirements: 2.9, 14.5_

  - [ ] 20.2 Implement validation rules
    - Add entry validation (slug, categoryId, title, skillLevel, resources)
    - Add category validation (slug, name, parentId, order)
    - Add WritingConfig validation (skills, templates, agents)
    - _Requirements: 2.5, 2.6, 2.11, 2.12, 3.4, 3.6_

  - [ ] 20.3 Add React Error Boundaries
    - Create `src/components/ErrorBoundary.tsx` component
    - Create `src/components/ErrorFallback.tsx` fallback UI
    - Wrap major page sections with error boundaries
    - _Requirements: 15.1_

- [ ] 21. Final Polish and Integration
  - [ ] 21.1 Create top navigation component
    - Create `src/components/TopNav.tsx` with logo, navigation links, ThemeToggle
    - Include links to Browse, Chat, Admin (when authenticated)
    - _Requirements: 12.3_

  - [ ] 21.2 Create app layout
    - Update `src/app/layout.tsx` with ThemeProvider, AuthProvider, TopNav
    - Configure metadata and viewport
    - _Requirements: 12.1, 12.2_

  - [ ] 21.3 Wire all components together
    - Ensure all pages use consistent layout
    - Verify protected routes redirect properly
    - Test full user flows end-to-end
    - _Requirements: 1.4, 10.6_

- [ ] 22. Final Checkpoint - All Features Complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout with strict mode enabled
- All AI streaming routes use SSE with 300s maxDuration for Vercel Fluid Compute
