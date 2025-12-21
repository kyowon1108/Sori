import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = [
  '/dashboard',
  '/elderly',
  '/calls',
];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const path = request.nextUrl.pathname;

  // 1. Protected Routes Check
  // If trying to access a protected route without a token, redirect to login
  if (protectedRoutes.some((route) => path.startsWith(route))) {
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('from', path); // Optional: remember where they were going
      return NextResponse.redirect(url);
    }
  }

  // 2. Auth Routes Check
  // If already logged in and trying to go to login/register, redirect to dashboard
  if ((path === '/login' || path === '/register') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
