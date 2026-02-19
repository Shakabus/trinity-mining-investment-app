import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import {
  isInputValidationError,
  readJsonObject,
} from '@/lib/requestValidation'

type PropertyTierInput = {
  tierName: string
  minimumUsd: number
  durationMonths: number
  payoutModel: string
  projectedReturnMin: number
  projectedReturnMax: number
  projectedOutcomeText?: string
  displayOrder?: number
  isActive?: boolean
}

type PropertyInput = {
  title: string
  slug?: string
  market?: string
  city?: string
  country?: string
  assetType?: string
  operatorName?: string
  address?: string
  summary: string
  overview?: string
  imagePath?: string
  keyCount?: number | string | null
  occupancyRate?: number | string | null
  status?: string
  sortOrder?: number
  isFeatured?: boolean
  tiers?: PropertyTierInput[]
}

const PROPERTY_ALLOWED_FIELDS = [
  'title',
  'slug',
  'market',
  'city',
  'country',
  'assetType',
  'operatorName',
  'address',
  'summary',
  'overview',
  'imagePath',
  'keyCount',
  'occupancyRate',
  'status',
  'sortOrder',
  'isFeatured',
  'tiers',
] as const

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function sanitizeText(value?: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseInput(body: PropertyInput) {
  if (!body?.title?.trim()) {
    return { error: 'Title is required.' }
  }
  if (!body?.summary?.trim()) {
    return { error: 'Summary is required.' }
  }

  const slugBase = sanitizeText(body.slug) ?? body.title
  const slug = slugify(slugBase)
  if (!slug) {
    return { error: 'A valid slug could not be generated.' }
  }

  const tiers = Array.isArray(body.tiers) ? body.tiers : []
  const normalizedTiers = tiers.map((tier, index) => {
    const tierName = tier.tierName?.trim()
    const payoutModel = tier.payoutModel?.trim()
    const minimumUsd = Number(tier.minimumUsd)
    const durationMonths = Number(tier.durationMonths)
    const projectedReturnMin = Number(tier.projectedReturnMin)
    const projectedReturnMax = Number(tier.projectedReturnMax)

    if (!tierName) {
      throw new Error(`Tier #${index + 1}: tier name is required.`)
    }
    if (!payoutModel) {
      throw new Error(`Tier #${index + 1}: payout model is required.`)
    }
    if (!Number.isFinite(minimumUsd) || minimumUsd <= 0) {
      throw new Error(`Tier #${index + 1}: minimum buy-in must be greater than 0.`)
    }
    if (!Number.isFinite(durationMonths) || durationMonths <= 0) {
      throw new Error(`Tier #${index + 1}: duration must be greater than 0.`)
    }
    if (!Number.isFinite(projectedReturnMin) || projectedReturnMin < 0) {
      throw new Error(`Tier #${index + 1}: projected return minimum is invalid.`)
    }
    if (!Number.isFinite(projectedReturnMax) || projectedReturnMax < projectedReturnMin) {
      throw new Error(`Tier #${index + 1}: projected return maximum is invalid.`)
    }

    return {
      tierName,
      minimumUsd,
      durationMonths,
      payoutModel,
      projectedReturnMin,
      projectedReturnMax,
      projectedOutcomeText: sanitizeText(tier.projectedOutcomeText) ?? undefined,
      displayOrder: Number.isFinite(Number(tier.displayOrder)) ? Number(tier.displayOrder) : index,
      isActive: tier.isActive ?? true,
    }
  })

  const keyCount =
    body.keyCount == null || body.keyCount === '' ? null : Number(body.keyCount)
  if (keyCount != null && (!Number.isFinite(keyCount) || keyCount < 0)) {
    return { error: 'Key count is invalid.' }
  }

  const occupancyRate =
    body.occupancyRate == null || body.occupancyRate === '' ? null : Number(body.occupancyRate)
  if (occupancyRate != null && (!Number.isFinite(occupancyRate) || occupancyRate < 0 || occupancyRate > 100)) {
    return { error: 'Occupancy rate must be between 0 and 100.' }
  }

  return {
    slug,
    data: {
      title: body.title.trim(),
      slug,
      market: sanitizeText(body.market),
      city: sanitizeText(body.city),
      country: sanitizeText(body.country),
      assetType: sanitizeText(body.assetType) ?? 'hotel',
      operatorName: sanitizeText(body.operatorName),
      address: sanitizeText(body.address),
      summary: body.summary.trim(),
      overview: sanitizeText(body.overview),
      imagePath: sanitizeText(body.imagePath),
      keyCount,
      occupancyRate,
      status: sanitizeText(body.status) ?? 'active',
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
      isFeatured: Boolean(body.isFeatured),
      tiers: normalizedTiers,
    },
  }
}

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } })
  if (!user || user.role !== 'admin') return null
  return user
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const propertyId = Number(id)
    if (Number.isNaN(propertyId)) {
      return NextResponse.json({ error: 'Invalid property id.' }, { status: 400 })
    }

    const body = (await readJsonObject(req, { allowedKeys: PROPERTY_ALLOWED_FIELDS })) as PropertyInput
    const parsed = parseInput(body)
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const property = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.realEstateProperty.findUnique({ where: { id: propertyId } })
      if (!existing) {
        throw new Error('Property not found')
      }

      await tx.realEstatePropertyTier.deleteMany({ where: { propertyId } })

      return tx.realEstateProperty.update({
        where: { id: propertyId },
        data: {
          title: parsed.data.title,
          slug: parsed.data.slug,
          market: parsed.data.market,
          city: parsed.data.city,
          country: parsed.data.country,
          assetType: parsed.data.assetType,
          operatorName: parsed.data.operatorName,
          address: parsed.data.address,
          summary: parsed.data.summary,
          overview: parsed.data.overview,
          imagePath: parsed.data.imagePath,
          keyCount: parsed.data.keyCount,
          occupancyRate: parsed.data.occupancyRate,
          status: parsed.data.status,
          sortOrder: parsed.data.sortOrder,
          isFeatured: parsed.data.isFeatured,
          tiers: {
            create: parsed.data.tiers.map(tier => ({
              tierName: tier.tierName,
              minimumUsd: tier.minimumUsd,
              durationMonths: tier.durationMonths,
              payoutModel: tier.payoutModel,
              projectedReturnMin: tier.projectedReturnMin,
              projectedReturnMax: tier.projectedReturnMax,
              projectedOutcomeText: tier.projectedOutcomeText,
              displayOrder: tier.displayOrder,
              isActive: tier.isActive,
            })),
          },
        },
        include: {
          tiers: {
            orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
          },
        },
      })
    })

    revalidatePath('/real-estate-portfolio')
    revalidatePath('/dashboard/real-estate')

    return NextResponse.json({ property })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('PATCH real-estate property error:', error)
    if (error instanceof Error) {
      if (error.message === 'Property not found') {
        return NextResponse.json({ error: 'Property not found.' }, { status: 404 })
      }
      if (error.message.startsWith('Tier #')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const propertyId = Number(id)
    if (Number.isNaN(propertyId)) {
      return NextResponse.json({ error: 'Invalid property id.' }, { status: 400 })
    }

    await prisma.realEstateProperty.delete({ where: { id: propertyId } })

    revalidatePath('/real-estate-portfolio')
    revalidatePath('/dashboard/real-estate')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE real-estate property error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
