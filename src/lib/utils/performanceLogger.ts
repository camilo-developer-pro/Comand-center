/**
 * Performance Logger
 * 
 * Utility for tracking and logging performance metrics
 */

interface PerformanceEntry {
    name: string;
    startTime: number;
    duration?: number;
}

class PerformanceLogger {
    private entries: Map<string, PerformanceEntry> = new Map();
    private enabled = process.env.NODE_ENV === 'development';

    start(name: string): void {
        if (!this.enabled) return;
        this.entries.set(name, {
            name,
            startTime: performance.now(),
        });
    }

    end(name: string): number | null {
        if (!this.enabled) return null;
        const entry = this.entries.get(name);
        if (!entry) return null;

        const duration = performance.now() - entry.startTime;
        entry.duration = duration;

        console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
        return duration;
    }

    mark(name: string): void {
        if (!this.enabled) return;
        console.log(`[PERF MARK] ${name} at ${performance.now().toFixed(2)}ms`);
    }

    getEntries(): PerformanceEntry[] {
        return Array.from(this.entries.values());
    }

    clear(): void {
        this.entries.clear();
    }
}

export const perfLogger = new PerformanceLogger();
