'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LazyHydrationBoundary } from '@/modules/editor/components/LazyHydrationBoundary';
import { getWidget, type WidgetKey } from '@/modules/editor/registry';
import { WidgetSkeleton } from '@/modules/editor/components/WidgetSkeleton';

interface BenchmarkMetrics {
    initialRenderTime: number;
    timeToInteractive: number;
    widgetsHydrated: number;
    networkRequests: number;
    memoryUsage: number;
}

const WIDGET_COUNT = 50;

// Generate 50 test widget configs
function generateTestWidgets(): Array<{ type: WidgetKey; config: Record<string, unknown> }> {
    return Array.from({ length: WIDGET_COUNT }, (_, i) => ({
        type: 'crm-leads' as WidgetKey,
        config: { title: `Lead List ${i + 1}`, maxItems: 5 },
    }));
}

export function BenchmarkClient() {
    const [lazyEnabled, setLazyEnabled] = useState(true);
    const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const startTimeRef = useRef<number>(0);
    const hydratedCountRef = useRef<number>(0);

    const widgets = generateTestWidgets();

    // Track hydration
    const handleWidgetVisible = useCallback(() => {
        hydratedCountRef.current += 1;
    }, []);

    // Run benchmark
    const runBenchmark = useCallback(() => {
        setIsRunning(true);
        startTimeRef.current = performance.now();
        hydratedCountRef.current = 0;

        // Reset metrics
        setMetrics(null);

        // Measure after initial render
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const initialRenderTime = performance.now() - startTimeRef.current;

                // Measure after 2 seconds (time to interactive simulation)
                setTimeout(() => {
                    const timeToInteractive = performance.now() - startTimeRef.current;

                    // Get memory usage if available
                    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

                    setMetrics({
                        initialRenderTime: Math.round(initialRenderTime),
                        timeToInteractive: Math.round(timeToInteractive),
                        widgetsHydrated: hydratedCountRef.current,
                        networkRequests: 0, // Would need performance observer for accurate count
                        memoryUsage: Math.round(memoryUsage / 1024 / 1024), // MB
                    });
                    setIsRunning(false);
                }, 2000);
            });
        });
    }, []);

    return (
        <div className="space-y-8">
            {/* Controls */}
            <div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={lazyEnabled}
                        onChange={(e) => setLazyEnabled(e.target.checked)}
                        className="w-4 h-4"
                    />
                    <span className="font-medium text-gray-900 dark:text-white">Lazy Hydration Enabled</span>
                </label>
                <button
                    onClick={runBenchmark}
                    disabled={isRunning}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                >
                    {isRunning ? 'Running Benchmark...' : 'Run Benchmark'}
                </button>
            </div>

            {/* Metrics Display */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <MetricCard title="Initial Render" value={`${metrics.initialRenderTime}ms`} />
                    <MetricCard title="Time to Interactive" value={`${metrics.timeToInteractive}ms`} />
                    <MetricCard title="Widgets Hydrated" value={`${metrics.widgetsHydrated}/${WIDGET_COUNT}`} />
                    <MetricCard
                        title="Memory Usage"
                        value={metrics.memoryUsage > 0 ? `${metrics.memoryUsage}MB` : 'N/A'}
                    />
                </div>
            )}

            {/* Widget Grid */}
            <div className="space-y-4 h-[600px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 shadow-inner">
                {widgets.map((widget, index) => {
                    const WidgetComponent = getWidget(widget.type);

                    if (lazyEnabled) {
                        return (
                            <LazyHydrationBoundary
                                key={`${lazyEnabled}-${index}`}
                                widgetType={widget.type}
                                minHeight={200}
                                onVisible={handleWidgetVisible}
                            >
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                                    <WidgetComponent config={widget.config} />
                                </div>
                            </LazyHydrationBoundary>
                        );
                    }

                    return (
                        <div key={`${lazyEnabled}-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                            <WidgetComponent config={widget.config} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MetricCard({ title, value }: { title: string; value: string }) {
    return (
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-medium">{title}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        </div>
    );
}
