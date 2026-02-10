import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import RealEstatePaymentInstructions from '@/components/real-estate/RealEstatePaymentInstructions'
import { getRealEstateDashboardData } from '@/lib/real-estate-dashboard'

export const dynamic = 'force-dynamic'

type SearchParams = {
  propertyId?: string | string[]
  title?: string | string[]
  location?: string | string[]
  tier?: string | string[]
  minimum?: string | string[]
  duration?: string | string[]
  payoutModel?: string | string[]
  projectedBand?: string | string[]
  illustrativeOutcome?: string | string[]
}

const pick = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value) || ''

export default async function RealEstatePaymentPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const resolvedParams = searchParams ? await searchParams : undefined

  const selection = {
    propertyId: pick(resolvedParams?.propertyId),
    title: pick(resolvedParams?.title),
    location: pick(resolvedParams?.location),
    tier: pick(resolvedParams?.tier),
    minimum: pick(resolvedParams?.minimum),
    duration: pick(resolvedParams?.duration),
    payoutModel: pick(resolvedParams?.payoutModel),
    projectedBand: pick(resolvedParams?.projectedBand),
    illustrativeOutcome: pick(resolvedParams?.illustrativeOutcome),
  }

  if (!selection.propertyId || !selection.title || !selection.tier || !selection.minimum) {
    redirect('/dashboard/real-estate')
  }

  const realEstateData = await getRealEstateDashboardData(userId)
  if (!realEstateData.canCreateNewBuyIn) {
    redirect('/dashboard/real-estate?buyin=pending')
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6">
      <RealEstatePaymentInstructions selection={selection} />
    </div>
  )
}
