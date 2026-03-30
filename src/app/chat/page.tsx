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

export const metadata = {
  title: 'AI Chat',
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
    <div className="flex-1 flex flex-col overflow-hidden">
      <ChatInterface />
    </div>
  );
}
