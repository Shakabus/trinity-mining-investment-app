import Link from 'next/link'
import BitryxHeader from '@/components/marketing/BitryxHeader'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <BitryxHeader />
      </div>
    </div>
  )
}
