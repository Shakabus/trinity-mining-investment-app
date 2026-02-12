'use client'

import { memo, useEffect, useRef } from 'react'
import { useSiteTheme } from '@/components/ui/SiteThemeProvider'

function TradingViewWidget() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { theme } = useSiteTheme()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const widgetRoot = container.querySelector('.tradingview-widget-container__widget') as HTMLDivElement | null
    if (!widgetRoot) return

    widgetRoot.innerHTML = ''
    container.querySelectorAll('script[data-tradingview-embed="market-quotes"]').forEach(node => node.remove())

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js'
    script.type = 'text/javascript'
    script.async = true
    script.dataset.tradingviewEmbed = 'market-quotes'
    script.innerHTML = JSON.stringify({
      colorTheme: theme,
      locale: 'en',
      largeChartUrl: '',
      isTransparent: true,
      showSymbolLogo: true,
      support_host: 'https://www.tradingview.com',
      width: '100%',
      height: '900',
      symbolsGroups: [
        {
          name: 'Crypto',
          symbols: [
            { name: 'BINANCE:BTCUSDT', displayName: 'Bitcoin' },
            { name: 'BINANCE:ETHUSDT', displayName: 'Ethereum' },
            { name: 'BINANCE:SOLUSDT', displayName: 'Solana' },
            { name: 'BINANCE:XRPUSDT', displayName: 'Ripple' },
            { name: 'COINBASE:SOLUSD', displayName: 'Solana' },
            { name: 'BINANCE:LTCUSDT', displayName: 'Litecoin' },
          ],
        },
        {
          name: 'Stocks',
          symbols: [
            { name: 'NASDAQ:AAPL', displayName: 'Apple' },
            { name: 'NASDAQ:TSLA', displayName: 'Tesla' },
            { name: 'NASDAQ:MSFT', displayName: 'Microsoft' },
            { name: 'NASDAQ:AMZN', displayName: 'Amazon' },
            { name: 'NASDAQ:AMD', displayName: 'AMD' },
            { name: 'NASDAQ:META', displayName: 'Meta' },
            { name: 'NASDAQ:GOOGL', displayName: 'Google' },
            { name: 'NASDAQ:COIN', displayName: 'Coinbase' },
            { name: 'NYSE:UBER', displayName: 'Uber' },
          ],
        },
        {
          name: 'Real Estate',
          symbols: [
            { name: 'TSX:RS.PR.A', displayName: '' },
            { name: 'AQUIS:RLE.GB', displayName: '' },
            { name: 'NYSE:KREF/PA', displayName: '' },
            { name: 'NYSE:NXDT/PA', displayName: '' },
          ],
        },
      ],
    })

    container.appendChild(script)

    return () => {
      container.querySelectorAll('script[data-tradingview-embed="market-quotes"]').forEach(node => node.remove())
      widgetRoot.innerHTML = ''
    }
  }, [theme])

  return (
    <div
      className="tradingview-widget-container h-[780px] md:h-[920px] w-full no-theme-invert"
      ref={containerRef}
    >
      <div className="tradingview-widget-container__widget h-full w-full" />
      <div className="tradingview-widget-copyright text-[11px] text-white/50">
        <a href="https://www.tradingview.com/markets/" rel="noopener nofollow" target="_blank">
          <span className="text-blue-300">Market summary</span>
        </a>
        <span className="ml-1">by TradingView</span>
      </div>
    </div>
  )
}

export default memo(TradingViewWidget)
