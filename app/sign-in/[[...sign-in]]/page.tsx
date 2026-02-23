import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import '../../clerk-custom.css'

export default function SignInPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: '#000000' }}
    >
      <div className="w-full max-w-md space-y-4">
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto w-full',
              card: 'shadow-2xl',
            },
          }}
        />

        <div className="rounded-2xl border border-white/20 bg-white/5 p-4 text-center">
          <p className="text-sm text-white/80">
            Having trouble logging in?
          </p>
          <Link
            href="/contact"
            className="mt-2 inline-flex rounded-full bg-[#582dff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4b24db]"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
