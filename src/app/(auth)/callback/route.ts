/**
 * Auth Callback Route Handler
 * 
 * V1.1 Phase 1: Authentication & User Flow
 * 
 * Handles OAuth redirects and magic link confirmations.
 * This route exchanges the auth code for a session.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);

    // Get the auth code from the URL
    const code = searchParams.get('code');

    // Get the redirect destination (default to documents)
    const next = searchParams.get('next') ?? '/documents';

    // Get any error from the URL
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
        console.error('[auth/callback] OAuth error:', error, errorDescription);
        const errorUrl = new URL('/login', origin);
        errorUrl.searchParams.set('error', errorDescription || error);
        return NextResponse.redirect(errorUrl);
    }

    // Exchange the code for a session
    if (code) {
        const supabase = await createClient();

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
            console.error('[auth/callback] Code exchange error:', exchangeError);
            const errorUrl = new URL('/login', origin);
            errorUrl.searchParams.set('error', 'Failed to sign in. Please try again.');
            return NextResponse.redirect(errorUrl);
        }

        // Successfully authenticated - redirect to destination
        const forwardedHost = request.headers.get('x-forwarded-host');
        const isLocalEnv = process.env.NODE_ENV === 'development';

        if (isLocalEnv) {
            // Local development - use origin directly
            return NextResponse.redirect(`${origin}${next}`);
        } else if (forwardedHost) {
            // Production behind proxy - use forwarded host
            return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
            // Fallback
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // No code provided - redirect to login with error
    console.error('[auth/callback] No code provided');
    const errorUrl = new URL('/login', origin);
    errorUrl.searchParams.set('error', 'Invalid authentication request.');
    return NextResponse.redirect(errorUrl);
}
