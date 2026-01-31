import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Clerk sends different event types
    const eventType = body.type
    
    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name } = body.data
      
      const email = email_addresses[0]?.email_address
      const fullName = first_name && last_name ? `${first_name} ${last_name}` : null
      
      // Create user in database
      const user = await prisma.user.create({
        data: {
          clerkUserId: id,
          email: email,
          fullName: fullName,
          role: 'user',
          accountStatus: 'inactive',
        },
      })
      
      console.log('✅ User created in database:', user.id)
      
      return NextResponse.json({ success: true, userId: user.id })
    }
    
    if (eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name } = body.data
      
      const email = email_addresses[0]?.email_address
      const fullName = first_name && last_name ? `${first_name} ${last_name}` : null
      
      // Update user in database
      await prisma.user.update({
        where: { clerkUserId: id },
        data: {
          email: email,
          fullName: fullName,
        },
      })
      
      console.log('✅ User updated in database')
      
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}