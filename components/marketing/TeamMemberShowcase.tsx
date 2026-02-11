'use client'

import { useState } from 'react'
import styles from '@/components/marketing/TeamMemberShowcase.module.css'

type TeamMember = {
  id: string
  name: string
  role: string
  image: string
  bio: string[]
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'sean-hehir',
    name: 'Sean Hehir',
    role: 'Managing Partner, President & Chief Executive Officer',
    image: '/images/team/sean-hehir.jpg',
    bio: [
      'Mr. Hehir is a Managing Partner of Trinity Investments. He is also the President and Chief Executive Officer of Trinity Investments and Trinity Fund Advisors LLC.',
      'He oversees the firms investment activities, including sourcing and executing investment opportunities, formulating investment strategies, and structuring acquisitions and dispositions. Prior to joining Trinity, Mr. Hehir worked for HVS International.',
      'Mr. Hehir received a Bachelor of Science degree in Hotel Administration from Cornell University and a Diploma in Hotel Administration from the Hotel Institute Montreux, Switzerland.',
      'He is a board member of the Hawaii Business Roundtable, the Hawaii Chapter of The Nature Conservancy, and an active member of the Young Presidents Organization.',
    ],
  },
]

export default function TeamMemberShowcase() {
  const [openId, setOpenId] = useState<string | null>(null)
  const openMember = TEAM_MEMBERS.find(member => member.id === openId) ?? null

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Leadership Team</h2>
        <p className={styles.subtitle}>
          Meet the people responsible for platform strategy, capital direction, and execution quality.
        </p>
      </div>

      <div className={styles.grid}>
        {TEAM_MEMBERS.map(member => (
          <button
            key={member.id}
            type="button"
            className={styles.card}
            onClick={() => setOpenId(member.id)}
          >
            <div className={styles.imageWrap}>
              <img src={member.image} alt={member.name} className={styles.image} loading="lazy" />
            </div>
            <div className={styles.cardBody}>
              <h3 className={styles.name}>{member.name}</h3>
              <p className={styles.role}>{member.role}</p>
            </div>
          </button>
        ))}
      </div>

      {openMember && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label={openMember.name}>
          <div className={styles.modal}>
            <button type="button" className={styles.closeBtn} onClick={() => setOpenId(null)}>
              x
            </button>
            <div className={styles.modalTop}>
              <img src={openMember.image} alt={openMember.name} className={styles.modalImage} />
              <div>
                <h3 className={styles.modalName}>{openMember.name}</h3>
                <p className={styles.modalRole}>{openMember.role}</p>
              </div>
            </div>

            <div className={styles.modalText}>
              {openMember.bio.map((paragraph, index) => (
                <p key={`${openMember.id}-${index}`}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
