'use client'

import Link from 'next/link'

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  console.error('[app] runtime error', error)

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/95 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <h1 className="text-3xl font-bold text-white mb-4">Application error</h1>
        <p className="text-sm text-slate-300 mb-6">
          A server-side exception occurred while loading the app. Please try again or contact support if this continues.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Retry
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20"
          >
            Return home
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
