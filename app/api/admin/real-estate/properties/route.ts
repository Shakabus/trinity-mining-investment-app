import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

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
  keyCount?: number | null
  occupancyRate?: number | null
  status?: string
  sortOrder?: number
  isFeatured?: boolean
  tiers?: PropertyTierInput[]
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function sanitizeText(value?: string) {
  if (!value) return null
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
      keyCount: body.keyCount == null || body.keyCount === '' ? null : Number(body.keyCount),
      occupancyRate:
        body.occupancyRate == null || body.occupancyRate === '' ? null : Number(body.occupancyRate),
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

export async function GET() {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const properties = await prisma.realEstateProperty.findMany({
      include: {
        tiers: {
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ properties })
  } catch (error) {
    console.error('GET real-estate properties error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json()) as PropertyInput
    const parsed = parseInput(body)
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const property = await prisma.realEstateProperty.create({
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

    return NextResponse.json({ property }, { status: 201 })
  } catch (error) {
    console.error('POST real-estate properties error:', error)
    if (error instanceof Error && error.message.startsWith('Tier #')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
