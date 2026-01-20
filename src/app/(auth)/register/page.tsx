// src/app/(auth)/register/page.tsx
import { RegisterForm } from '@/modules/core/auth/components/RegisterForm'

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="h-12 w-12 mx-auto mb-4 rounded-xl bg-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">CC</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
                    <p className="text-gray-600 mt-2">Create your account</p>
                </div>

                <RegisterForm />
            </div>
        </div>
    );
}
