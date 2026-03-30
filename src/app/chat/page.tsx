/**
 * Chat Page
 *
 * AI-powered RAG chat interface for querying the knowledgebase.
 * Protected route - requires authentication.
 *
 * Requirement 7.8: Chat UI
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken, getAuthCookieName } from '@/lib/auth';
import { ChatInterface } from '@/components/ChatInterface';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';

export const metadata = {
  title: 'AI Chat | Knowledgebase',
  description: 'Chat with AI about your knowledgebase content',
};

export default async function ChatPage() {
  // Check authentication
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;

  if (!token) {
    redirect('/login?redirect=/chat');
  }

  const payload = await verifyToken(token);
  if (!payload) {
    redirect('/login?redirect=/chat');
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Navigation header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-xl font-bold text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors"
          >
            Knowledgebase
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/browse"
              className="text-[var(--color-foreground-secondary)] hover:text-[var(--color-foreground)] transition-colors"
            >
              Browse
            </Link>
            <Link href="/chat" className="text-[var(--color-primary)] font-medium">
              Chat
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>

      {/* Chat interface */}
      <main className="flex-1 overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  );
}
