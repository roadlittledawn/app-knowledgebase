import { redirect } from 'next/navigation';
import { getAuthState, loginUrlFor } from '@/lib/auth';
import { NoAccess } from '@/components/NoAccess';

export const dynamic = 'force-dynamic';

interface EntriesLayoutProps {
  children: React.ReactNode;
}

export default async function EntriesLayout({ children }: EntriesLayoutProps) {
  // proxy.ts redirects first (with the exact URL); this is defense in depth.
  const auth = await getAuthState();
  if (auth.status === 'anonymous') {
    redirect(await loginUrlFor('/entries'));
  }
  if (auth.status === 'forbidden') {
    return <NoAccess email={auth.email} />;
  }

  return children;
}
