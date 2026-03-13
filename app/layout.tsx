import { ClerkProvider } from '@clerk/nextjs'
import { cookies } from 'next/headers'
import './globals.css'
import RouteProgress from '@/components/ui/RouteProgress'
import NavigationOverlay from '@/components/ui/NavigationOverlay'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { SiteThemeProvider } from '@/components/ui/SiteThemeProvider'
import SupportFab from '@/components/ui/SupportFab'
import { LANGUAGE_COOKIE_KEY, readLanguageFromCookie } from '@/lib/language-cookie'

export const metadata = {
  title: 'Trinity In One Cloud Mining & Investments',
  description: 'Professional cryptocurrency cloud mining and investment platform',
  icons: {
    icon: '/trinity-favicon.svg',
    shortcut: '/trinity-favicon.svg',
    apple: '/trinity-favicon.svg',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const initialLanguage = readLanguageFromCookie(cookieStore.get(LANGUAGE_COOKIE_KEY)?.value) || 'en'
  const allowedRedirectOrigins = Array.from(
    new Set(
      [
        'https://trinityin1investments.com',
        'https://www.trinityin1investments.com',
        'https://trinity-mining-investment-app.vercel.app',
        'https://trinity-mining-investment-app-remyremified-gits-projects.vercel.app',
        process.env.NEXT_PUBLIC_APP_URL?.trim(),
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
      ].filter((value): value is string => Boolean(value))
    )
  )

  return (
    <ClerkProvider
      allowedRedirectOrigins={allowedRedirectOrigins}
    >
      <html lang={initialLanguage} suppressHydrationWarning>
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
                    var langKey = 'trinity_language_preference';
                    var cookieMatch = document.cookie.match(/(?:^|; )${LANGUAGE_COOKIE_KEY}=([^;]*)/);
                    var cookieLang = cookieMatch && cookieMatch[1] ? decodeURIComponent(cookieMatch[1]) : '';
                    var localLang = localStorage.getItem(langKey);
                    var chosenLang = localLang || cookieLang || '${initialLanguage}';
                    if (chosenLang) {
                      document.documentElement.lang = chosenLang;
                      localStorage.setItem(langKey, chosenLang);
                    }
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
              <SupportFab />
            </ToastProvider>
          </SiteThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
