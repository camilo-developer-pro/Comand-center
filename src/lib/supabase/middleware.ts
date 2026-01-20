/**
 * Supabase Middleware Utilities
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * Utilities for creating Supabase clients in middleware context.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export function createMiddlewareClient(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options });
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options });
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    return { supabase, response };
}

export function updateMiddlewareResponse(
    response: NextResponse,
    request: NextRequest
) {
    // Clone headers from original request
    const newResponse = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    // Copy cookies from modified response
    response.cookies.getAll().forEach((cookie) => {
        newResponse.cookies.set(cookie);
    });

    return newResponse;
}
