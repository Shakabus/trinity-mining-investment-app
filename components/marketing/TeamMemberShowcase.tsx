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
  {
    id: 'greg-dickhens',
    name: 'Greg Dickhens',
    role: 'Principal & Managing Partner',
    image: '/images/team/greg-dickhens.jpg',
    bio: [
      'Mr. Dickhens is a Principal and Managing Partner of Trinity Investments.',
      'He is responsible for overseeing and managing Trinity investment strategies.',
      'Prior to joining Trinity, Mr. Dickhens served on the Board of Directors of Seibu Properties and Kyo-ya Pacific Company, and worked for Prince Resorts Hawaii, Kyo-ya Company LLC, Vail Resorts Development Company, Hilton Hotels Corporation, and Marriott International.',
      'Mr. Dickhens received a Bachelor of Science degree in Hotel Administration from Cornell University and a Master of Business Administration, with Honors, from the Anderson School of Business at UCLA.',
      'He is a member of the Young Presidents Organization and serves on the Board of Trustees of Punahou School.',
    ],
  },
  {
    id: 'lee-neibart',
    name: 'Lee Neibart',
    role: 'Chairman & Senior Partner',
    image: '/images/team/lee-neibart.jpg',
    bio: [
      'Mr. Neibart is the Chairman and Senior Partner of Trinity Investments.',
      'He is responsible for developing and advancing Trinity global investment strategies and fundraising efforts.',
      'Prior to joining Trinity, Mr. Neibart worked for Ares Management LLC Real Estate Group, Apollo Real Estate Advisors, NRDC Equity Partners, and Robert Martin Company.',
      'Mr. Neibart received a Bachelor of Arts degree from the University of Wisconsin and a Master of Business Administration from New York University.',
      'He is a member of the Advisory Board of The Real Estate Institute of New York University.',
    ],
  },
  {
    id: 'ryan-donn',
    name: 'Ryan Donn',
    role: 'Managing Partner, Chief Investment Officer & Head of Europe',
    image: '/images/team/ryan-donn.jpg',
    bio: [
      'Mr. Donn is a Managing Partner, Chief Investment Officer, and Head of Europe at Trinity Investments.',
      'He is responsible for leading Trinity transactional activity, including due diligence, acquisitions, dispositions, and financings.',
      'Prior to joining Trinity, Mr. Donn worked for Hotel Capital Advisers, Inc., Lehman Brothers, and PricewaterhouseCoopers LLP. He is a former instructor of New York University graduate hospitality program.',
      'Mr. Donn received a Bachelor of Science degree in Hotel Administration from Cornell University, with a concentration in real estate.',
      'He is a Cornell Tradition Fellow, a past member of the Cornell University Council, a former chair of the Deans Council of Young Alumni for the Cornell Hotel School, and a Pacific Century Fellow.',
    ],
  },
  {
    id: 'joanne-halligan',
    name: 'JoAnne Halligan',
    role: 'Chief Financial Officer',
    image: '/images/team/joanne-halligan.jpg',
    bio: [
      'Ms. Halligan is the Chief Financial Officer at Trinity Investments.',
      'She is responsible for overseeing the firm financial management, accounting operations, and strategic financial planning.',
      'She also leads initiatives to enhance operational efficiency and support the firm growth and investment objectives.',
      'Prior to joining Trinity, Ms. Halligan worked for Oaktree Capital Management and KPMG LLP.',
      'Ms. Halligan received a Bachelor of Arts degree in Business Economics with an emphasis in Accounting from the University of California, Santa Barbara.',
    ],
  },
  {
    id: 'jeffrey-barry',
    name: 'Jeffrey Barry',
    role: 'General Counsel & Chief Administrative Officer',
    image: '/images/team/jeffrey-barry.jpg',
    bio: [
      'Mr. Barry is the General Counsel and Chief Administrative Officer of Trinity Investments.',
      'He is responsible for management of Trinity legal and corporate governance, human resources, and IT functions.',
      'Prior to joining Trinity, Mr. Barry worked for Schottenstein Stores Corporation and Goodwin Procter LLP.',
      'Mr. Barry received a Bachelor of Science degree in Business Administration in Accounting from The Ohio State University, a Juris Doctor from Boston University School of Law, and a Master of Laws in Taxation from New York University School of Law.',
    ],
  },
  {
    id: 'amin-khorasanee',
    name: 'Amin Khorasanee',
    role: 'Chief Compliance Officer & Chief Technology Officer',
    image: '/images/team/amin-khorasanee.jpg',
    bio: [
      'Mr. Khorasanee is the Chief Compliance Officer and Chief Technology Officer of Trinity Investments.',
      'He leads the strategic implementation and oversight of the firm compliance and technology programs.',
      'Prior to joining Trinity, Mr. Khorasanee worked for Tikehau Capital, BNP Paribas, Bank of the West, and Citi.',
      'Mr. Khorasanee received a Bachelor of Science degree in Corporate Finance from San Jose State University.',
    ],
  },
  {
    id: 'craig-lovett',
    name: 'Craig Lovett',
    role: 'Managing Director of Development',
    image: '/images/team/craig-lovett.jpg',
    bio: [
      'Mr. Lovett is a Managing Director of Development at Trinity Investments.',
      'He oversees Trinity development management team and is responsible for formulating strategy and delivery of all design, construction, and development activities.',
      'Prior to joining Trinity, Mr. Lovett worked for Medland Metropolis Engineers, WSP, Prince Resorts Hawaii, and Starwood Hotels and Resorts.',
    ],
  },
  {
    id: 'stephany-chen',
    name: 'Stephany Chen',
    role: 'Senior Vice President of Investor Relations',
    image: '/images/team/stephany-chen.jpg',
    bio: [
      'Ms. Chen is a Senior Vice President of Investor Relations at Trinity Investments.',
      'She develops, manages, and oversees the firm investor relations strategy, serving as the primary contact between Trinity and its investment community.',
      'Prior to joining Trinity Investments, Ms. Chen worked for JLL Hotels and Hospitality Group and Burba Hotel Network (BHN).',
      'Ms. Chen graduated with a Bachelors degree from The School of Hospitality Business at Michigan State University, where she specialized in real estate.',
    ],
  },
  {
    id: 'matt-dicello',
    name: 'Matt DiCello',
    role: 'Senior Vice President of Strategic Operations',
    image: '/images/team/matt-dicello.jpg',
    bio: [
      'Mr. DiCello is a Senior Vice President of Strategic Operations at Trinity Investments.',
      'He is responsible for providing asset management services to Trinity investments with a focus on value creation.',
      'Prior to joining Trinity, Mr. DiCello worked for Arthur Andersen LLP, Marriott International, Park Hotels and Resorts, Inc., Starwood Capital Group, and Brookfield Properties.',
      'Mr. DiCello received a Bachelor of Science degree in Accounting from The University of Indiana of Pennsylvania.',
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
