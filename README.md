# Knowledgebase

A personal knowledgebase for writing, storing, and browsing technical how-tos and articles on software engineering and technical writing.

## Stack

- **Framework:** Next.js 16, App Router, TypeScript
- **Database:** MongoDB Atlas + Mongoose
- **Vector DB:** Pinecone
- **AI:** Anthropic SDK (claude-opus-4-6)
- **Styling:** Tailwind CSS v4
- **MDX:** next-mdx-remote + @roadlittledawn/docs-design-system-react (content rendering)
- **Auth:** JWT + bcryptjs, HTTP-only cookie
- **Deployment:** Vercel (Fluid Compute)

## Features

- Browse and search articles by topic, tag, and language
- Hybrid search (MongoDB Atlas full-text + Pinecone semantic)
- MDX editor with live preview and frontmatter form
- AI writing assistant with researcher / writer / reviewer personas
- RAG-powered chat over your knowledgebase
- Admin dashboard with stats and writing agent configuration
- Dark mode by default

## Development

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env.local

# Run dev server
npm run dev
```

## Environment Variables

See `.env.example` for required variables (MongoDB, Pinecone, Anthropic, JWT secret).
