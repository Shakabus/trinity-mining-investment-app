'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'

export default function SupportFab() {
  const pathname = usePathname()
  const isUserDashboard = pathname?.startsWith('/dashboard')
  const supportHref = isUserDashboard ? '/dashboard/support' : '/contact'

  return (
    <Link
      href={supportHref}
      aria-label="Contact support"
      title="Contact support"
      className="fixed bottom-5 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full border border-white/20 text-white shadow-2xl backdrop-blur-md transition hover:scale-105 hover:border-white/35"
      style={{
        background:
          'linear-gradient(135deg, rgba(88, 45, 255, 0.95), rgba(12, 116, 255, 0.92))',
      }}
    >
      <MessageCircle size={22} />
    </Link>
  )
}
