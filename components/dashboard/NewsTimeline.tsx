'use client'

import { memo, useEffect, useRef } from 'react'

function NewsTimeline() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const mountWidget = () => {
      const widgetRoot = container.querySelector('.tradingview-widget-container__widget') as HTMLDivElement | null
      if (!widgetRoot) return

      widgetRoot.innerHTML = ''
      container.querySelectorAll('script[data-tradingview-embed="news-timeline"]').forEach(node => node.remove())

      const script = document.createElement('script')
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js'
      script.type = 'text/javascript'
      script.async = true
      script.dataset.tradingviewEmbed = 'news-timeline'
      script.innerHTML = `{
        "feedMode": "market",
        "market": "crypto",
        "colorTheme": "dark",
        "isTransparent": true,
        "displayMode": "regular",
        "width": "100%",
        "height": "100%",
        "locale": "en"
      }`

      container.appendChild(script)
    }

    mountWidget()
    const retryTimer = window.setTimeout(mountWidget, 550)

    return () => {
      window.clearTimeout(retryTimer)
      container.querySelectorAll('script[data-tradingview-embed="news-timeline"]').forEach(node => node.remove())
      const widgetRoot = container.querySelector('.tradingview-widget-container__widget') as HTMLDivElement | null
      if (widgetRoot) widgetRoot.innerHTML = ''
    }
  }, [])

  return (
    <div
      className="rounded-3xl overflow-hidden w-full h-full no-theme-invert"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Page controls height; widget should fill parent */}
      <div ref={containerRef} className="tradingview-widget-container w-full h-full p-4">
        <div className="tradingview-widget-container__widget w-full h-full" />
      </div>
    </div>
  )
}

export default memo(NewsTimeline)
