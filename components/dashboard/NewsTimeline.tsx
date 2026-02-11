'use client'

import { memo, useEffect, useRef } from 'react'
import { useSiteTheme } from '@/components/ui/SiteThemeProvider'

function NewsTimeline() {
  const hostRef = useRef<HTMLDivElement>(null)
  const { theme } = useSiteTheme()
  const widgetTheme = theme === 'light' ? 'light' : 'dark'

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // Hard reset before embed
    host.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      feedMode: 'market',
      market: 'crypto',
      colorTheme: widgetTheme,
      isTransparent: true,
      displayMode: 'regular',
      width: '100%',
      height: '100%',
      locale: 'en',
    })

    host.appendChild(script)

    return () => {
      host.innerHTML = ''
    }
  }, [widgetTheme])

  return (
    <div
      className="rounded-3xl overflow-hidden w-full h-full"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Page controls height; widget should fill parent */}
      <div className="tradingview-widget-container w-full h-full p-4">
        {/* Only mutation target */}
        <div ref={hostRef} className="w-full h-full" />
      </div>
    </div>
  )
}

export default memo(NewsTimeline)
