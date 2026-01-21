// Server Component
import { Suspense } from 'react';
import { BenchmarkClient } from './BenchmarkClient';

export const metadata = {
    title: 'Performance Benchmark | Command Center',
};

export default function BenchmarkPage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold mb-4">Widget Performance Benchmark</h1>
            <p className="text-gray-600 mb-8">
                This page tests the performance of 50 widgets with and without lazy hydration.
            </p>
            <Suspense fallback={<div>Loading benchmark...</div>}>
                <BenchmarkClient />
            </Suspense>
        </div>
    );
}
