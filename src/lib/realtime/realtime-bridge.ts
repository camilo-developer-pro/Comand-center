/**
 * Realtime Bridge: PostgreSQL LISTEN/NOTIFY → Supabase Broadcast
 * Command Center V3.0 - Phase 3.2
 *
 * This module connects to PostgreSQL, listens for notifications on predefined channels,
 * parses payloads, and broadcasts them via Supabase Realtime to connected clients.
 * Includes automatic reconnection, heartbeats, and monitoring stats.
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Pool, PoolClient } from 'pg';

// Notification channels we're interested in (aligned with schema triggers)
const PG_CHANNELS = [
    'dashboard_delta',
    'stats_updated',
    'entity_changed',
    'execution_status',
    'graph_changed',
    'error_logged',
    'protocol_patched'
] as const;

type PgChannel = typeof PG_CHANNELS[number];

interface NotificationPayload {
    channel: PgChannel;
    payload: Record<string, unknown>;
    timestamp: number;
    workspace_id?: string;  // Optional for multi-tenant support
}

interface BridgeConfig {
    pgConnectionString: string;
    supabaseUrl: string;
    supabaseServiceKey: string;
    reconnectDelayMs?: number;
    heartbeatIntervalMs?: number;
    maxReconnectAttempts?: number;
}

/**
 * RealtimeBridge connects PostgreSQL LISTEN/NOTIFY to Supabase Broadcast
 * Singleton pattern for server-side usage in Next.js.
 */
export class RealtimeBridge {
    private pgPool: Pool;
    private pgClient: PoolClient | null = null;
    private supabase: ReturnType<typeof createClient>;
    private broadcastChannel: RealtimeChannel | null = null;
    private config: Required<BridgeConfig>;
    private isRunning = false;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private reconnectAttempts = 0;
    private messageCount = 0;

    constructor(config: BridgeConfig) {
        this.config = {
            reconnectDelayMs: 5000,
            heartbeatIntervalMs: 30000,
            maxReconnectAttempts: 10,
            ...config
        };

        this.pgPool = new Pool({
            connectionString: config.pgConnectionString,
            max: 1,  // Single connection for LISTEN
            idleTimeoutMillis: 0,
            connectionTimeoutMillis: 10000
        });

        this.supabase = createClient(
            config.supabaseUrl,
            config.supabaseServiceKey
        );
    }

    /**
     * Start the bridge with connection setup
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('[RealtimeBridge] Already running');
            return;
        }

        this.isRunning = true;
        await this.connect();
        this.startHeartbeat();

        console.log('[RealtimeBridge] Started successfully');
    }

    /**
     * Stop the bridge and clean up resources
     */
    async stop(): Promise<void> {
        this.isRunning = false;

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.broadcastChannel) {
            await this.supabase.removeChannel(this.broadcastChannel);
            this.broadcastChannel = null;
        }

        if (this.pgClient) {
            this.pgClient.release(true);  // Force release
            this.pgClient = null;
        }

        await this.pgPool.end();

        console.log('[RealtimeBridge] Stopped');
    }

    /**
     * Establish PostgreSQL connection and subscribe to channels
     */
    private async connect(): Promise<void> {
        try {
            this.reconnectAttempts = 0;
            this.pgClient = await this.pgPool.connect();

            this.pgClient.on('notification', this.handleNotification.bind(this));

            for (const channel of PG_CHANNELS) {
                await this.pgClient.query(`LISTEN ${channel}`);
                console.log(`[RealtimeBridge] Listening on: ${channel}`);
            }

            this.broadcastChannel = this.supabase.channel('realtime-bridge', {
                config: {
                    broadcast: { self: false },
                    presence: { key: 'realtime-bridge' }
                }
            });

            await this.broadcastChannel.subscribe((status) => {
                console.log(`[RealtimeBridge] Broadcast channel status: ${status}`);
            });

            this.pgClient.on('error', this.handlePgError.bind(this));

        } catch (error) {
            console.error('[RealtimeBridge] Connection failed:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Handle incoming PostgreSQL notification and broadcast
     */
    private async handleNotification(msg: { channel: string; payload?: string }): Promise<void> {
        if (!msg.payload) return;

        try {
            const payload = JSON.parse(msg.payload);
            const notification: NotificationPayload = {
                channel: msg.channel as PgChannel,
                payload,
                timestamp: Date.now(),
                workspace_id: payload.workspace_id as string || undefined
            };

            this.messageCount++;

            if (this.broadcastChannel) {
                await this.broadcastChannel.send({
                    type: 'broadcast',
                    event: msg.channel,
                    payload: notification
                });
            }

            console.log(`[RealtimeBridge] Broadcasted: ${msg.channel}`, notification);

        } catch (error) {
            console.error('[RealtimeBridge] Failed to process notification:', error);
        }
    }

    /**
     * Handle PostgreSQL errors and trigger reconnection
     */
    private handlePgError(error: Error): void {
        console.error('[RealtimeBridge] PostgreSQL error:', error);

        if (this.pgClient) {
            this.pgClient.release(true);
            this.pgClient = null;
        }

        this.scheduleReconnect();
    }

    /**
     * Schedule reconnection with exponential backoff
     */
    private scheduleReconnect(): void {
        if (!this.isRunning || this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            console.error('[RealtimeBridge] Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1), 60000);

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        console.log(`[RealtimeBridge] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Start heartbeat to maintain connection
     */
    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(async () => {
            if (this.pgClient) {
                try {
                    await this.pgClient.query('SELECT 1');

                    if (this.broadcastChannel) {
                        await this.broadcastChannel.send({
                            type: 'broadcast',
                            event: 'heartbeat',
                            payload: {
                                timestamp: Date.now(),
                                messageCount: this.messageCount,
                                uptime: process.uptime()
                            }
                        });
                    }
                } catch (error) {
                    console.error('[RealtimeBridge] Heartbeat failed:', error);
                    this.handlePgError(error as Error);
                }
            }
        }, this.config.heartbeatIntervalMs);
    }

    /**
     * Get detailed statistics
     */
    getStats(): { isRunning: boolean; messageCount: number; reconnectAttempts: number; channels: readonly string[]; uptime?: number } {
        return {
            isRunning: this.isRunning,
            messageCount: this.messageCount,
            reconnectAttempts: this.reconnectAttempts,
            channels: PG_CHANNELS,
            uptime: this.isRunning ? process.uptime() : undefined
        };
    }
}

// Singleton instance for server-side use
let bridgeInstance: RealtimeBridge | null = null;

export function getRealtimeBridge(): RealtimeBridge {
    if (!bridgeInstance) {
        bridgeInstance = new RealtimeBridge({
            pgConnectionString: process.env.DATABASE_URL!,
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
            supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
        });
    }
    return bridgeInstance;
}

export async function startRealtimeBridge(): Promise<void> {
    const bridge = getRealtimeBridge();
    await bridge.start();
}

export async function stopRealtimeBridge(): Promise<void> {
    if (bridgeInstance) {
        await bridgeInstance.stop();
        bridgeInstance = null;
    }
}