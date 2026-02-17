import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(
    {
      error:
        'Direct payment rejection is disabled. Use Account Balance Controls for all trading payment review actions.',
    },
    { status: 410 }
  )
}
