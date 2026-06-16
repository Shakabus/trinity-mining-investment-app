'use client'

import { memo, useEffect, useRef } from 'react'

function AdvancedChart() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const mountWidget = () => {
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
        theme: 'dark',
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
          'paneProperties.vertGridProperties.color': 'rgba(255, 255, 255, 0.06)',
          'paneProperties.horzGridProperties.color': 'rgba(255, 255, 255, 0.06)',
          'scalesProperties.textColor': 'rgba(255, 255, 255, 0.7)',
        },
        hide_top_toolbar: false,
        hide_legend: false,
        support_host: 'https://www.tradingview.com',
      })

      host.appendChild(script)
    }

    mountWidget()
    const retryTimer = window.setTimeout(mountWidget, 550)

    return () => {
      window.clearTimeout(retryTimer)
      host.innerHTML = ''
    }
  }, [])

  return (
    <div
      className="w-full h-full rounded-3xl overflow-hidden no-theme-invert"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div className="tradingview-widget-container w-full h-full">
        <div ref={hostRef} className="w-full h-full" />
      </div>
    </div>
  )
}

export default memo(AdvancedChart)
