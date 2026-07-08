import { NextRequest, NextResponse } from 'next/server';

/**
 * Custom-domain routing for AI Voice Landing Pages.
 *
 * A user connects their own domain (CNAME → the app host). Any request that
 * arrives on a host we don't recognize as our own is rewritten to
 * /v/~<host>, and the voice-page route resolves the page by domain.
 * Everything on our own hosts passes through untouched.
 */

const OWN_HOST_SUFFIXES = [
  'entrestate.com',
  'localhost',
  '127.0.0.1',
  '.hosted.app', // Firebase App Hosting default domains
  '.web.app',
  '.firebaseapp.com',
  '.vercel.app',
  '.cloudworkstations.dev',
];

function isOwnHost(host: string): boolean {
  const h = host.toLowerCase().split(':')[0];
  const extra = process.env.NEXT_PUBLIC_PRIMARY_HOST?.toLowerCase();
  if (extra && (h === extra || h.endsWith(`.${extra}`))) return true;
  return OWN_HOST_SUFFIXES.some((s) =>
    s.startsWith('.') ? h.endsWith(s) : h === s || h.endsWith(`.${s}`),
  );
}

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  if (!host || isOwnHost(host)) return NextResponse.next();

  // Unknown host = connected customer domain. Serve their voice page at "/",
  // and let the page's own API calls (/api/...) pass through unchanged.
  if (req.nextUrl.pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = `/v/~${host.toLowerCase().split(':')[0]}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  // Skip static assets and images; API + pages pass through the host check.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)).*)'],
};
