/**
 * Chat Page
 *
 * AI-powered RAG chat interface for querying the knowledgebase.
 * Protected route - requires authentication.
 *
 * Requirement 7.8: Chat UI
 */

import { redirect } from 'next/navigation';
import { getAuthState, loginUrlFor } from '@/lib/auth';
import { NoAccess } from '@/components/NoAccess';
import { ChatInterface } from '@/components/ChatInterface';

export const metadata = {
  title: 'AI Chat',
  description: 'Chat with AI about your knowledgebase content',
};

export default async function ChatPage() {
  // Check authentication (proxy.ts redirects first; this is defense in depth)
  const auth = await getAuthState();
  if (auth.status === 'anonymous') {
    redirect(await loginUrlFor('/chat'));
  }
  if (auth.status === 'forbidden') {
    return <NoAccess email={auth.email} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ChatInterface />
    </div>
  );
}
