import Link from 'next/link';

/**
 * 404 Page for Documents
 * Shown when document doesn't exist or user lacks access.
 */
export default function DocumentNotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-8">
            <div className="text-center">
                <div className="h-16 w-16 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Document Not Found
                </h1>
                <p className="text-gray-600 mb-6">
                    This document doesn't exist or you don't have permission to view it.
                </p>
                <Link
                    href="/documents"
                    className="inline-flex px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                    Back to Documents
                </Link>
            </div>
        </div>
    );
}
