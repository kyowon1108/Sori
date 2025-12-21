import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/dashboard', '/elderly', '/calls'];
const authRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check for token in cookies (set by client-side after login)
  // Note: Since we use Zustand with localStorage, we can't check auth on server
  // The actual protection happens client-side via ProtectedRoute component
  // This middleware provides an additional layer for direct URL access

  // For now, just allow the request to proceed
  // Client-side ProtectedRoute will handle the actual auth check
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
