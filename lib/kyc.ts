export const KYC_STATUSES = ['not_submitted', 'pending', 'approved', 'rejected'] as const
export type KycStatus = (typeof KYC_STATUSES)[number]

export const KYC_ID_TYPES = ['passport', 'drivers_license', 'national_id', 'state_id'] as const
export type KycIdType = (typeof KYC_ID_TYPES)[number]

export const KYC_ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

export const KYC_MAX_FILE_SIZE = 6 * 1024 * 1024

export function formatKycStatus(status: string) {
  if (status === 'approved') return 'Approved'
  if (status === 'pending') return 'Pending Review'
  if (status === 'rejected') return 'Rejected'
  return 'Not Submitted'
}

export function formatKycIdType(type: string) {
  if (type === 'passport') return 'Passport'
  if (type === 'drivers_license') return 'Driver License'
  if (type === 'national_id') return 'National ID'
  if (type === 'state_id') return 'State ID'
  return type
}
