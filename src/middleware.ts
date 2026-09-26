import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';
import { getHomePathForRole, type AppRole } from '@/lib/role-routes';

function isAuthApi(pathname: string) {
    return pathname.startsWith('/api/auth');
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Bypass API and static routes
    if (isAuthApi(pathname) || pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    const isLoggedIn = Boolean(token);
    const role = token?.role as AppRole | undefined;
    const homePath = getHomePathForRole(role);

    // Helper to safely redirect without causing infinite loops
    const safeRedirect = (targetPath: string) => {
        if (pathname === targetPath) return NextResponse.next();
        return NextResponse.redirect(new URL(targetPath, request.url));
    };

    // Handle Inactive Users
    if (isLoggedIn && token?.isActive === false) {
        if (pathname === '/loginPage') return NextResponse.next();
        const url = request.nextUrl.clone();
        url.pathname = '/loginPage';
        url.searchParams.set('error', 'inactive');
        return NextResponse.redirect(url);
    }

    // Public Login Page
    if (pathname === '/loginPage') {
        if (!isLoggedIn) return NextResponse.next();
        return safeRedirect(homePath);
    }

    // Root Routing
    if (pathname === '/') {
        if (!isLoggedIn) return safeRedirect('/loginPage');
        return safeRedirect(homePath);
    }

    // Guest Routing
    if (pathname.startsWith('/waiting-room')) {
        if (!isLoggedIn) return safeRedirect('/loginPage');
        if (role !== 'Guest') return safeRedirect(homePath);
        return NextResponse.next();
    }

    // Legacy Route Alias
    if (pathname.startsWith('/masterview')) {
        const url = request.nextUrl.clone();
        url.pathname = pathname === '/masterview'
            ? '/MasterViewDashboard'
            : `/MasterViewDashboard${pathname.slice('/masterview'.length)}`;
        return NextResponse.redirect(url);
    }

 
    // Department Head and Member Routing (Epic 1.3 & 3)
    if (pathname.startsWith('/HeadDashboard') || pathname.startsWith('/interviews')) {
        if (!isLoggedIn) return safeRedirect('/loginPage');
        
        if (role !== 'Department Head' && role !== 'Member') {
            return safeRedirect(homePath);
        }
        return NextResponse.next();
    }

    // Executive Board Routing
    if (pathname.startsWith('/MasterViewDashboard') || pathname.startsWith('/executive')) {
        if (!isLoggedIn) return safeRedirect('/loginPage');
        
        if (role !== 'Executive Board') {
            // If the user's home path happens to be MasterViewDashboard but they aren't EB, 
            // kick them out to prevent a loop.
            if (homePath === '/MasterViewDashboard' || homePath.startsWith('/MasterViewDashboard')) {
                return safeRedirect('/loginPage'); 
            }
            return safeRedirect(homePath);
        }
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
