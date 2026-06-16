'use client'

import { type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  loadingText?: string
}

export default function LoadingButton({
  isLoading = false,
  loadingText,
  children,
  disabled,
  ...rest
}: LoadingButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || isLoading}
      className={`${rest.className || ''} ${isLoading ? 'opacity-80 cursor-not-allowed' : ''}`}
      aria-busy={isLoading}
    >
      <span className="inline-flex items-center gap-2">
        {isLoading && <Loader2 size={16} className="animate-spin" />}
        {isLoading ? loadingText || 'Loading...' : children}
      </span>
    </button>
  )
}
