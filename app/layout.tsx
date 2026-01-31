import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import RouteProgress from '@/components/ui/RouteProgress'
import NavigationOverlay from '@/components/ui/NavigationOverlay'
import { ToastProvider } from '@/components/ui/ToastProvider'

export const metadata = {
  title: 'Trinity In One Cloud Mining & Investments',
  description: 'Professional cryptocurrency cloud mining and investment platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning className="antialiased">
          <ToastProvider>
            <RouteProgress />
            <NavigationOverlay />
            {children}
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
