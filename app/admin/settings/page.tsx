import { prisma } from '@/lib/db'
import SupportInboxClient from '@/components/admin/SupportInboxClient'

export const dynamic = 'force-dynamic'

export default async function SupportInboxPage() {
  const tickets = await prisma.supportTicket.findMany({
    include: {
      user: true,
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  const mappedTickets = tickets.map(ticket => ({
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    lastMessageAt: ticket.lastMessageAt ? ticket.lastMessageAt.toISOString() : null,
    user: {
      id: ticket.user.id,
      fullName: ticket.user.fullName,
      email: ticket.user.email,
    },
    messages: ticket.messages.map(message => ({
      id: message.id,
      senderRole: message.senderRole as 'user' | 'support',
      body: message.body,
      attachmentUrl: message.attachmentUrl,
      attachmentName: message.attachmentName,
      attachmentType: message.attachmentType,
      createdAt: message.createdAt.toISOString(),
    })),
  }))

  return (
    <div className="space-y-8">
      <SupportInboxClient tickets={mappedTickets} />

      <div
        className="p-6 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Admin Documentation</h2>
        <p className="text-white/70">
          A detailed guide to every section, control, and workflow in the control panel.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Navigation overview</h3>
          <div className="space-y-4 text-sm text-white/70">
            <div>
              <div className="text-white font-semibold mb-1">Overview</div>
              <div>
                High-level metrics and trends. Use this to confirm platform health: payments, plan activity, and growth.
                Numbers are computed from database records, so if something looks off, check the related tables first.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Users</div>
              <div>
                Search and open a user profile to manage plans, mining settings, earnings overrides, and account status.
                This page is the main control center for individual accounts.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Payments</div>
              <div>
                Approve or reject plan payments. Verify the payment proof and transaction ID before approval to activate
                a plan. Rejecting cancels the pending plan selection.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Withdrawals</div>
              <div>
                Review withdrawal requests. Use status changes to track progression: pending &gt; approved &gt;
                processed. Add the transaction ID when marking as processed.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Referrals</div>
              <div>
                Manage referral settings and referral withdrawals. Adjust bonus rules and track referral-related payout
                activity.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Support</div>
              <div>
                Reply to support tickets, update status, and keep conversations organized. Use this section for all
                support requests and attachments.
              </div>
            </div>
          </div>
        </div>

        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">User management controls</h3>
          <div className="space-y-4 text-sm text-white/70">
            <div>
              <div className="text-white font-semibold mb-1">Assigned hashrate</div>
              <div>
                Sets the maximum hashrate for the user’s plan. Keep it within the plan limit. This influences mining
                speed, shares, and earnings pacing.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Counter speed</div>
              <div>
                Controls how quickly earnings counters update. Use small adjustments to simulate realistic changes.
                Extremely high values can create unrealistic earnings jumps.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Mining pool</div>
              <div>
                Sets the pool label shown on the user’s mining page. Choose a pool that fits the plan or region.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Location</div>
              <div>
                Controls the displayed data center location. Use this to reflect regional power sources or capacity.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Pause / resume mining</div>
              <div>
                Pausing stops live mining updates but keeps the record visible. Resume reactivates live stats tracking.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Account status</div>
              <div>
                Active accounts mine and earn. Pending accounts are waiting for payment confirmation. Inactive accounts
                should not be mining or earning.
              </div>
            </div>
          </div>
        </div>

        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Earnings and plan controls</h3>
          <div className="space-y-4 text-sm text-white/70">
            <div>
              <div className="text-white font-semibold mb-1">Daily estimate override</div>
              <div>
                Manually set daily estimates when needed. If values are present, automated updates pause until cleared.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Total earned override</div>
              <div>
                Set a total earned value for reconciliation or corrections. Use sparingly to avoid mismatched analytics.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Historical earnings release</div>
              <div>
                Unlock historical earnings for withdrawal. Once released, the user sees the balance as withdrawable.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Upgrade approvals</div>
              <div>
                Approving an upgrade activates the new plan and archives the previous one. Historical earnings stay
                visible and follow release rules.
              </div>
            </div>
          </div>
        </div>

        <div
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Support workflow details</h3>
          <div className="space-y-4 text-sm text-white/70">
            <div>
              <div className="text-white font-semibold mb-1">Statuses</div>
              <div>
                Open: waiting on you to respond. Waiting on user: reply was sent and awaiting a response. Closed: issue
                resolved or no further action required.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Attachments</div>
              <div>
                Users can send images or PDFs. Use attachments to verify transaction proofs or clarify issues.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Response quality</div>
              <div>
                Provide step-by-step responses and keep language short and clear. Always state the next action for the
                user.
              </div>
            </div>
            <div>
              <div className="text-white font-semibold mb-1">Activity logging</div>
              <div>
                Support replies and status changes are logged for transparency and audit trails.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
