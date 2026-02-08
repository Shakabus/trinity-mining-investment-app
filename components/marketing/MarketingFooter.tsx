import Link from 'next/link'
import styles from '@/components/marketing/MarketingFooter.module.css'

const footerLinks = [
  { label: 'About Us', href: '/about-us' },
  { label: 'Team', href: '/team' },
  { label: 'Real Estate Portfolio', href: '/real-estate-portfolio' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Features', href: '/features' },
  { label: 'Incentives', href: '/incentives' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms-and-conditions' },
]

export default function MarketingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.shell}>
        <div className={styles.brandPane}>
          <div className={styles.logo}>Trinity in One</div>
        </div>

        <div className={styles.linksPane}>
          <h3 className={styles.heading}>Quick Links</h3>
          <nav className={styles.linkGrid} aria-label="Footer navigation">
            {footerLinks.map(link => (
              <Link key={link.href} href={link.href} className={styles.link}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.socialPane}>
          <h3 className={styles.heading}>Connect</h3>
          <div className={styles.socialRow}>
            <a className={styles.socialIcon} href="#" aria-label="X">
              <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.xIcon}>
                <path d="M18.244 2H21l-6.53 7.46L22 22h-5.86l-4.59-6.01L6.3 22H3.54l6.98-7.98L2 2h6.01l4.15 5.47L18.24 2z" />
              </svg>
            </a>
            <a className={styles.socialIcon} href="#" aria-label="Facebook">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a className={styles.socialIcon} href="#" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
            <a className={styles.socialIcon} href="#" aria-label="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className={styles.meta}>
        <span>&copy; {year} Trinity in One. All rights reserved.</span>
      </div>
    </footer>
  )
}
