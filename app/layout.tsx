import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import RouteProgress from '@/components/ui/RouteProgress'
import NavigationOverlay from '@/components/ui/NavigationOverlay'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { SiteThemeProvider } from '@/components/ui/SiteThemeProvider'

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
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  try {
                    var key = 'trinity_site_theme';
                    var saved = localStorage.getItem(key);
                    var theme = saved === 'light' || saved === 'dark' ? saved : 'dark';
                    document.documentElement.dataset.theme = theme;
                  } catch (e) {
                    document.documentElement.dataset.theme = 'dark';
                  }
                })();
              `,
            }}
          />
          <SiteThemeProvider>
            <ToastProvider>
              <RouteProgress />
              <NavigationOverlay />
              {children}
            </ToastProvider>
          </SiteThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
