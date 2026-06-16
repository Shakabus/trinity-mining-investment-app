import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getFinancialNewsTickerItems } from '@/lib/financial-news'
import { parseTickerLimit } from '@/lib/notification-ticker'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const limit = parseTickerLimit(url.searchParams.get('limit'))
    const items = await getFinancialNewsTickerItems(limit)

    return NextResponse.json(
      {
        items: items.map(item => ({
          ...item,
          id: `user-${item.id}`,
          href: '/dashboard',
        })),
        generatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'private, max-age=0, no-cache' } },
    )
  } catch (error) {
    console.error('User notification ticker error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
