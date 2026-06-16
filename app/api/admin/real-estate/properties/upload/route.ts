import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/db'
import {
  isInputValidationError,
  readFormDataStrict,
  readFormFile,
  readFormString,
} from '@/lib/requestValidation'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
])
const PROPERTY_UPLOAD_FIELDS = ['file', 'slug'] as const

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

    const formData = await readFormDataStrict(req, { allowedKeys: PROPERTY_UPLOAD_FIELDS })
    const file = readFormFile(formData, 'file', {
      required: true,
      maxBytes: MAX_FILE_SIZE,
      allowedTypes: [...ALLOWED_TYPES],
    })!
    const rawSlug = readFormString(formData, 'slug', { maxLength: 120 }) || ''
    const slug = slugify(rawSlug) || 'property'

    const extension = file.type.split('/')[1] || 'jpg'
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${slug}_${randomUUID()}.${extension}`
    const blob = await put(`real-estate-properties/${filename}`, buffer, {
      access: 'public',
      contentType: file.type,
    })

    return NextResponse.json({ imagePath: blob.url }, { status: 201 })
  } catch (error) {
    if (isInputValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Admin real estate image upload error:', error)
    return NextResponse.json(
      { error: 'Image upload failed. Confirm Blob storage is configured.' },
      { status: 500 },
    )
  }
}
