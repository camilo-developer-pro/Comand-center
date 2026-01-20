/**
 * Authentication Middleware
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * This middleware runs on the Edge Runtime and checks authentication
 * for protected routes before they render.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ============================================================
// Route Configuration
// ============================================================

// Routes that require authentication
const PROTECTED_ROUTES = [
    '/documents',
    '/settings',
    '/dashboard',
];

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = [
    '/login',
    '/register',
    '/forgot-password',
];

// Routes that are always public
const PUBLIC_ROUTES = [
    '/',
    '/auth/callback',
    '/auth/verify-email',
    '/auth/reset-password',
];

// ============================================================
// Helper Functions
// ============================================================

function isProtectedRoute(pathname: string): boolean {
    return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

function isAuthRoute(pathname: string): boolean {
    return AUTH_ROUTES.some(route => pathname.startsWith(route));
}

function isPublicRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route));
}

// ============================================================
// Middleware
// ============================================================

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for static files and API routes
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.') // Static files
    ) {
        return NextResponse.next();
    }

    // Create response to modify
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    // Create Supabase client for middleware (Edge Runtime compatible)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    // Set cookie on request for server components
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    // Set cookie on response for browser
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    // Refresh session if exists (updates cookies)
    const { data: { session }, error } = await supabase.auth.getSession();

    // Handle errors silently - treat as unauthenticated
    if (error) {
        console.error('[middleware] Session error:', error.message);
    }

    const isAuthenticated = !!session?.user;

    // ============================================================
    // Route Protection Logic
    // ============================================================

    // Protected routes: redirect to login if not authenticated
    if (isProtectedRoute(pathname) && !isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Auth routes: redirect to dashboard if already authenticated
    if (isAuthRoute(pathname) && isAuthenticated) {
        const redirectTo = request.nextUrl.searchParams.get('redirectTo');
        const destination = redirectTo || '/documents';
        return NextResponse.redirect(new URL(destination, request.url));
    }

    // Root route: redirect based on auth status
    if (pathname === '/') {
        if (isAuthenticated) {
            return NextResponse.redirect(new URL('/documents', request.url));
        }
        // Could redirect to landing page or login
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return response;
}

// ============================================================
// Middleware Config
// ============================================================

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
