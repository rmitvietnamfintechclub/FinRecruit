import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';
import { getHomePathForRole, type AppRole } from '@/lib/role-routes';

function isAuthApi(pathname: string) {
  return pathname.startsWith('/api/auth');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAuthApi(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isLoggedIn = Boolean(token);
  const role = token?.role as AppRole | undefined;

  if (isLoggedIn && token?.isActive === false) {
    const url = request.nextUrl.clone();
    url.pathname = '/loginPage';
    url.searchParams.set('error', 'inactive');
    return NextResponse.redirect(url);
  }

  if (pathname === '/loginPage') {
    if (!isLoggedIn) {
      return NextResponse.next();
    }
    return NextResponse.redirect(
      new URL(getHomePathForRole(role), request.url)
    );
  }

  if (pathname.startsWith('/waiting-room')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/loginPage', request.url));
    }
    if (role !== 'Guest') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/masterview')) {
    const url = request.nextUrl.clone();
    url.pathname =
      pathname === '/masterview'
        ? '/MasterViewDashboard'
        : `/MasterViewDashboard${pathname.slice('/masterview'.length)}`;
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/HeadDashboard')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/loginPage', request.url));
    }
    if (role === 'Guest') {
      return NextResponse.redirect(new URL('/waiting-room', request.url));
    }
    if (role === 'Executive Board') {
      return NextResponse.redirect(new URL('/MasterViewDashboard', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/MasterViewDashboard')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/loginPage', request.url));
    }
    if (role === 'Guest') {
      return NextResponse.redirect(new URL('/waiting-room', request.url));
    }
    if (role === 'Department Head') {
      return NextResponse.redirect(new URL('/HeadDashboard', request.url));
    }
    if (role !== 'Executive Board') {
      return NextResponse.redirect(new URL(getHomePathForRole(role), request.url));
    }
    return NextResponse.next();
  }

  if (pathname === '/') {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/loginPage', request.url));
    }
    return NextResponse.redirect(
      new URL(getHomePathForRole(role), request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
