import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
])

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } })
  if (!user || user.role !== 'admin') return null
  return user
}

export async function POST(req: Request) {
  try {
    const adminUser = await requireAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file')
    const rawSlug = String(formData.get('slug') || '').trim()
    const slug = slugify(rawSlug) || 'property'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported image format.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Image must be under 10MB.' }, { status: 400 })
    }

    const extension = file.type.split('/')[1] || 'jpg'
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${slug}_${randomUUID()}.${extension}`
    const blob = await put(`real-estate-properties/${filename}`, buffer, {
      access: 'public',
      contentType: file.type,
    })

    return NextResponse.json({ imagePath: blob.url }, { status: 201 })
  } catch (error) {
    console.error('Admin real estate image upload error:', error)
    return NextResponse.json(
      { error: 'Image upload failed. Confirm Blob storage is configured.' },
      { status: 500 },
    )
  }
}
