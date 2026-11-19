import { redirect } from 'next/navigation';
import { getAuthState, loginUrlFor } from '@/lib/auth';
import { NoAccess } from '@/components/NoAccess';

export const dynamic = 'force-dynamic';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // proxy.ts redirects first (with the exact URL); this is defense in depth.
  const auth = await getAuthState();
  if (auth.status === 'anonymous') {
    redirect(await loginUrlFor('/admin'));
  }
  if (auth.status === 'forbidden') {
    return <NoAccess email={auth.email} />;
  }

  return children;
}
