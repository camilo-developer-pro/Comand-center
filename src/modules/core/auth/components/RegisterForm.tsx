// src/modules/core/auth/components/RegisterForm.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signUpWithEmail } from '../actions'
import Link from 'next/link'

const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
})

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterForm() {
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
    })

    const onSubmit = async (data: RegisterFormValues) => {
        setIsLoading(true)
        setMessage(null)

        try {
            const result = await signUpWithEmail(data)
            if (result?.error) {
                setMessage({ type: 'error', text: result.error })
            } else {
                setMessage({ type: 'success', text: result.message || 'Check your email to confirm registration.' })
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {message && (
                    <div className={`p-3 text-sm rounded-lg border ${message.type === 'success'
                            ? 'text-green-600 bg-green-50 border-green-100'
                            : 'text-red-600 bg-red-50 border-red-100'
                        }`}>
                        {message.text}
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

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                    </label>
                    <input
                        {...register('confirmPassword')}
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    {errors.confirmPassword && (
                        <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Creating account...' : 'Create account'}
                </button>

                <p className="text-center text-sm text-gray-600 mt-4">
                    Already have an account?{' '}
                    <Link href="/login" className="text-blue-600 hover:underline">
                        Sign in
                    </Link>
                </p>
            </form>
        </div>
    )
}
