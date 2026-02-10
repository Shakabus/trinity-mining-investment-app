import { prisma } from '@/lib/db'
import Link from 'next/link'
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const DEFAULT_PAGE_SIZE = 50
function getPresenceState(currentSessionStartedAt: Date | null, lastSeenAt: Date | null) {
  if (currentSessionStartedAt) return 'online' as const
  if (lastSeenAt) return 'away' as const
  return 'offline' as const
}

function formatDuration(seconds: number) {
  if (seconds <= 0) return '0m'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function formatSince(iso: Date | null) {
  if (!iso) return 'Never'
  return iso.toLocaleString()
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; size?: string }>
}) {
  const resolvedParams = searchParams ? await searchParams : undefined
  const page = Math.max(1, Number(resolvedParams?.page) || 1)
  const size = Math.min(100, Math.max(10, Number(resolvedParams?.size) || DEFAULT_PAGE_SIZE))
  const skip = (page - 1) * size

  const [totalUsers, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        accountStatus: true,
        role: true,
        lastSeenAt: true,
        currentSessionStartedAt: true,
        totalSessionSeconds: true,
        userPlans: {
          where: {
            status: { in: ['active', 'awaiting_payment'] },
          },
          select: {
            plan: { select: { name: true } },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: size,
    }),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">User Management</h1>
        <p className="text-white/70">View and manage all registered users ({totalUsers} total)</p>
      </div>

      {/* Users Table */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th className="text-left p-4 text-white/70 font-semibold text-sm">User</th>
                <th className="text-left p-4 text-white/70 font-semibold text-sm hidden md:table-cell">Email</th>
                <th className="text-left p-4 text-white/70 font-semibold text-sm">Status</th>
                <th className="text-left p-4 text-white/70 font-semibold text-sm hidden lg:table-cell">Plan</th>
                <th className="text-left p-4 text-white/70 font-semibold text-sm hidden xl:table-cell">Presence</th>
                <th className="text-left p-4 text-white/70 font-semibold text-sm hidden xl:table-cell">Tracked Time</th>
                <th className="text-left p-4 text-white/70 font-semibold text-sm">Role</th>
                <th className="text-left p-4 text-white/70 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const currentPlan = user.userPlans[0]
                const presenceState = getPresenceState(user.currentSessionStartedAt, user.lastSeenAt)
                const presenceLabel =
                  presenceState === 'online' ? 'Online' : presenceState === 'away' ? 'Away' : 'Offline'
                const trackedSeconds = user.totalSessionSeconds

                return (
                  <tr
                    key={user.id}
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    {/* User */}
                    <td className="p-4">
                      <div>
                        <div className="text-white font-medium text-sm">{user.fullName || 'No Name'}</div>
                        <div className="text-white/50 text-xs md:hidden">{user.email}</div>
                      </div>
                    </td>

                    {/* Email (Desktop only) */}
                    <td className="p-4 hidden md:table-cell">
                      <div className="text-white/80 text-sm">{user.email}</div>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span
                        className="px-2 md:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                        style={{
                          background:
                            user.accountStatus === 'active'
                              ? 'rgba(34, 197, 94, 0.2)'
                              : user.accountStatus === 'pending'
                              ? 'rgba(234, 179, 8, 0.2)'
                              : 'rgba(239, 68, 68, 0.2)',
                          color:
                            user.accountStatus === 'active'
                              ? '#86efac'
                              : user.accountStatus === 'pending'
                              ? '#fde047'
                              : '#fca5a5',
                          border: '1px solid',
                          borderColor:
                            user.accountStatus === 'active'
                              ? 'rgba(34, 197, 94, 0.3)'
                              : user.accountStatus === 'pending'
                              ? 'rgba(234, 179, 8, 0.3)'
                              : 'rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        {user.accountStatus.toUpperCase()}
                      </span>
                    </td>

                    {/* Plan */}
                    <td className="p-4 hidden lg:table-cell">
                      <div className="text-white/80 text-sm">{currentPlan?.plan?.name || 'No active plan'}</div>
                    </td>

                    {/* Presence */}
                    <td className="p-4 hidden xl:table-cell">
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{
                            background:
                              presenceState === 'online'
                                ? '#22c55e'
                                : presenceState === 'away'
                                ? '#f59e0b'
                                : '#6b7280',
                          }}
                        />
                        <span className="text-white">{presenceLabel}</span>
                      </div>
                      <div className="text-xs text-white/50 mt-1">Last seen {formatSince(user.lastSeenAt)}</div>
                    </td>

                    {/* Tracked Time */}
                    <td className="p-4 hidden xl:table-cell">
                      <div className="text-white text-sm">{formatDuration(trackedSeconds)}</div>
                    </td>

                    {/* Role */}
                    <td className="p-4">
                      <span
                        className="px-2 md:px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: user.role === 'admin' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                          color: user.role === 'admin' ? '#c4b5fd' : '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        {user.role.toUpperCase()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                        style={{
                          background: 'rgba(88, 45, 255, 0.2)',
                          border: '1px solid rgba(88, 45, 255, 0.3)',
                          color: '#a78bfa',
                        }}
                      >
                        View
                        <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">👥</div>
            <div className="text-xl font-semibold text-white mb-2">No users found</div>
            <div className="text-white/60">User accounts will appear here once registered.</div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-white/60">
        <div>
          Showing {(skip + 1).toLocaleString()}–{Math.min(skip + size, totalUsers).toLocaleString()} of{' '}
          {totalUsers.toLocaleString()}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/users?page=${Math.max(1, page - 1)}&size=${size}`}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
              page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-white/10'
            }`}
          >
            <ChevronLeft size={16} />
            Prev
          </Link>
          <div className="text-white/80">Page {page}</div>
          <Link
            href={`/admin/users?page=${page + 1}&size=${size}`}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
              skip + size >= totalUsers ? 'pointer-events-none opacity-50' : 'hover:bg-white/10'
            }`}
          >
            Next
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
