'use client'

import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  icon?: ReactNode
  action?: ReactNode
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div
      className="p-8 md:p-10 rounded-3xl text-center"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      }}
    >
      {icon && <div className="text-4xl mb-4">{icon}</div>}
      <div className="text-xl font-semibold text-white mb-2">{title}</div>
      <div className="text-white/60 text-sm max-w-md mx-auto">{description}</div>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
