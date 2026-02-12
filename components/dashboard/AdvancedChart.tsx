'use client'

import { memo, useEffect, useRef } from 'react'
import { useSiteTheme } from '@/components/ui/SiteThemeProvider'

function AdvancedChart() {
  const hostRef = useRef<HTMLDivElement>(null)
  const { theme } = useSiteTheme()

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // Prevent duplicate injection (dev / StrictMode)
    if (
      host.querySelector('iframe') ||
      host.querySelector('script[src*="embed-widget-advanced-chart"]')
    ) {
      return
    }

    // Hard reset to avoid stacking
    host.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true

    script.innerHTML = JSON.stringify({
      autosize: true,

      symbol: 'BINANCE:BTCUSDT',
      interval: '60',
      timezone: 'Etc/UTC',
      theme,
      style: '1',
      locale: 'en',

      allow_symbol_change: true,
      save_image: false,
      calendar: false,

      // ✅ Key: enable transparency for Advanced Chart embed
      isTransparent: true,

      // ✅ Keep background fully transparent
      backgroundColor: 'rgba(0, 0, 0, 0)',

      // ✅ Force chart pane background transparent (this is what usually fixes the black pane)
      overrides: {
        'paneProperties.background': 'rgba(0, 0, 0, 0)',
        'paneProperties.backgroundType': 'solid',

        // (Optional) grid visibility tuning to match your glass UI
        'paneProperties.vertGridProperties.color':
          theme === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.06)',
        'paneProperties.horzGridProperties.color':
          theme === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.06)',

        // (Optional) text colors
        'scalesProperties.textColor':
          theme === 'light' ? 'rgba(15, 23, 42, 0.74)' : 'rgba(255, 255, 255, 0.7)',
      },

      // UI toggles (keep as you prefer)
      hide_top_toolbar: false,
      hide_legend: false,

      support_host: 'https://www.tradingview.com',
    })

    host.appendChild(script)

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (hostRef.current) hostRef.current.innerHTML = ''
    }
  }, [theme])

  return (
    <div
      className="w-full h-full rounded-3xl overflow-hidden no-theme-invert"
      style={{
        background:
          theme === 'light'
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(241, 245, 249, 0.78))'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: theme === 'light' ? '1px solid rgba(15, 23, 42, 0.16)' : '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: theme === 'light' ? '0 10px 24px rgba(15, 23, 42, 0.14)' : '0 8px 32px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* TradingView container must fill parent */}
      <div className="tradingview-widget-container w-full h-full">
        <div ref={hostRef} className="w-full h-full" />
      </div>
    </div>
  )
}

export default memo(AdvancedChart)
