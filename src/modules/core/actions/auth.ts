'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getSession() {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
        console.error('Session error:', error)
        return null
    }

    return session
}

export async function getUser() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
        console.error('User error:', error)
        return null
    }

    return user
}

export async function requireAuth() {
    const user = await getUser()

    if (!user) {
        redirect('/login')
    }

    return user
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
