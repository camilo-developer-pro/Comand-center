// src/modules/core/auth/actions/index.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const authSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})

export async function signInWithEmail(formData: z.infer<typeof authSchema>) {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
}

export async function signUpWithEmail(formData: z.infer<typeof authSchema>) {
    const supabase = await createClient()

    // In a real app, you might want to capture more info like name
    const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
        },
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true, message: 'Check your email for the confirmation link.' }
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
