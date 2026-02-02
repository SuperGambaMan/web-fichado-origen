import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isAuthPage = nextUrl.pathname.startsWith('/login');
  const isPublicPage = nextUrl.pathname === '/';
  const isApiRoute = nextUrl.pathname.startsWith('/api');
  const isStaticAsset = nextUrl.pathname.startsWith('/_next') ||
                        nextUrl.pathname.includes('.') ||
                        nextUrl.pathname === '/favicon.ico';

  // Allow static assets and API routes
  if (isStaticAsset || isApiRoute) {
    return NextResponse.next();
  }

  // Allow public pages
  if (isPublicPage) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // Allow auth pages for non-logged-in users
  if (isAuthPage) {
    return NextResponse.next();
  }

  // Redirect non-logged-in users to login for ANY protected route
  if (!isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.png$|.*\\.ico$).*)'],
};
