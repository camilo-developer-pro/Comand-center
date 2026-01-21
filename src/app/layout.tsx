import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/lib/providers/QueryProvider'
import { ToastProvider, ThemeProvider, KeyboardShortcutsProvider } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Command Center ERP',
    description: 'Modular Command Center ERP - Version 1.0',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider>
                    <QueryProvider>
                        <KeyboardShortcutsProvider>
                            {children}
                        </KeyboardShortcutsProvider>
                        <ToastProvider />
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
