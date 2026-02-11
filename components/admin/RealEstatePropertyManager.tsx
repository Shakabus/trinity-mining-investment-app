'use client'

import { type ChangeEvent, useMemo, useState } from 'react'
import { Building2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'
import LoadingButton from '@/components/ui/LoadingButton'

export type AdminRealEstateTier = {
  id: number
  tierName: string
  minimumUsd: number
  durationMonths: number
  payoutModel: string
  projectedReturnMin: number
  projectedReturnMax: number
  projectedOutcomeText: string | null
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type AdminRealEstateProperty = {
  id: number
  title: string
  slug: string
  market: string | null
  city: string | null
  country: string | null
  assetType: string
  operatorName: string | null
  address: string | null
  summary: string
  overview: string | null
  imagePath: string | null
  keyCount: number | null
  occupancyRate: number | null
  status: string
  sortOrder: number
  isFeatured: boolean
  createdAt: string
  updatedAt: string
  tiers: AdminRealEstateTier[]
}

type TierFormState = {
  tierName: string
  minimumUsd: string
  durationMonths: string
  payoutModel: string
  projectedReturnMin: string
  projectedReturnMax: string
  projectedOutcomeText: string
  displayOrder: string
  isActive: boolean
}

type PropertyFormState = {
  title: string
  slug: string
  market: string
  city: string
  country: string
  assetType: string
  operatorName: string
  address: string
  summary: string
  overview: string
  imagePath: string
  keyCount: string
  occupancyRate: string
  status: string
  sortOrder: string
  isFeatured: boolean
  tiers: TierFormState[]
}

interface RealEstatePropertyManagerProps {
  initialProperties: AdminRealEstateProperty[]
}

const makeDefaultTier = (displayOrder = 0): TierFormState => ({
  tierName: '',
  minimumUsd: '',
  durationMonths: '12',
  payoutModel: '',
  projectedReturnMin: '',
  projectedReturnMax: '',
  projectedOutcomeText: '',
  displayOrder: String(displayOrder),
  isActive: true,
})

const makeDefaultPropertyForm = (): PropertyFormState => ({
  title: '',
  slug: '',
  market: '',
  city: '',
  country: '',
  assetType: 'hotel',
  operatorName: '',
  address: '',
  summary: '',
  overview: '',
  imagePath: '',
  keyCount: '',
  occupancyRate: '',
  status: 'active',
  sortOrder: '0',
  isFeatured: false,
  tiers: [makeDefaultTier(0)],
})

const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
])

const propertyToForm = (property: AdminRealEstateProperty): PropertyFormState => ({
  title: property.title,
  slug: property.slug,
  market: property.market ?? '',
  city: property.city ?? '',
  country: property.country ?? '',
  assetType: property.assetType,
  operatorName: property.operatorName ?? '',
  address: property.address ?? '',
  summary: property.summary,
  overview: property.overview ?? '',
  imagePath: property.imagePath ?? '',
  keyCount: property.keyCount != null ? String(property.keyCount) : '',
  occupancyRate: property.occupancyRate != null ? String(property.occupancyRate) : '',
  status: property.status,
  sortOrder: String(property.sortOrder),
  isFeatured: property.isFeatured,
  tiers: property.tiers.map((tier, index) => ({
    tierName: tier.tierName,
    minimumUsd: String(tier.minimumUsd),
    durationMonths: String(tier.durationMonths),
    payoutModel: tier.payoutModel,
    projectedReturnMin: String(tier.projectedReturnMin),
    projectedReturnMax: String(tier.projectedReturnMax),
    projectedOutcomeText: tier.projectedOutcomeText ?? '',
    displayOrder: String(tier.displayOrder ?? index),
    isActive: tier.isActive,
  })),
})

export default function RealEstatePropertyManager({
  initialProperties,
}: RealEstatePropertyManagerProps) {
  const { showToast } = useToast()
  const [properties, setProperties] = useState(initialProperties)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<PropertyFormState>(makeDefaultPropertyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const totals = useMemo(() => {
    const active = properties.filter(item => item.status === 'active').length
    const featured = properties.filter(item => item.isFeatured).length
    const tiers = properties.reduce((count, item) => count + item.tiers.length, 0)
    return { active, featured, tiers }
  }, [properties])

  const openCreate = () => {
    setEditingId(null)
    setForm(makeDefaultPropertyForm())
    setIsModalOpen(true)
  }

  const openEdit = (property: AdminRealEstateProperty) => {
    setEditingId(property.id)
    setForm(propertyToForm(property))
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSaving) return
    setIsModalOpen(false)
    setEditingId(null)
    setForm(makeDefaultPropertyForm())
  }

  const updateTier = (index: number, key: keyof TierFormState, value: string | boolean) => {
    setForm(prev => ({
      ...prev,
      tiers: prev.tiers.map((tier, idx) => (idx === index ? { ...tier, [key]: value } : tier)),
    }))
  }

  const addTier = () => {
    setForm(prev => ({
      ...prev,
      tiers: [...prev.tiers, makeDefaultTier(prev.tiers.length)],
    }))
  }

  const removeTier = (index: number) => {
    setForm(prev => ({
      ...prev,
      tiers: prev.tiers.filter((_, idx) => idx !== index),
    }))
  }

  const handleImageUpload = async (file: File) => {
    if (file.type === 'image/heic' || file.type === 'image/heif') {
      showToast('HEIC/HEIF is not supported here yet. Please upload JPG, PNG, WebP, or AVIF.', 'error')
      return
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      showToast('Unsupported image format. Use JPG, PNG, WebP, or AVIF.', 'error')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      showToast('Image must be under 10MB.', 'error')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    if (form.slug.trim()) {
      formData.append('slug', form.slug.trim())
    } else if (form.title.trim()) {
      formData.append('slug', form.title.trim())
    }

    setIsUploadingImage(true)
    try {
      const response = await fetch('/api/admin/real-estate/properties/upload', {
        method: 'POST',
        body: formData,
      })
      const isJson = response.headers.get('content-type')?.includes('application/json')
      const data = isJson ? await response.json().catch(() => null) : null
      if (!response.ok) {
        showToast(data?.error || `Failed to upload image (HTTP ${response.status}).`, 'error')
        return
      }

      const uploadedImagePath = String(data?.imagePath || '')
      if (!uploadedImagePath) {
        showToast('Upload succeeded but image URL was missing.', 'error')
        return
      }

      setForm(prev => ({ ...prev, imagePath: uploadedImagePath }))
      showToast('Property image uploaded.', 'success')
    } catch (error) {
      console.error('Property image upload error:', error)
      showToast('Network error while uploading image.', 'error')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const onImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return
    void handleImageUpload(selectedFile)
    event.target.value = ''
  }

  const handleSave = async () => {
    const payload = {
      title: form.title,
      slug: form.slug,
      market: form.market,
      city: form.city,
      country: form.country,
      assetType: form.assetType,
      operatorName: form.operatorName,
      address: form.address,
      summary: form.summary,
      overview: form.overview,
      imagePath: form.imagePath,
      keyCount: form.keyCount === '' ? null : Number(form.keyCount),
      occupancyRate: form.occupancyRate === '' ? null : Number(form.occupancyRate),
      status: form.status,
      sortOrder: form.sortOrder === '' ? 0 : Number(form.sortOrder),
      isFeatured: form.isFeatured,
      tiers: form.tiers.map(tier => ({
        tierName: tier.tierName,
        minimumUsd: Number(tier.minimumUsd),
        durationMonths: Number(tier.durationMonths),
        payoutModel: tier.payoutModel,
        projectedReturnMin: Number(tier.projectedReturnMin),
        projectedReturnMax: Number(tier.projectedReturnMax),
        projectedOutcomeText: tier.projectedOutcomeText,
        displayOrder: Number(tier.displayOrder),
        isActive: tier.isActive,
      })),
    }

    setIsSaving(true)
    try {
      const isEdit = editingId != null
      const response = await fetch(
        isEdit ? `/api/admin/real-estate/properties/${editingId}` : '/api/admin/real-estate/properties',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        showToast(data?.error || 'Failed to save property.', 'error')
        return
      }

      const property = data.property as AdminRealEstateProperty
      setProperties(prev => {
        if (isEdit) {
          return prev.map(item => (item.id === property.id ? property : item))
        }
        return [property, ...prev]
      })

      showToast(isEdit ? 'Property updated.' : 'Property created.', 'success')
      closeModal()
    } catch (error) {
      console.error('Save property error:', error)
      showToast('Network error while saving property.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (propertyId: number) => {
    setDeletingId(propertyId)
    try {
      const response = await fetch(`/api/admin/real-estate/properties/${propertyId}`, {
        method: 'DELETE',
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        showToast(data?.error || 'Failed to delete property.', 'error')
        return
      }
      setProperties(prev => prev.filter(item => item.id !== propertyId))
      showToast('Property deleted.', 'success')
    } catch (error) {
      console.error('Delete property error:', error)
      showToast('Network error while deleting property.', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleImportDefaults = async () => {
    if (isImporting) return
    setIsImporting(true)
    try {
      const response = await fetch('/api/admin/real-estate/properties/import-defaults', {
        method: 'POST',
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        showToast(data?.error || 'Failed to import hardcoded properties.', 'error')
        return
      }

      setProperties((data?.properties as AdminRealEstateProperty[]) ?? [])
      showToast(
        `Imported ${data?.createdCount ?? 0} properties, skipped ${data?.skippedCount ?? 0}.`,
        'success'
      )
    } catch (error) {
      console.error('Import hardcoded properties error:', error)
      showToast('Network error while importing hardcoded properties.', 'error')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Real Estate Properties</h1>
          <p className="text-white/70">Create, edit, and remove portfolio properties and buy-in tiers.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LoadingButton
            isLoading={isImporting}
            loadingText="Importing..."
            onClick={handleImportDefaults}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.04))',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
            }}
          >
            Import Hardcoded
          </LoadingButton>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(88, 45, 255, 0.3), rgba(58, 19, 122, 0.25))',
              border: '1px solid rgba(88, 45, 255, 0.5)',
              color: '#ffffff',
            }}
          >
            <Plus size={16} />
            Add Property
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
          <div className="text-xs text-white/60">Total Properties</div>
          <div className="text-2xl font-semibold text-white mt-1">{properties.length}</div>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
          <div className="text-xs text-white/60">Active</div>
          <div className="text-2xl font-semibold text-white mt-1">{totals.active}</div>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
          <div className="text-xs text-white/60">Configured Buy-In Tiers</div>
          <div className="text-2xl font-semibold text-white mt-1">{totals.tiers}</div>
        </div>
      </div>

      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full">
            <thead>
              <tr className="border-b border-white/10 text-white/70 text-xs uppercase tracking-wide">
                <th className="text-left p-4">Property</th>
                <th className="text-left p-4">Market</th>
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Tiers</th>
                <th className="text-left p-4">Updated</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/60">
                    No properties yet. Add your first listing to start managing the catalog.
                  </td>
                </tr>
              ) : (
                properties.map(property => (
                  <tr key={property.id} className="border-b border-white/5">
                    <td className="p-4">
                      <div className="text-white font-medium">{property.title}</div>
                      <div className="text-xs text-white/50 mt-1">/{property.slug}</div>
                    </td>
                    <td className="p-4 text-white/80 text-sm">
                      {[property.city, property.country].filter(Boolean).join(', ') || property.market || '-'}
                    </td>
                    <td className="p-4 text-white/80 text-sm">{property.assetType}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full text-xs border border-white/20 text-white/80">
                        {property.status}
                      </span>
                      {property.isFeatured && (
                        <span className="ml-2 px-2 py-1 rounded-full text-xs border border-purple-300/40 text-purple-200">
                          featured
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-white/80 text-sm">{property.tiers.length}</td>
                    <td className="p-4 text-white/60 text-xs">
                      {new Date(property.updatedAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(property)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-white/20 text-white/80 hover:bg-white/10"
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(property.id)}
                          disabled={deletingId === property.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-red-300/40 text-red-200 hover:bg-red-500/10 disabled:opacity-60"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div
            className="max-w-5xl mx-auto rounded-3xl p-6 md:p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.04))',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/10 border border-white/20">
                  <Building2 size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-semibold text-white">
                    {editingId ? 'Edit Property' : 'Create Property'}
                  </h2>
                  <p className="text-xs text-white/60">Configure listing metrics and buy-in options.</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Property title" />
              <input value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Slug (optional)" />
              <input value={form.market} onChange={e => setForm(prev => ({ ...prev, market: e.target.value }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Market label" />
              <input value={form.assetType} onChange={e => setForm(prev => ({ ...prev, assetType: e.target.value }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Asset type (hotel, resort, villa...)" />
              <input value={form.city} onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="City" />
              <input value={form.country} onChange={e => setForm(prev => ({ ...prev, country: e.target.value }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Country" />
              <input value={form.operatorName} onChange={e => setForm(prev => ({ ...prev, operatorName: e.target.value }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Operator / brand" />
              <input value={form.keyCount} onChange={e => setForm(prev => ({ ...prev, keyCount: e.target.value }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Key count (optional)" />
              <input value={form.occupancyRate} onChange={e => setForm(prev => ({ ...prev, occupancyRate: e.target.value }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Occupancy % (optional)" />
              <input value={form.sortOrder} onChange={e => setForm(prev => ({ ...prev, sortOrder: e.target.value }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Sort order" />
              <input value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" placeholder="Status (active/draft/archived)" />
              <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm text-white/80 font-medium">Property image</label>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 text-xs text-white/80 cursor-pointer hover:bg-white/10">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
                      className="hidden"
                      onChange={onImageFileChange}
                      disabled={isUploadingImage}
                    />
                    {isUploadingImage ? 'Uploading...' : 'Upload from device'}
                  </label>
                </div>
                <p className="mt-2 text-xs text-white/60">
                  Choose an image from your phone or computer (JPG, PNG, WebP, AVIF). We upload it and fill the path automatically.
                </p>
                <input
                  value={form.imagePath}
                  onChange={e => setForm(prev => ({ ...prev, imagePath: e.target.value }))}
                  className="mt-3 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
                  placeholder="Image path / URL"
                />
                {form.imagePath && (
                  <a
                    href={form.imagePath}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs text-cyan-300 hover:text-cyan-200 break-all"
                  >
                    Preview: {form.imagePath}
                  </a>
                )}
              </div>
              <textarea value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white md:col-span-2 min-h-[70px]" placeholder="Address" />
              <textarea value={form.summary} onChange={e => setForm(prev => ({ ...prev, summary: e.target.value }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white md:col-span-2 min-h-[80px]" placeholder="Summary (required)" />
              <textarea value={form.overview} onChange={e => setForm(prev => ({ ...prev, overview: e.target.value }))} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white md:col-span-2 min-h-[100px]" placeholder="Full overview text" />
            </div>

            <label className="mt-4 inline-flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={e => setForm(prev => ({ ...prev, isFeatured: e.target.checked }))}
              />
              Mark as featured property
            </label>

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-white font-semibold">Buy-In Tier Configuration</h3>
                <button onClick={addTier} className="px-3 py-1.5 rounded-lg text-xs border border-white/20 text-white/80 hover:bg-white/10">
                  <Plus size={12} className="inline mr-1" />
                  Add Tier
                </button>
              </div>

              {form.tiers.map((tier, index) => (
                <div key={`tier-${index}`} className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-white/80">Tier #{index + 1}</div>
                    {form.tiers.length > 1 && (
                      <button onClick={() => removeTier(index)} className="text-xs text-red-200 border border-red-300/40 px-2 py-1 rounded-md">
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input value={tier.tierName} onChange={e => updateTier(index, 'tierName', e.target.value)} className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white" placeholder="Tier name" />
                    <input value={tier.minimumUsd} onChange={e => updateTier(index, 'minimumUsd', e.target.value)} className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white" placeholder="Minimum buy-in (USD)" />
                    <input value={tier.durationMonths} onChange={e => updateTier(index, 'durationMonths', e.target.value)} className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white" placeholder="Duration (months)" />
                    <input value={tier.payoutModel} onChange={e => updateTier(index, 'payoutModel', e.target.value)} className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white" placeholder="Payout model" />
                    <input value={tier.projectedReturnMin} onChange={e => updateTier(index, 'projectedReturnMin', e.target.value)} className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white" placeholder="Projected return min %" />
                    <input value={tier.projectedReturnMax} onChange={e => updateTier(index, 'projectedReturnMax', e.target.value)} className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white" placeholder="Projected return max %" />
                    <input value={tier.displayOrder} onChange={e => updateTier(index, 'displayOrder', e.target.value)} className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white" placeholder="Display order" />
                    <label className="inline-flex items-center gap-2 text-sm text-white/80">
                      <input type="checkbox" checked={tier.isActive} onChange={e => updateTier(index, 'isActive', e.target.checked)} />
                      Tier active
                    </label>
                    <textarea value={tier.projectedOutcomeText} onChange={e => updateTier(index, 'projectedOutcomeText', e.target.value)} className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white md:col-span-3 min-h-[70px]" placeholder="Projected outcome summary (optional)" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10">
                Cancel
              </button>
              <LoadingButton
                onClick={handleSave}
                isLoading={isSaving}
                loadingText="Saving..."
                className="px-4 py-2 rounded-lg text-white font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #582dff, #3a137a)',
                }}
              >
                {editingId ? 'Update Property' : 'Create Property'}
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
