const RESEND_API_URL = 'https://api.resend.com/emails'

type SendEmailInput = {
  to: string
  subject: string
  html: string
  text: string
}

type WelcomeEmailInput = {
  to: string
  fullName?: string | null
}

type MiningPlanEmailInput = {
  to: string
  fullName?: string | null
  planName: string
  durationDays: number
  amountUsd: number
}

type TradingPlanEmailInput = {
  to: string
  fullName?: string | null
  planName: string
  durationHours: number
  amountUsd: number
}

type PlanPaymentSubmittedEmailInput = {
  to: string
  fullName?: string | null
  planType: 'Mining' | 'Trading'
  planName: string
  amountUsd: number
  referenceId: string
}

type PlanPaymentReviewedEmailInput = {
  to: string
  fullName?: string | null
  planType: 'Mining' | 'Trading'
  planName: string
  amountUsd: number
  referenceId: string
  decision: 'approve' | 'reject'
}

type AccountFundingSubmittedEmailInput = {
  to: string
  fullName?: string | null
  amountUsd: number
  coinType: string
  referenceId: string
}

type AccountFundingReviewEmailInput = {
  to: string
  fullName?: string | null
  amountUsd: number
  coinType: string
  referenceId: string
  decision: 'approve' | 'reject'
}

type AccountWithdrawalRequestedEmailInput = {
  to: string
  fullName?: string | null
  amountUsd: number
  coinType: string
  referenceId: string
  walletAddress?: string | null
  customMethodNote?: string | null
}

type AccountWithdrawalReviewEmailInput = {
  to: string
  fullName?: string | null
  amountUsd: number
  coinType: string
  referenceId: string
  decision: 'approve' | 'reject'
}

type RealEstateBuyInSubmittedEmailInput = {
  to: string
  fullName?: string | null
  propertyTitle: string
  tierName: string
  amountUsd: number
  referenceId: string
}

type RealEstateBuyInReviewEmailInput = {
  to: string
  fullName?: string | null
  propertyTitle: string
  tierName: string
  amountUsd: number
  referenceId: string
  decision: 'approve' | 'reject'
}

type RealEstateWithdrawalRequestedEmailInput = {
  to: string
  fullName?: string | null
  subject: string
  amountUsd: number
  coinType: string
  destination?: string | null
  referenceId: string
}

type RealEstateWithdrawalReviewEmailInput = {
  to: string
  fullName?: string | null
  subject: string
  amountUsd: number
  coinType: string
  referenceId: string
  decision: 'approve' | 'reject'
}

type SupportTicketCreatedEmailInput = {
  to: string
  fullName?: string | null
  ticketId: number
  subject: string
}

type SupportReplyEmailInput = {
  to: string
  fullName?: string | null
  ticketId: number
  subject: string
  messagePreview: string
}

type SupportInboxAlertEmailInput = {
  subject: string
  body: string
}

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)

const compactLine = (value: string, maxLength = 220) =>
  value.replace(/\s+/g, ' ').trim().slice(0, maxLength)

const displayName = (fullName?: string | null) => fullName?.trim() || 'there'

const resolveAppBaseUrl = () =>
  (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://www.trinityin1investments.com'
  )
    .trim()
    .replace(/\/+$/, '')

const renderDetailsHtml = (details: Array<{ label: string; value: string }>) =>
  details
    .map(
      detail =>
        `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.08);color:#9ca3af;font-size:13px;font-weight:600;vertical-align:top;width:34%">
              ${escapeHtml(detail.label)}
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.08);color:#f3f4f6;font-size:13px;font-weight:500;vertical-align:top">
              ${escapeHtml(detail.value)}
            </td>
          </tr>
        `
    )
    .join('')

const renderEmailLogo = (appUrl: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px">
    <tr>
      <td
        align="center"
        style="padding:18px;border-radius:14px;background:linear-gradient(135deg,rgba(122,71,255,0.3),rgba(45,212,191,0.2) 52%,rgba(245,158,11,0.2));border:1px solid rgba(255,255,255,0.16)"
      >
        <img
          src="${escapeHtml(appUrl)}/email/logo.png"
          alt="Trinity Investments"
          width="220"
          style="display:block;width:100%;max-width:220px;height:auto;filter:drop-shadow(0 8px 14px rgba(0,0,0,0.35))"
        />
      </td>
    </tr>
  </table>
`

const renderMessage = ({
  heading,
  greeting,
  intro,
  details,
  footer,
}: {
  heading: string
  greeting: string
  intro: string
  details?: Array<{ label: string; value: string }>
  footer: string
}) => {
  const appUrl = resolveAppBaseUrl()
  const detailTable = details?.length
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid rgba(255,255,255,0.08);border-radius:12px;background:#0d0f14;margin:0 0 18px;overflow:hidden">
        ${renderDetailsHtml(details)}
      </table>
    `
    : ''
  return `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#04060d;font-family:'Segoe UI',Arial,sans-serif;color:#e5e7eb">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#04060d;padding:24px 12px">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px">
                <tr>
                  <td style="padding:0 0 12px 2px">
                    <span style="display:inline-block;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#c4b5fd;font-weight:700;border:1px solid rgba(91,44,255,0.45);background:rgba(91,44,255,0.12);padding:6px 10px;border-radius:999px">
                      Trinity Investments
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="border:1px solid rgba(255,255,255,0.1);border-radius:18px;background:linear-gradient(150deg,#0a0b12 0%,#0e1222 100%);padding:28px 24px;box-shadow:0 24px 48px rgba(0,0,0,0.45)">
                    ${renderEmailLogo(appUrl)}
                    <h1 style="margin:0 0 14px;font-size:27px;line-height:1.25;color:#ffffff;font-weight:800">${escapeHtml(heading)}</h1>
                    <p style="margin:0 0 10px;color:#d1d5db;font-size:15px;line-height:1.6">Hi ${escapeHtml(greeting)},</p>
                    <p style="margin:0 0 18px;color:#d1d5db;font-size:15px;line-height:1.6">${escapeHtml(intro)}</p>
                    ${detailTable}
                    <p style="margin:0 0 24px;color:#d1d5db;font-size:14px;line-height:1.6">${escapeHtml(footer)}</p>
                    <a href="${escapeHtml(appUrl)}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7a47ff,#4f2ddb);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:10px">
                      Open Dashboard
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 8px 0;color:#7f8798;font-size:12px;line-height:1.5">
                    This is an automated update from Trinity Investments. For support, reply to this email or contact our support desk.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

const supportInboxRecipient = () => normalizeEmail((process.env.SUPPORT_INBOX_EMAIL || '').trim())

const isEmailEnabled = () => {
  const raw = (process.env.TRANSACTIONAL_EMAILS_ENABLED || '').trim().toLowerCase()
  if (!raw) return true
  return !['false', '0', 'off', 'no'].includes(raw)
}

async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  if (!isEmailEnabled()) return false

  const apiKey = (process.env.RESEND_API_KEY || '').trim()
  const from = (process.env.TRANSACTIONAL_EMAIL_FROM || '').trim()
  const replyTo = (process.env.TRANSACTIONAL_EMAIL_REPLY_TO || '').trim()
  const destination = normalizeEmail(to)

  if (!apiKey || !from || !destination) {
    console.warn('Transactional email skipped: missing configuration.')
    return false
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [destination],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error('Transactional email failed:', response.status, body)
      return false
    }

    return true
  } catch (error) {
    console.error('Transactional email request error:', error)
    return false
  }
}

export async function sendWelcomeEmail({ to, fullName }: WelcomeEmailInput) {
  const name = displayName(fullName)
  return sendEmail({
    to,
    subject: 'Welcome to Trinity Investments',
    text: `Hi ${name}, welcome to Trinity Investments. Your account is ready and you can now explore the dashboard, fund your account, and activate plans.`,
    html: renderMessage({
      heading: 'Welcome to Trinity Investments',
      greeting: name,
      intro: 'Your account has been created successfully. You can now sign in, fund your account, and activate plans.',
      footer: 'Thank you for choosing Trinity Investments.',
    }),
  })
}

export async function sendMiningPlanActivatedEmail({
  to,
  fullName,
  planName,
  durationDays,
  amountUsd,
}: MiningPlanEmailInput) {
  const name = displayName(fullName)
  const formattedAmount = formatUsd(amountUsd)

  return sendEmail({
    to,
    subject: 'Mining Plan Activated',
    text: `Hi ${name}, your mining plan "${planName}" is now active. Investment: ${formattedAmount}. Duration: ${durationDays} days.`,
    html: renderMessage({
      heading: 'Mining Plan Activated',
      greeting: name,
      intro: `Your mining plan "${planName}" has been activated.`,
      details: [
        { label: 'Plan', value: planName },
        { label: 'Investment', value: formattedAmount },
        { label: 'Duration', value: `${durationDays} days` },
      ],
      footer: 'Log in to your dashboard to monitor plan performance and earnings.',
    }),
  })
}

export async function sendTradingPlanActivatedEmail({
  to,
  fullName,
  planName,
  durationHours,
  amountUsd,
}: TradingPlanEmailInput) {
  const name = displayName(fullName)
  const formattedAmount = formatUsd(amountUsd)

  return sendEmail({
    to,
    subject: 'Trading Plan Activated',
    text: `Hi ${name}, your trading plan "${planName}" is now active. Investment: ${formattedAmount}. Duration: ${durationHours} hours.`,
    html: renderMessage({
      heading: 'Trading Plan Activated',
      greeting: name,
      intro: `Your trading plan "${planName}" has been activated.`,
      details: [
        { label: 'Plan', value: planName },
        { label: 'Investment', value: formattedAmount },
        { label: 'Duration', value: `${durationHours} hours` },
      ],
      footer: 'Log in to your dashboard to monitor plan analytics and progress.',
    }),
  })
}

export async function sendAccountFundingSubmittedEmail({
  to,
  fullName,
  amountUsd,
  coinType,
  referenceId,
}: AccountFundingSubmittedEmailInput) {
  const name = displayName(fullName)
  return sendEmail({
    to,
    subject: 'Funding Request Received',
    text: `Hi ${name}, we received your funding request for ${formatUsd(amountUsd)} (${coinType}). Reference: ${referenceId}.`,
    html: renderMessage({
      heading: 'Funding Request Received',
      greeting: name,
      intro: 'Your deposit request has been submitted and is waiting for review.',
      details: [
        { label: 'Amount', value: formatUsd(amountUsd) },
        { label: 'Coin', value: coinType.toUpperCase() },
        { label: 'Reference', value: referenceId },
      ],
      footer: 'We will notify you as soon as the request is approved or rejected.',
    }),
  })
}

export async function sendAccountFundingReviewedEmail({
  to,
  fullName,
  amountUsd,
  coinType,
  referenceId,
  decision,
}: AccountFundingReviewEmailInput) {
  const name = displayName(fullName)
  const approved = decision === 'approve'
  return sendEmail({
    to,
    subject: approved ? 'Funding Request Approved' : 'Funding Request Rejected',
    text: `Hi ${name}, your funding request ${referenceId} for ${formatUsd(amountUsd)} (${coinType}) was ${approved ? 'approved' : 'rejected'}.`,
    html: renderMessage({
      heading: approved ? 'Funding Approved' : 'Funding Rejected',
      greeting: name,
      intro: approved
        ? 'Your funding request has been approved and credited to your account balance.'
        : 'Your funding request was rejected after review.',
      details: [
        { label: 'Amount', value: formatUsd(amountUsd) },
        { label: 'Coin', value: coinType.toUpperCase() },
        { label: 'Reference', value: referenceId },
      ],
      footer: approved
        ? 'You can now use the credited balance for plan purchases.'
        : 'Please review the request details and submit a corrected funding request if needed.',
    }),
  })
}

export async function sendAccountWithdrawalRequestedEmail({
  to,
  fullName,
  amountUsd,
  coinType,
  referenceId,
  walletAddress,
  customMethodNote,
}: AccountWithdrawalRequestedEmailInput) {
  const name = displayName(fullName)
  const destination = customMethodNote || walletAddress || 'Account payout destination'
  return sendEmail({
    to,
    subject: 'Withdrawal Request Received',
    text: `Hi ${name}, we received your withdrawal request for ${formatUsd(amountUsd)} (${coinType}). Reference: ${referenceId}.`,
    html: renderMessage({
      heading: 'Withdrawal Request Received',
      greeting: name,
      intro: 'Your withdrawal request has been submitted and is now waiting for review.',
      details: [
        { label: 'Amount', value: formatUsd(amountUsd) },
        { label: 'Coin', value: coinType.toUpperCase() },
        { label: 'Destination', value: compactLine(destination, 140) },
        { label: 'Reference', value: referenceId },
      ],
      footer: 'We will notify you when the request is approved or rejected.',
    }),
  })
}

export async function sendAccountWithdrawalReviewedEmail({
  to,
  fullName,
  amountUsd,
  coinType,
  referenceId,
  decision,
}: AccountWithdrawalReviewEmailInput) {
  const name = displayName(fullName)
  const approved = decision === 'approve'
  return sendEmail({
    to,
    subject: approved ? 'Withdrawal Request Approved' : 'Withdrawal Request Rejected',
    text: `Hi ${name}, your withdrawal request ${referenceId} for ${formatUsd(amountUsd)} (${coinType}) was ${approved ? 'approved' : 'rejected'}.`,
    html: renderMessage({
      heading: approved ? 'Withdrawal Approved' : 'Withdrawal Rejected',
      greeting: name,
      intro: approved
        ? 'Your withdrawal request has been approved and is being processed.'
        : 'Your withdrawal request was rejected after review.',
      details: [
        { label: 'Amount', value: formatUsd(amountUsd) },
        { label: 'Coin', value: coinType.toUpperCase() },
        { label: 'Reference', value: referenceId },
      ],
      footer: approved
        ? 'Track the updated status in your account history.'
        : 'Please review your withdrawal details and submit again if needed.',
    }),
  })
}

export async function sendRealEstateBuyInSubmittedEmail({
  to,
  fullName,
  propertyTitle,
  tierName,
  amountUsd,
  referenceId,
}: RealEstateBuyInSubmittedEmailInput) {
  const name = displayName(fullName)
  return sendEmail({
    to,
    subject: 'Real-Estate Buy-In Submitted',
    text: `Hi ${name}, your real-estate buy-in request for "${propertyTitle}" (${tierName}) has been submitted for ${formatUsd(amountUsd)}.`,
    html: renderMessage({
      heading: 'Real-Estate Buy-In Submitted',
      greeting: name,
      intro: 'Your real-estate buy-in request has been submitted for review.',
      details: [
        { label: 'Property', value: propertyTitle },
        { label: 'Tier', value: tierName },
        { label: 'Amount', value: formatUsd(amountUsd) },
        { label: 'Reference', value: referenceId },
      ],
      footer: 'You will receive another email once this request is reviewed.',
    }),
  })
}

export async function sendRealEstateBuyInReviewedEmail({
  to,
  fullName,
  propertyTitle,
  tierName,
  amountUsd,
  referenceId,
  decision,
}: RealEstateBuyInReviewEmailInput) {
  const name = displayName(fullName)
  const approved = decision === 'approve'
  return sendEmail({
    to,
    subject: approved ? 'Real-Estate Buy-In Approved' : 'Real-Estate Buy-In Rejected',
    text: `Hi ${name}, your real-estate buy-in request ${referenceId} for "${propertyTitle}" (${tierName}) was ${approved ? 'approved' : 'rejected'}.`,
    html: renderMessage({
      heading: approved ? 'Real-Estate Buy-In Approved' : 'Real-Estate Buy-In Rejected',
      greeting: name,
      intro: approved
        ? 'Your real-estate buy-in request has been approved.'
        : 'Your real-estate buy-in request has been rejected.',
      details: [
        { label: 'Property', value: propertyTitle },
        { label: 'Tier', value: tierName },
        { label: 'Amount', value: formatUsd(amountUsd) },
        { label: 'Reference', value: referenceId },
      ],
      footer: approved
        ? 'Check the real-estate dashboard for updated allocation details.'
        : 'You can submit a new buy-in request once details are corrected.',
    }),
  })
}

export async function sendRealEstateWithdrawalRequestedEmail({
  to,
  fullName,
  subject,
  amountUsd,
  coinType,
  destination,
  referenceId,
}: RealEstateWithdrawalRequestedEmailInput) {
  const name = displayName(fullName)
  return sendEmail({
    to,
    subject: 'Real-Estate Withdrawal Request Received',
    text: `Hi ${name}, we received your real-estate withdrawal request "${subject}" for ${formatUsd(amountUsd)} (${coinType}).`,
    html: renderMessage({
      heading: 'Real-Estate Withdrawal Request Received',
      greeting: name,
      intro: 'Your request is waiting for review.',
      details: [
        { label: 'Request', value: subject },
        { label: 'Amount', value: formatUsd(amountUsd) },
        { label: 'Coin', value: coinType.toUpperCase() },
        { label: 'Destination', value: destination || 'Account balance' },
        { label: 'Reference', value: referenceId },
      ],
      footer: 'We will notify you as soon as the review is completed.',
    }),
  })
}

export async function sendRealEstateWithdrawalReviewedEmail({
  to,
  fullName,
  subject,
  amountUsd,
  coinType,
  referenceId,
  decision,
}: RealEstateWithdrawalReviewEmailInput) {
  const name = displayName(fullName)
  const approved = decision === 'approve'
  return sendEmail({
    to,
    subject: approved ? 'Real-Estate Withdrawal Approved' : 'Real-Estate Withdrawal Rejected',
    text: `Hi ${name}, your real-estate withdrawal request ${referenceId} (${subject}) was ${approved ? 'approved' : 'rejected'}.`,
    html: renderMessage({
      heading: approved ? 'Real-Estate Withdrawal Approved' : 'Real-Estate Withdrawal Rejected',
      greeting: name,
      intro: approved
        ? 'Your withdrawal has been approved and posted to your account balance.'
        : 'Your withdrawal request has been rejected.',
      details: [
        { label: 'Request', value: subject },
        { label: 'Amount', value: formatUsd(amountUsd) },
        { label: 'Coin', value: coinType.toUpperCase() },
        { label: 'Reference', value: referenceId },
      ],
      footer: approved
        ? 'Review the account balance page for settlement details.'
        : 'Please contact support if you need clarification before resubmitting.',
    }),
  })
}

export async function sendSupportTicketCreatedEmail({
  to,
  fullName,
  ticketId,
  subject,
}: SupportTicketCreatedEmailInput) {
  const name = displayName(fullName)
  return sendEmail({
    to,
    subject: 'Support Request Received',
    text: `Hi ${name}, your support request #${ticketId} (${subject}) was received.`,
    html: renderMessage({
      heading: 'Support Request Received',
      greeting: name,
      intro: 'We have received your message and our team will review it shortly.',
      details: [
        { label: 'Ticket', value: `#${ticketId}` },
        { label: 'Subject', value: subject },
      ],
      footer: 'You will get another notification when support replies.',
    }),
  })
}

export async function sendSupportReplyEmail({
  to,
  fullName,
  ticketId,
  subject,
  messagePreview,
}: SupportReplyEmailInput) {
  const name = displayName(fullName)
  return sendEmail({
    to,
    subject: `New Support Reply (#${ticketId})`,
    text: `Hi ${name}, support replied on ticket #${ticketId} (${subject}): ${messagePreview}`,
    html: renderMessage({
      heading: 'New Support Reply',
      greeting: name,
      intro: 'You have received a new reply from support.',
      details: [
        { label: 'Ticket', value: `#${ticketId}` },
        { label: 'Subject', value: subject },
        { label: 'Reply', value: compactLine(messagePreview, 180) },
      ],
      footer: 'Open your dashboard support page to continue the conversation.',
    }),
  })
}

export async function sendSupportInboxAlertEmail({ subject, body }: SupportInboxAlertEmailInput) {
  const inbox = supportInboxRecipient()
  if (!inbox) return false
  const appUrl = resolveAppBaseUrl()
  return sendEmail({
    to: inbox,
    subject,
    text: body,
    html: `
      <!doctype html>
      <html>
        <body style="margin:0;padding:0;background:#070912;font-family:'Segoe UI',Arial,sans-serif;color:#e5e7eb">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;border:1px solid rgba(255,255,255,0.12);border-radius:14px;background:#0d111b">
                  <tr>
                    <td style="padding:20px 22px;border-bottom:1px solid rgba(255,255,255,0.08)">
                      ${renderEmailLogo(appUrl)}
                      <h2 style="margin:0;color:#f8fafc;font-size:22px;line-height:1.3">${escapeHtml(subject)}</h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 22px">
                      <pre style="margin:0;white-space:pre-wrap;word-break:break-word;color:#d1d5db;font-family:Consolas,'Courier New',monospace;font-size:13px;line-height:1.5">${escapeHtml(body)}</pre>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 22px 18px">
                      <a href="${escapeHtml(appUrl)}/admin" style="display:inline-block;background:#5b2cff;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 14px;border-radius:8px">
                        Open Admin Dashboard
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  })
}

export async function sendPlanPaymentSubmittedEmail({
  to,
  fullName,
  planType,
  planName,
  amountUsd,
  referenceId,
}: PlanPaymentSubmittedEmailInput) {
  const name = displayName(fullName)
  return sendEmail({
    to,
    subject: `${planType} Plan Payment Submitted`,
    text: `Hi ${name}, your ${planType.toLowerCase()} plan payment for "${planName}" (${formatUsd(amountUsd)}) is pending review.`,
    html: renderMessage({
      heading: `${planType} Plan Payment Submitted`,
      greeting: name,
      intro: `Your ${planType.toLowerCase()} plan payment was submitted and is awaiting review.`,
      details: [
        { label: 'Plan', value: planName },
        { label: 'Amount', value: formatUsd(amountUsd) },
        { label: 'Reference', value: referenceId },
      ],
      footer: 'You will receive an update when the review is completed.',
    }),
  })
}

export async function sendPlanPaymentReviewedEmail({
  to,
  fullName,
  planType,
  planName,
  amountUsd,
  referenceId,
  decision,
}: PlanPaymentReviewedEmailInput) {
  const name = displayName(fullName)
  const approved = decision === 'approve'
  return sendEmail({
    to,
    subject: `${planType} Plan Payment ${approved ? 'Approved' : 'Rejected'}`,
    text: `Hi ${name}, your ${planType.toLowerCase()} plan payment ${referenceId} for "${planName}" was ${approved ? 'approved' : 'rejected'}.`,
    html: renderMessage({
      heading: `${planType} Plan Payment ${approved ? 'Approved' : 'Rejected'}`,
      greeting: name,
      intro: approved
        ? `Your ${planType.toLowerCase()} plan payment has been approved.`
        : `Your ${planType.toLowerCase()} plan payment has been rejected.`,
      details: [
        { label: 'Plan', value: planName },
        { label: 'Amount', value: formatUsd(amountUsd) },
        { label: 'Reference', value: referenceId },
      ],
      footer: approved
        ? 'Your plan is now active on the dashboard.'
        : 'Please submit another payment request if you still want to activate this plan.',
    }),
  })
}
