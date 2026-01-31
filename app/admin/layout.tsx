import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import AdminLayoutClient from '@/components/admin/AdminLayoutClient'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId }
  })

  if (!user || user.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <AdminLayoutClient user={{ email: user.email, fullName: user.fullName }}>
      {children}
    </AdminLayoutClient>
  )
}