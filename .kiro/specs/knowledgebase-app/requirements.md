# Requirements Document

## Introduction

This document defines the requirements for a personal knowledgebase web application that enables writing, storing, and browsing technical how-tos and concepts on software engineering and technical writing. The application replaces a flat-file MDX repository with a full-featured web app backed by MongoDB Atlas, featuring AI-powered chat (RAG), AI writing assistance, hybrid search, and an MDX editor with live preview.

## Glossary

- **System**: The knowledgebase web application as a whole
- **Entry**: A single knowledge article containing MDX content with associated metadata (frontmatter)
- **Entry_Service**: The backend service responsible for CRUD operations on entries
- **Search_Service**: The service that performs hybrid search combining Atlas full-text and Pinecone semantic search
- **Chat_Service**: The AI-powered RAG chat service that answers questions using knowledgebase content
- **Writing_Agent**: The AI service that assists with content creation through researcher, writer, and reviewer personas
- **Auth_Service**: The authentication service handling JWT-based single-user admin authentication
- **Preview_Service**: The service that serializes MDX content for live preview rendering
- **Migration_Script**: The one-time script that imports content from the flat-file MDX repository
- **Admin_Dashboard**: The protected administrative interface for viewing stats and managing writing configuration
- **MDX_Editor**: The Monaco-based editor component with live preview and AI assistance panel
- **Category_Tree**: The hierarchical navigation component displaying categories and their entries
- **Category**: A taxonomy node in the hierarchical content organization structure, stored in a dedicated collection
- **Category_Service**: The backend service responsible for CRUD operations on categories
- **Writing_Config**: The singleton configuration document storing agent prompts, style guide, skills, and templates
- **Pinecone_Index**: The vector database index storing entry embeddings for semantic search
- **Atlas_Search_Index**: The MongoDB Atlas full-text search index on entry content

## Requirements

### Requirement 1: User Authentication

**User Story:** As an admin user, I want to securely log in to the application, so that I can access protected features like content editing and AI chat.

#### Acceptance Criteria

1. WHEN a user submits valid credentials on the login page, THE Auth_Service SHALL set an HTTP-only JWT cookie and redirect to the browse page
2. WHEN a user submits invalid credentials, THE Auth_Service SHALL return a 401 error and display an error message
3. WHEN an authenticated user requests logout, THE Auth_Service SHALL clear the auth cookie and redirect to the login page
4. WHEN an unauthenticated user attempts to access a protected route, THE System SHALL redirect to the login page
5. WHEN an unauthenticated request is made to a protected API endpoint, THE System SHALL return a 401 Unauthorized response
6. THE Auth_Service SHALL use bcryptjs for password verification against the stored hash
7. THE Auth_Service SHALL sign JWT tokens using the AUTH_SECRET environment variable

### Requirement 2: Entry Management

**User Story:** As an admin user, I want to create, read, update, and delete knowledge entries, so that I can maintain the knowledgebase content.

#### Acceptance Criteria

1. WHEN an authenticated user creates a new entry, THE Entry_Service SHALL save it with status 'draft' by default
2. WHEN an entry is created or updated with status 'published', THE Entry_Service SHALL upsert the entry vector to Pinecone_Index
3. WHEN an entry status changes from 'published' to 'draft', THE Entry_Service SHALL remove the entry vector from Pinecone_Index
4. WHEN an entry is deleted, THE Entry_Service SHALL remove the corresponding vector from Pinecone_Index
5. THE Entry_Service SHALL generate a unique URL-safe slug for each entry
6. THE Entry_Service SHALL validate that entry slugs are unique across all entries
7. WHEN an unauthenticated user requests an entry list, THE Entry_Service SHALL return only published, non-private entries
8. WHEN an authenticated user requests an entry list, THE Entry_Service SHALL return all entries regardless of status or privacy
9. WHEN an unauthenticated user requests a draft or private entry directly, THE Entry_Service SHALL return a 404 response
10. THE Entry_Service SHALL support filtering entries by categoryId, tag, language, and status
11. THE Entry_Service SHALL require a valid categoryId reference when creating or updating an entry
12. THE Entry_Service SHALL validate that the referenced categoryId exists in the Category collection

### Requirement 3: Category Management

**User Story:** As an admin user, I want to manage a hierarchical category taxonomy, so that I can organize entries into a logical navigation structure without manually typing paths.

#### Acceptance Criteria

1. THE Category_Service SHALL support creating, reading, updating, and deleting categories
2. THE Category_Service SHALL store categories with a name, slug, optional parentId, and order field
3. WHEN a category is created without a parentId, THE Category_Service SHALL create it as a root-level category
4. WHEN a category is created with a parentId, THE Category_Service SHALL validate that the parent category exists
5. THE Category_Service SHALL generate a unique URL-safe slug for each category
6. THE Category_Service SHALL validate that category slugs are unique within the same parent
7. THE Category_Service SHALL support reordering categories within the same parent via the order field
8. WHEN a category is deleted, THE Category_Service SHALL prevent deletion if entries reference that category
9. THE Category_Service SHALL provide an endpoint to retrieve the full category tree in a single query
10. THE Admin_Dashboard SHALL provide a category management UI for creating, renaming, reordering, and deleting categories
11. THE MDX_Editor SHALL provide a CategoryPicker component that displays the category tree for selection
12. THE CategoryPicker SHALL allow creating new child categories inline without leaving the editor

### Requirement 4: Entry Browsing

**User Story:** As a visitor, I want to browse and read knowledge entries organized by category, so that I can find and learn from the content.

#### Acceptance Criteria

1. THE Category_Tree SHALL display categories hierarchically based on the Category collection
2. WHEN a user selects a category in the Category_Tree, THE System SHALL display entries belonging to that category
3. THE System SHALL render entry MDX content using the DDS component library
4. THE System SHALL display entry metadata including title, topics, tags, languages, and skill level
5. THE System SHALL display related entries linked from the current entry
6. THE System SHALL display external resources associated with the entry
7. WHEN viewing an entry, THE System SHALL show breadcrumb navigation based on the category hierarchy
8. THE Category_Tree SHALL display the count of entries in each category

### Requirement 5: Hybrid Search

**User Story:** As a user, I want to search the knowledgebase using keywords and natural language, so that I can quickly find relevant content.

#### Acceptance Criteria

1. WHEN a search query is submitted, THE Search_Service SHALL query both Atlas_Search_Index and Pinecone_Index
2. THE Search_Service SHALL normalize Atlas search scores to a 0-1 range with 50% weight
3. THE Search_Service SHALL weight Pinecone cosine similarity scores at 50%
4. THE Search_Service SHALL rank entries found in both sources higher than single-source matches
5. THE Search_Service SHALL deduplicate results by entry ID before returning
6. WHEN an unauthenticated user searches, THE Search_Service SHALL filter results to published, non-private entries only
7. WHEN an authenticated user searches, THE Search_Service SHALL include drafts and private entries in results
8. THE Search_Service SHALL support filtering results by tags, topics, and languages
9. THE Search_Service SHALL return result excerpts highlighting matched content

### Requirement 6: MDX Editor with Live Preview

**User Story:** As an admin user, I want to edit entry content in a Monaco editor with live preview, so that I can efficiently author and format MDX content.

#### Acceptance Criteria

1. THE MDX_Editor SHALL display a split-pane layout with Monaco editor and preview pane
2. THE MDX_Editor SHALL use react-resizable-panels for adjustable pane sizes
3. WHEN the editor content changes, THE Preview_Service SHALL serialize the MDX with a 600ms debounce
4. THE Preview_Service SHALL return serialized MDX compatible with next-mdx-remote rendering
5. THE MDX_Editor SHALL render the preview using the same DDS component map as entry detail pages
6. THE MDX_Editor SHALL provide a separate form for editing frontmatter fields (title, topics, tags, languages, skillLevel, needsHelp, isPrivate, resources, relatedEntries)
7. THE MDX_Editor SHALL provide a status toggle for switching between draft and published states
8. WHEN saving an entry, THE MDX_Editor SHALL serialize frontmatter to YAML and prepend to the body
9. THE MDX_Editor SHALL load Monaco dynamically with SSR disabled to prevent server-side rendering issues
10. THE MDX_Editor SHALL sync the Monaco theme with the application dark/light mode

### Requirement 7: AI RAG Chat

**User Story:** As an authenticated user, I want to chat with an AI that uses the knowledgebase as context, so that I can get answers grounded in my documented knowledge.

#### Acceptance Criteria

1. WHEN a user sends a chat message, THE Chat_Service SHALL embed the message and query Pinecone_Index for the top 5 similar entries
2. THE Chat_Service SHALL fetch entry bodies from MongoDB for the matched Pinecone results
3. THE Chat_Service SHALL truncate each context entry to approximately 1500 tokens
4. THE Chat_Service SHALL include the last 10 conversation turns in the prompt context
5. THE Chat_Service SHALL stream response tokens to the client via Server-Sent Events
6. WHEN the stream completes, THE Chat_Service SHALL emit source citations with entry IDs, titles, slugs, and topic paths
7. THE Chat_Service SHALL use Claude claude-opus-4-6 as the language model
8. THE System SHALL display cited source entries after each AI response

### Requirement 8: AI Writing Assistance

**User Story:** As an admin user, I want AI assistance for researching, drafting, and reviewing content, so that I can produce higher quality entries more efficiently.

#### Acceptance Criteria

1. THE Writing_Agent SHALL support three personas: researcher, writer, and reviewer
2. WHEN invoked, THE Writing_Agent SHALL load Writing_Config from the database
3. THE Writing_Agent SHALL select the AgentPersona system prompt matching the requested role
4. IF no matching persona is found, THEN THE Writing_Agent SHALL fall back to the baseSystemPrompt
5. THE Writing_Agent SHALL query Pinecone_Index for the top 3 entries similar to the current content as reference examples
6. THE Writing_Agent SHALL inject the styleGuide from Writing_Config into the prompt context
7. WHEN a skill is specified, THE Writing_Agent SHALL inject the skill's prompt into the context
8. THE Writing_Agent SHALL stream response tokens to the client via Server-Sent Events
9. THE MDX_Editor SHALL display an AI panel with action buttons for Review, Improve, Expand, Suggest Tags, and Suggest Title
10. THE MDX_Editor SHALL display agent output in a tabbed artifact view supporting multiple artifacts
11. THE MDX_Editor SHALL provide an Apply button to insert agent output into the Monaco editor
12. WHEN text is selected in Monaco, THE Writing_Agent SHALL use the selection as context for suggestions

### Requirement 9: Writing Configuration Management

**User Story:** As an admin user, I want to configure AI writing agent behavior without redeploying, so that I can tune prompts and style guidance at runtime.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide a Writing Config editor with tabs for Prompts, Style Guide, Skills, and Templates
2. THE System SHALL store Writing_Config as a singleton document (upserted, never more than one)
3. THE Admin_Dashboard SHALL provide Monaco editors for baseSystemPrompt and per-role system prompts
4. THE Admin_Dashboard SHALL provide a Monaco editor for the styleGuide markdown document
5. THE Admin_Dashboard SHALL allow adding, editing, reordering, and deleting WritingSkill entries
6. THE Admin_Dashboard SHALL allow adding, editing, and deleting WritingTemplate entries
7. WHEN a template is selected for a new entry, THE MDX_Editor SHALL pre-fill the body and frontmatter form
8. THE Writing_Agent SHALL reload Writing_Config from the database on each invocation

### Requirement 10: Admin Dashboard

**User Story:** As an admin user, I want to view knowledgebase statistics and recent activity, so that I can monitor the health and growth of my content.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display total counts for entries, topics, and tags
2. THE Admin_Dashboard SHALL display the count of entries marked as needsHelp
3. THE Admin_Dashboard SHALL display lists of recently created and recently updated entries
4. THE Admin_Dashboard SHALL display top tags and topics by entry count
5. THE Admin_Dashboard SHALL display skill level distribution across entries
6. THE Admin_Dashboard SHALL be accessible only to authenticated users

### Requirement 11: Content Migration

**User Story:** As an admin user, I want to migrate existing content from the flat-file MDX repository, so that I can preserve all my existing knowledge entries.

#### Acceptance Criteria

1. THE Migration_Script SHALL parse frontmatter from source files using gray-matter
2. THE Migration_Script SHALL derive category hierarchy from the relative directory path of each file
3. THE Migration_Script SHALL create Category documents for each unique directory path, preserving the hierarchy via parentId references
4. THE Migration_Script SHALL derive slug from the filename or frontmatter slug field if present
5. THE Migration_Script SHALL apply default values for missing frontmatter fields (skillLevel: 3, needsHelp: false, isPrivate: false, empty arrays for topics/tags/languages/resources/relatedEntries)
6. THE Migration_Script SHALL check for existing slugs to enable idempotent re-runs
7. THE Migration_Script SHALL create Entry documents in MongoDB for each source file with the appropriate categoryId reference
8. THE Migration_Script SHALL upsert vectors to Pinecone_Index with entry metadata
9. THE Migration_Script SHALL update the pineconeId field on each migrated entry
10. THE Migration_Script SHALL set migrated entries to status 'published' by default
11. THE Migration_Script SHALL migrate AI agent files with topics set to ["ai-agents"]

### Requirement 12: Theme and Dark Mode

**User Story:** As a user, I want the application to support dark and light modes with dark as default, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE System SHALL default to dark mode when no user preference is stored
2. THE System SHALL execute a pre-paint script in the HTML head to set the theme class before CSS loads
3. THE System SHALL provide a ThemeToggle component accessible from the top navigation
4. WHEN the user toggles the theme, THE System SHALL persist the preference to localStorage
5. THE System SHALL define CSS custom properties for the site palette in both dark and light variants
6. THE System SHALL reference CSS tokens for all colors (no hardcoded color values in site UI)
7. THE System SHALL use DDS styles exclusively for MDX content rendering, not for site UI

### Requirement 13: Tag and Topic Enumeration

**User Story:** As a user, I want to filter entries by tags, topics, and languages, so that I can narrow down content to my areas of interest.

#### Acceptance Criteria

1. THE System SHALL provide an API endpoint that returns all unique tags aggregated from entries
2. THE System SHALL provide an API endpoint that returns all unique topics aggregated from entries
3. THE System SHALL provide an API endpoint that returns all unique languages aggregated from entries
4. THE System SHALL provide a TagFilter component for multi-select filtering on the browse page

### Requirement 14: Entry Visibility Rules

**User Story:** As an admin user, I want to control entry visibility through status and privacy flags, so that I can manage draft content and private notes separately from public content.

#### Acceptance Criteria

1. WHEN an entry has status 'draft', THE System SHALL hide it from unauthenticated users
2. WHEN an entry has status 'published' and isPrivate is true, THE System SHALL hide it from unauthenticated users
3. WHEN an entry has status 'published' and isPrivate is false, THE System SHALL display it to all users
4. WHEN an authenticated user browses or searches, THE System SHALL include all entries regardless of status or privacy
5. THE Entry_Service SHALL return 404 for direct requests to hidden entries from unauthenticated users

### Requirement 15: MDX Content Rendering

**User Story:** As a user, I want MDX content to render with rich components and syntax highlighting, so that I can read well-formatted technical content.

#### Acceptance Criteria

1. THE System SHALL render MDX content using next-mdx-remote
2. THE System SHALL map DDS components (Callout, Card, CardGrid, Heading, CodeBlock, Link, List, ListItem, Collapser, CollapserGroup, Grid, Column, Popover, Table, Tabs) to MDX
3. THE System SHALL use Shiki for syntax highlighting in code blocks
4. THE System SHALL support CodePlayground iframe embeds for CodeSandbox, JSFiddle, and CodePen

### Requirement 16: API Streaming

**User Story:** As a user, I want AI responses to stream in real-time, so that I can see output as it's generated without waiting for completion.

#### Acceptance Criteria

1. THE Chat_Service SHALL stream responses using Server-Sent Events format
2. THE Writing_Agent SHALL stream responses using Server-Sent Events format
3. THE System SHALL set maxDuration to 300 seconds on streaming API routes
4. WHEN a stream completes, THE System SHALL emit a done event with any associated metadata

### Requirement 17: Database Indexing

**User Story:** As a system administrator, I want proper database indexes, so that queries perform efficiently at scale.

#### Acceptance Criteria

1. THE System SHALL create a unique index on the Entry slug field
2. THE System SHALL create indexes on Entry categoryId, frontmatter.topics, frontmatter.tags, and frontmatter.languages fields
3. THE System SHALL create an index on Entry status field
4. THE System SHALL create an index on Entry frontmatter.isPrivate field
5. THE System SHALL create an Atlas Search index named 'entry_search' with boosted title field and keyword fields for topics, tags, and languages
6. THE System SHALL create a unique compound index on Category (parentId, slug) to ensure slug uniqueness within parent
7. THE System SHALL create an index on Category parentId field for efficient tree queries
8. THE System SHALL create an index on Category order field for sorted retrieval
