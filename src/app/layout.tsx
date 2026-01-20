import type { Metadata } from 'next'
import './globals.css'

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
            <body>{children}</body>
        </html>
    )
}
