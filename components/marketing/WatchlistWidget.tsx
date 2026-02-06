'use client'

import { useEffect, useRef } from 'react'

export default function WatchlistWidget() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js'
    script.async = true
    script.type = 'text/javascript'
    script.innerHTML = JSON.stringify(
      {
        colorTheme: 'dark',
        locale: 'en',
        largeChartUrl: '',
        isTransparent: true,
        showSymbolLogo: true,
        backgroundColor: '#0F0F0F',
        support_host: 'https://www.tradingview.com',
        width: '100%',
        height: '100%',
        symbolsGroups: [
          {
            name: 'Crypto Currency',
            symbols: [
              { name: 'BINANCE:BTCUSDT', displayName: 'Bitcoin' },
              { name: 'BINANCE:ETHUSDT', displayName: 'Ethereum' },
              { name: 'BINANCE:LTCUSDT', displayName: 'Litecoin' },
            ],
          },
        ],
      },
      null,
      2
    )

    containerRef.current.appendChild(script)
  }, [])

  return (
    <div className="tradingview-widget-container h-full w-full" ref={containerRef}>
      <div className="tradingview-widget-container__widget h-full w-full" />
      <div className="tradingview-widget-copyright">
        <a href="https://www.tradingview.com/markets/" rel="noopener nofollow" target="_blank">
          <span className="blue-text">Market summary</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  )
}
