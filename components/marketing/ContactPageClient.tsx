'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useToast } from '@/components/ui/ToastProvider'
import styles from '@/components/marketing/ContactPageClient.module.css'

type Office = {
  city: string
  address: string
  phone?: string
}

const OFFICES: Office[] = [
  {
    city: 'London',
    address: '5 Swallow Place Suite 4.2, Mayfair, London, W1B 2AF',
    phone: '+44 20 4571 0115',
  },
  {
    city: 'Los Angeles',
    address: '9401 Wilshire Blvd Suite 700, Beverly Hills, California 90212, US',
    phone: '+1 213 318 0583',
  },
  {
    city: 'Miami',
    address: '2982 Grand Avenue, Suite 203, Miami, Florida 33133',
    phone: '+1 305 800 1115',
  },
  {
    city: 'Honolulu',
    address: '55 Merchant Street, Suite 1500, Honolulu, Hawaii 96813',
    phone: '+1 808 529 0909',
  },
]

const CONTACT_CHANNELS = [
  { label: 'Support', value: 'support@trinityinoneinvestments.com', href: 'mailto:support@trinityinoneinvestments.com' },
  { label: 'Info', value: 'info@trinityinoneinvestments.com', href: 'mailto:info@trinityinoneinvestments.com' },
  { label: 'Corporate', value: 'contact@trinityinvestments.com', href: 'mailto:contact@trinityinvestments.com' },
  { label: 'Primary Tel', value: '+1 305 800 1115', href: 'tel:+13058001115' },
]

export default function ContactPageClient() {
  const { showToast } = useToast()
  const [activeOffice, setActiveOffice] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })

  const mapUrl = useMemo(() => {
    const office = OFFICES[activeOffice]
    return `https://www.google.com/maps?q=${encodeURIComponent(office.address)}&output=embed`
  }, [activeOffice])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    if (!form.fullName.trim() || !form.email.trim() || !form.message.trim()) {
      showToast('Please fill full name, email, and message.', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/contact/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          sourcePage: '/contact',
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        showToast(payload?.error || 'Failed to send message.', 'error')
        return
      }

      setForm({
        fullName: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      })
      showToast('Message sent. Our team will contact you by email.', 'success')
    } catch (error) {
      console.error('Contact submit error:', error)
      showToast('Network error. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Contact</p>
        <h1 className={styles.title}>Talk to Trinity in One</h1>
        <p className={styles.subtitle}>
          Reach our team for mining, investment trading, and asset strategy questions. Send us a
          message and we will respond directly to your email.
        </p>
      </section>

      <section className={styles.channelGrid}>
        {CONTACT_CHANNELS.map(channel => (
          <a key={channel.value} className={styles.channelCard} href={channel.href}>
            <span className={styles.channelLabel}>{channel.label}</span>
            <span className={styles.channelValue}>{channel.value}</span>
          </a>
        ))}
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Send a message</h2>
          <p className={styles.sectionText}>
            Your message is routed to the admin support inbox. Include the best email so our team
            can reply quickly.
          </p>

          <form onSubmit={onSubmit} className={styles.form}>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>Full Name</span>
                <input
                  value={form.fullName}
                  onChange={event => setForm(prev => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Your full name"
                  required
                />
              </label>
              <label className={styles.field}>
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))}
                  placeholder="you@example.com"
                  required
                />
              </label>
            </div>

            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>Phone</span>
                <input
                  value={form.phone}
                  onChange={event => setForm(prev => ({ ...prev, phone: event.target.value }))}
                  placeholder="+1 000 000 0000"
                />
              </label>
              <label className={styles.field}>
                <span>Subject</span>
                <input
                  value={form.subject}
                  onChange={event => setForm(prev => ({ ...prev, subject: event.target.value }))}
                  placeholder="How can we help?"
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>Message</span>
              <textarea
                value={form.message}
                onChange={event => setForm(prev => ({ ...prev, message: event.target.value }))}
                placeholder="Tell us what you need..."
                rows={6}
                required
              />
            </label>

            <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>

        <div className={styles.mapCard}>
          <h2 className={styles.sectionTitle}>Office locations</h2>
          <div className={styles.officeTabs}>
            {OFFICES.map((office, index) => (
              <button
                key={office.city}
                type="button"
                onClick={() => setActiveOffice(index)}
                className={`${styles.officeTab} ${activeOffice === index ? styles.officeTabActive : ''}`}
              >
                {office.city}
              </button>
            ))}
          </div>

          <div className={styles.mapWrap}>
            <iframe
              title={`${OFFICES[activeOffice].city} office map`}
              src={mapUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>

          <div className={styles.officeDetails}>
            <div className={styles.officeCity}>{OFFICES[activeOffice].city}</div>
            <div className={styles.officeAddress}>{OFFICES[activeOffice].address}</div>
            {OFFICES[activeOffice].phone && (
              <a href={`tel:${OFFICES[activeOffice].phone?.replace(/[^\d+]/g, '')}`} className={styles.officePhone}>
                {OFFICES[activeOffice].phone}
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
