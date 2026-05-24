import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Gestión de Stock',
  description: 'Sistema de gestión de ventas y stock',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      <html lang="es" className={`${geist.variable} h-full antialiased`}>
        <body className="h-full">
          {children}
          <Toaster richColors />
        </body>
      </html>
    </ClerkProvider>
  )
}
