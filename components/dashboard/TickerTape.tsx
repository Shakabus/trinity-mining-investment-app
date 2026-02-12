'use client'

import { useEffect, useRef } from 'react'

export default function TickerTape() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const widgetRoot = container.querySelector('.tradingview-widget-container__widget') as HTMLDivElement | null
    if (!widgetRoot) return

    widgetRoot.innerHTML = ''
    container.querySelectorAll('script[data-tradingview-embed="ticker-tape"]').forEach(node => node.remove())

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    script.type = 'text/javascript'
    script.async = true
    script.dataset.tradingviewEmbed = 'ticker-tape'
    script.innerHTML = `{
      "symbols": [
        { "proName": "BITSTAMP:BTCUSD", "title": "Bitcoin" },
        { "proName": "BITSTAMP:ETHUSD", "title": "Ethereum" },
        { "proName": "BINANCE:LTCUSDT", "title": "Litecoin" },
        { "proName": "BINANCE:XRPUSDT", "title": "XRP" },
        { "proName": "BINANCE:SOLUSDT", "title": "Solana" }
      ],
      "showSymbolLogo": true,
      "colorTheme": "dark",
      "isTransparent": true,
      "displayMode": "adaptive",
      "locale": "en"
    }`

    container.appendChild(script)

    return () => {
      container.querySelectorAll('script[data-tradingview-embed="ticker-tape"]').forEach(node => node.remove())
      widgetRoot.innerHTML = ''
    }
  }, [])

  return (
    <div
      className="sticky top-0 z-20 w-full overflow-hidden no-theme-invert"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))',
        backdropFilter: 'blur(28px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div ref={containerRef} className="tradingview-widget-container w-full">
        <div className="tradingview-widget-container__widget w-full" />
      </div>
    </div>
  )
}
