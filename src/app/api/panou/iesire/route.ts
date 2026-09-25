/** POST /api/panou/iesire — șterge biletul și trimite la intrare. */
import { NextResponse } from 'next/server';
import { signOut } from '@/lib/panou/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  await signOut();
  return NextResponse.redirect(new URL('/panou/intrare', new URL(req.url).origin), 303);
}
