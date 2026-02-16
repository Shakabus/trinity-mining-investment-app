'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import LoadingButton from '@/components/ui/LoadingButton'

type ClerkApiError = {
  errors?: Array<{
    longMessage?: string
    message?: string
  }>
}

export default function ChangePasswordForm() {
  const { isLoaded, user } = useUser()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [signOutOtherSessions, setSignOutOtherSessions] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleSubmit = async () => {
    if (!isLoaded || !user) {
      setStatus({ type: 'error', message: 'Authentication is still loading. Try again in a moment.' })
      return
    }

    if (!currentPassword.trim()) {
      setStatus({ type: 'error', message: 'Current password is required.' })
      return
    }

    if (newPassword.length < 8) {
      setStatus({ type: 'error', message: 'New password must be at least 8 characters.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'New password and confirmation do not match.' })
      return
    }

    if (newPassword === currentPassword) {
      setStatus({ type: 'error', message: 'New password must be different from current password.' })
      return
    }

    setIsSubmitting(true)
    setStatus(null)

    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: signOutOtherSessions,
      })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setStatus({ type: 'success', message: 'Password updated successfully.' })
    } catch (error) {
      const clerkError = error as ClerkApiError
      const message =
        clerkError?.errors?.[0]?.longMessage ||
        clerkError?.errors?.[0]?.message ||
        'Failed to update password. Check your current password and try again.'
      setStatus({ type: 'error', message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="border-t border-white/10 pt-6">
      <h3 className="text-lg font-semibold text-white mb-4">Change Password</h3>
      <p className="text-xs text-white/60 mb-4">
        This updates your Clerk authentication password immediately.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={event => setCurrentPassword(event.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none text-sm md:text-base"
            placeholder="Enter current password"
            autoComplete="current-password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none text-sm md:text-base"
            placeholder="Enter new password"
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none text-sm md:text-base"
            placeholder="Re-enter new password"
            autoComplete="new-password"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-white/80 select-none">
          <input
            type="checkbox"
            checked={signOutOtherSessions}
            onChange={event => setSignOutOtherSessions(event.target.checked)}
            className="h-4 w-4 accent-purple-500"
          />
          Sign out from other devices after password change
        </label>

        {status && (
          <div
            className="px-4 py-3 rounded-lg text-sm"
            style={{
              background: status.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: status.type === 'success' ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)',
              color: status.type === 'success' ? '#6ee7b7' : '#fecaca',
            }}
          >
            {status.message}
          </div>
        )}

        <LoadingButton
          onClick={handleSubmit}
          isLoading={isSubmitting}
          loadingText="Updating password..."
          className="w-full sm:w-auto px-6 py-3 rounded-full font-semibold transition-all text-sm md:text-base disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #582dff, #3a137a)',
            color: '#ffffff',
          }}
        >
          Update Password
        </LoadingButton>
      </div>
    </div>
  )
}
