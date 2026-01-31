import Skeleton from '@/components/ui/Skeleton'
import Spinner from '@/components/ui/Spinner'

export default function GlobalLoading() {
  return (
    <div className="min-h-screen px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3 text-white/70">
          <Spinner className="text-white/70" />
          <span>Loading...</span>
        </div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}
