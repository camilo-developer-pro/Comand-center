// src/modules/core/auth/components/LoginForm.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signInWithEmail } from '../actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true)
        setError(null)

        try {
            const result = await signInWithEmail(data)
            if (result?.error) {
                setError(result.error)
            } else {
                router.push('/')
                router.refresh()
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                    </label>
                    <input
                        {...register('email')}
                        type="email"
                        placeholder="name@company.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    {errors.email && (
                        <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                    </label>
                    <input
                        {...register('password')}
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    {errors.password && (
                        <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                </button>

                <p className="text-center text-sm text-gray-600 mt-4">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-blue-600 hover:underline">
                        Register for free
                    </Link>
                </p>
            </form>
        </div>
    )
}
