// File: src/app/api/realtime/bridge/route.ts
// Runtime: Node.js for pg compatibility
// Dynamic rendering to force server-side execution

import { NextRequest, NextResponse } from 'next/server';
import { getRealtimeBridge, startRealtimeBridge, stopRealtimeBridge } from '@/lib/realtime/realtime-bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    const bridge = getRealtimeBridge();
    const stats = bridge.getStats();
    return NextResponse.json(stats);
}

export async function POST(request: NextRequest) {
    const { action } = await request.json();

    if (!action || typeof action !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid action' }, { status: 400 });
    }

    try {
        switch (action.toLowerCase()) {
            case 'start':
                await startRealtimeBridge();
                return NextResponse.json({ success: true, message: 'Bridge started' });

            case 'stop':
                await stopRealtimeBridge();
                return NextResponse.json({ success: true, message: 'Bridge stopped' });

            case 'restart':
                await stopRealtimeBridge();
                await startRealtimeBridge();
                return NextResponse.json({ success: true, message: 'Bridge restarted' });

            default:
                return NextResponse.json({ error: 'Invalid action. Use start, stop, or restart.' }, { status: 400 });
        }
    } catch (error) {
        console.error('Bridge action error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}