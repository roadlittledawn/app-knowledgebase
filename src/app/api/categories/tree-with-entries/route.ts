import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, getAuthCookieName } from '@/lib/auth';
import { getCategoryTreeWithEntries } from '@/lib/db/queries/categories';
import type { FileExplorerTreeNode } from '@/types/category';

interface TreeResponse {
  tree: FileExplorerTreeNode[];
}

interface ErrorResponse {
  error: string;
}

export async function GET(): Promise<NextResponse<TreeResponse | ErrorResponse>> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getAuthCookieName())?.value;
    const authenticated = token ? (await verifyToken(token)) !== null : false;

    const tree = await getCategoryTreeWithEntries(authenticated);
    return NextResponse.json({ tree });
  } catch (error) {
    console.error('Error getting category tree with entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
