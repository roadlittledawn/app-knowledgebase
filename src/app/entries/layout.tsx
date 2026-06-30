import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthCookieName, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface EntriesLayoutProps {
  children: React.ReactNode;
}

export default async function EntriesLayout({ children }: EntriesLayoutProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    redirect('/login');
  }

  return children;
}
