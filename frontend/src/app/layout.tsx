import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'

// Import from our layout module
import { Container } from '@/components/layout_module'
// Import AuthProvider
import { AuthProvider } from '@/contexts/AuthContext'

// Initialize the Inter font
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Lanbitou Password Manager',
  description: 'Secure password management solution',
  viewport: 'width=device-width, initial-scale=1',
}
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-Hant" className={`${inter.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="relative flex min-h-screen flex-col">
          <AuthProvider>
            <main className="flex-1">
              <Container>
                {children}
              </Container>
            </main>
          </AuthProvider>
        </div>
      </body>
    </html>
  )
}