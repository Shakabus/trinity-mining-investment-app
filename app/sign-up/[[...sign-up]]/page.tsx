'use client'

import { ClerkLoaded, ClerkLoading, SignUp } from '@clerk/nextjs'
import '../../clerk-custom.css'

const hasClerkClientKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim())

export default function SignUpPage() {
  if (!hasClerkClientKey) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ background: '#000000' }}>
        <div className="w-full max-w-md rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-red-200">
          Authentication is unavailable. Configure Clerk environment variables in Vercel.
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: '#000000' }}
    >
      <ClerkLoading>
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/5 p-6 text-white/80">
          Loading sign-up...
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <div className="w-full max-w-md">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            forceRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: 'mx-auto w-full',
                card: 'shadow-2xl',
              }
            }}
          />
        </div>
      </ClerkLoaded>
    </div>
  )
}
