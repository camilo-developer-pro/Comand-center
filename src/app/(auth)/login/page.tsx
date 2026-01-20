/**
 * Login Page - Stub Implementation
 * Full auth implementation in Phase 3.
 */
export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="h-12 w-12 mx-auto mb-4 rounded-xl bg-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">CC</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
                    <p className="text-gray-600 mt-2">Sign in to your account</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-center text-gray-500 py-8">
                        Authentication implementation coming in Phase 3.
                        <br />
                        <span className="text-sm">
                            For now, set up Supabase Auth manually.
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}
