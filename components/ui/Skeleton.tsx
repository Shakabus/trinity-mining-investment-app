'use client'

import type { HTMLAttributes } from 'react'

export default function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`animate-pulse rounded-xl bg-white/10 ${className}`}
    />
  )
}
