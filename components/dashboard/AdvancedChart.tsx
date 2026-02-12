'use client'

import { memo, useEffect, useRef, useState } from 'react'

function readTheme(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function AdvancedChart() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>(readTheme)

  useEffect(() => {
    const root = document.documentElement
    const syncTheme = () => setTheme(readTheme())
    const observer = new MutationObserver(syncTheme)

    syncTheme()
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

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
      isTransparent: true,
      backgroundColor: 'rgba(0, 0, 0, 0)',
      overrides: {
        'paneProperties.background': 'rgba(0, 0, 0, 0)',
        'paneProperties.backgroundType': 'solid',
        'paneProperties.vertGridProperties.color':
          theme === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.06)',
        'paneProperties.horzGridProperties.color':
          theme === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.06)',
        'scalesProperties.textColor':
          theme === 'light' ? 'rgba(15, 23, 42, 0.74)' : 'rgba(255, 255, 255, 0.7)',
      },
      hide_top_toolbar: false,
      hide_legend: false,
      support_host: 'https://www.tradingview.com',
    })

    host.appendChild(script)

    return () => {
      host.innerHTML = ''
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
      <div className="tradingview-widget-container w-full h-full">
        <div ref={hostRef} className="w-full h-full" />
      </div>
    </div>
  )
}

export default memo(AdvancedChart)
