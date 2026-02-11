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
  {
    id: 'harrison-ishida',
    name: "Harrison 'Jeeter' Ishida",
    role: 'Senior Vice President of Acquisitions',
    image: '/images/team/harrison-ishida.jpg',
    bio: [
      'Mr. Ishida is a Senior Vice President of Acquisitions at Trinity Investments.',
      'He is responsible for sourcing, underwriting, and execution of Trinity investment activities.',
      'Prior to joining Trinity, Mr. Ishida worked for Jones Lang LaSalle Hotel and Hospitality Group and GCA Savvian Advisors.',
      'Mr. Ishida received a Bachelors degree, summa cum laude, from the Dyson School of Applied Economics and Management at Cornell University.',
    ],
  },
  {
    id: 'jake-lynch',
    name: 'Jake Lynch',
    role: 'Senior Vice President of Strategic Operations',
    image: '/images/team/jake-lynch.jpg',
    bio: [
      'Mr. Lynch is a Senior Vice President of Strategic Operations at Trinity Investments.',
      'He is responsible for providing asset management services to Trinity investments with a focus on value creation.',
      'Prior to joining Trinity, Mr. Lynch worked at BRE Hotels and Resorts, Marriott International, and Starwood Hotels and Resorts.',
      'Mr. Lynch received a Bachelor of Arts in Hotel Management from Royal Roads University in Victoria, Canada, and a Master of Management degree from the School of Hotel Administration at Cornell University, with a minor in real estate.',
    ],
  },
  {
    id: 'samantha-sugarman',
    name: 'Samantha Sugarman',
    role: 'Senior Vice President of Strategic Operations',
    image: '/images/team/samantha-sugarman.jpg',
    bio: [
      'Ms. Sugarman is a Senior Vice President of Strategic Operations at Trinity Investments.',
      'She is responsible for overseeing Trinity asset management function by executing value-add operational strategies and providing oversight of hotel financial performance.',
      'Prior to joining Trinity, Ms. Sugarman worked for CPG Hospitality, Alojica, Four Seasons Hotels and Resorts, and Ernst and Young LLP.',
      'Ms. Sugarman received a Bachelor of Science degree in Hotel Administration from Cornell University, with a minor in Latin American Studies.',
    ],
  },
  {
    id: 'elia-antonioudaki',
    name: 'Elia Antonioudaki',
    role: 'Vice President of Development',
    image: '/images/team/elia-antonioudaki.jpg',
    bio: [
      'Ms. Antonioudaki is a Vice President of Development at Trinity Investments.',
      'She is responsible for Trinity design, construction, and development activities across Europe.',
      'Prior to joining Trinity Investments, Ms. Antonioudaki worked for London and Regional Hotels and Hilton Worldwide.',
      'Ms. Antonioudaki holds a Master of Science in Advanced Architectural Design from Columbia University and a Master in Architecture from National Technical University of Athens.',
    ],
  },
  {
    id: 'dempsey-banks',
    name: 'Dempsey Banks',
    role: 'Vice President of Investor Relations',
    image: '/images/team/dempsey-banks.jpg',
    bio: [
      'Ms. Banks is a Vice President at Trinity Investments.',
      'She is responsible for overseeing investor relations with limited partners and strategic co-investors around the world.',
      'Prior to joining Trinity, Ms. Banks worked for CIM Group and Starwood Capital Group.',
      'Ms. Banks received a Bachelor of Science degree in Hotel Administration from Cornell University, with a minor in real estate.',
    ],
  },
  {
    id: 'kelly-connelly',
    name: 'Kelly Connelly',
    role: 'Vice President of Strategic Operations',
    image: '/images/team/kelly-connelly.jpg',
    bio: [
      'Ms. Connelly is a Vice President of Strategic Operations at Trinity Investments.',
      'She is responsible for asset management and investment services across the portfolio.',
      'Prior to joining Trinity, Ms. Connelly worked for Henderson Park Capital, Dwight Capital, and JPMorgan Chase.',
      'Ms. Connelly received a Bachelor of Science in Finance from Georgetown University and a Master of Science in Real Estate Development from Columbia University.',
    ],
  },
  {
    id: 'andrea-hendrick',
    name: 'Andrea Hendrick',
    role: 'Vice President of Finance',
    image: '/images/team/andrea-hendrick.jpg',
    bio: [
      'Ms. Hendrick is a Vice President of Finance at Trinity Investments.',
      'She is responsible for financial operations and management of Trinity European investments and partnerships.',
      'Prior to joining Trinity Investments, Ms. Hendrick worked for Oaktree Capital Management (UK) LLP and H.I.G. Capital.',
      'Ms. Hendrick received a Bachelor of Arts (Honours) in Accounting from the National College of Ireland and is a member of the Association of Chartered Certified Accountants.',
    ],
  },
  {
    id: 'mai-kawashima',
    name: 'Mai Kawashima',
    role: 'Vice President of Acquisitions',
    image: '/images/team/mai-kawashima.jpg',
    bio: [
      'Ms. Kawashima is a Vice President of Acquisitions at Trinity Investments.',
      'She is responsible for sourcing, underwriting, and execution of Trinity investment activities across Europe.',
      'Prior to joining Trinity, Ms. Kawashima worked for Savills Hotel Capital Markets, Jones Lang LaSalle Hotel and Hospitality Group, and Merrill Lynch Japan Securities.',
      'Ms. Kawashima received a Bachelor degree from the School of International Liberal Studies at Waseda University, Tokyo.',
      'She is fluent in Japanese, German, and English.',
    ],
  },
  {
    id: 'caroline-lam',
    name: 'Caroline Lam',
    role: 'Vice President of Strategic Operations',
    image: '/images/team/caroline-lam.jpg',
    bio: [
      'Ms. Lam is a Vice President of Strategic Operations at Trinity Investments.',
      'She is responsible for asset managing Trinity portfolio in Europe with a focus on value creation.',
      'Prior to joining Trinity, Ms. Lam worked for Blackstone Europe LLP, Blackstone Australia, and Cushman and Wakefield.',
      'Ms. Lam received a Bachelor of Property Economics (Honours) from the University of Technology Sydney.',
    ],
  },
  {
    id: 'sean-mcnaboe',
    name: 'Sean McNaboe',
    role: 'Vice President of Development',
    image: '/images/team/sean-mcnaboe.jpg',
    bio: [
      'Mr. McNaboe is a Vice President of Development at Trinity Investments.',
      'He is responsible for the design, construction, and development of Trinity assets on the East Coast.',
      'Prior to joining Trinity, Mr. McNaboe worked for Sunstone Hotel Investors.',
    ],
  },
  {
    id: 'hari-yoon',
    name: 'Hari Yoon',
    role: 'Vice President of Strategic Planning',
    image: '/images/team/hari-yoon.jpg',
    bio: [
      'Ms. Yoon is a Vice President of Strategic Planning at Trinity Investments.',
      'She is responsible for overseeing strategic asset management projects for Trinity growing portfolio, including planning and operations of food and beverage, retail, club, spa, and other value-add capital and operational initiatives.',
      'Prior to joining Trinity, Ms. Yoon worked for Kimpton Hotels and Restaurants, HVS International, Starwood Hotels and Resorts, and Hillstone Restaurant Group.',
      'Ms. Yoon received a Bachelor of Arts degree in Mass Communications and Political Science from the University of California, Berkeley, and a Masters degree from the School of Hotel Administration at Cornell University, where she specialized in hotel real estate finance.',
      'She is fluent in Korean.',
    ],
  },
  {
    id: 'merilyn-hu',
    name: 'Merilyn Hu',
    role: 'Director of Development',
    image: '/images/team/merilyn-hu.jpg',
    bio: [
      'Ms. Hu is a Director at Trinity Investments.',
      'She is responsible for executing value-add renovations of Trinity investments, with a focus on design and construction, by providing management through all stages of development.',
      'Prior to joining Trinity, Ms. Hu worked for Boardwalk Investments and AECOM.',
      'Ms. Hu received a Bachelor of Architectural Studies from the University of Auckland and a Master of Architecture from the Southern California Institute of Architecture.',
      'She is fluent in Mandarin.',
    ],
  },
  {
    id: 'liane-fujii',
    name: 'Liane Fujii',
    role: 'Director of Finance - Development',
    image: '/images/team/liane-fujii.jpg',
    bio: [
      'Ms. Fujii is a Director of Finance - Development at Trinity Investments.',
      'She is responsible for overseeing development financial operations for capital plans across various assets.',
      'Prior to joining Trinity Investments, Ms. Fujii worked for Rider Levett Bucknall and Kiewit Building Group.',
      'Ms. Fujii received a Bachelor of Science degree in Civil Engineering from the University of Washington.',
    ],
  },
  {
    id: 'catherine-han',
    name: 'Catherine Han',
    role: 'Director of Acquisitions',
    image: '/images/team/catherine-han.jpg',
    bio: [
      'Ms. Han is a Director of Acquisitions at Trinity Investments.',
      'She is primarily responsible for the sourcing, underwriting, and execution of Trinity investment activities.',
      'Prior to joining Trinity, Ms. Han worked for Ohana Real Estate Investors.',
      'Ms. Han received a Bachelor of Arts degree in Hospitality Management from Sookmyung Womens University and a Masters degree from the School of Hotel Administration at Cornell University, with a minor in real estate.',
      'She is fluent in Korean.',
    ],
  },
  {
    id: 'slater-hobbs',
    name: "Slater 'Kamana' Hobbs",
    role: 'Director of Investor Relations',
    image: '/images/team/slater-hobbs.jpg',
    bio: [
      'Mr. Hobbs is a Director of Investor Relations at Trinity Investments.',
      'He is responsible for overseeing investor relations with limited partners and strategic co-investors around the world.',
      'Prior to joining Trinity Investments, Mr. Hobbs worked for Kroll.',
      'Mr. Hobbs received a Bachelor of Arts degree in English from Dartmouth College, with a minor in Markets, Management, and the Economy.',
    ],
  },
  {
    id: 'brittney-lewin',
    name: 'Brittney Lewin',
    role: 'Director of Strategic Operations',
    image: '/images/team/brittney-lewin.jpg',
    bio: [
      'Ms. Lewin is a Director of Strategic Operations at Trinity Investments.',
      'She is responsible for providing asset management services for Trinity existing portfolio.',
      'Prior to joining Trinity, Ms. Lewin worked for L+R Hotels and Crescent Hotels and Resorts.',
      'Ms. Lewin received a Bachelor of Science degree in Hotel Administration from Cornell University, with a minor in real estate.',
    ],
  },
  {
    id: 'kelly-weldon',
    name: 'Kelly Fricke Weldon',
    role: 'Director of Acquisitions',
    image: '/images/team/kelly-weldon.jpg',
    bio: [
      'Mrs. Weldon is a Director of Acquisitions at Trinity Investments.',
      'She is primarily responsible for the sourcing, underwriting, and execution of Trinity investment activities, in addition to assisting with management of Trinity portfolio.',
      'Prior to joining Trinity, Mrs. Weldon worked for Wells Fargo Securities.',
      'Mrs. Weldon received a Bachelor of Business Administration degree from the University of Notre Dame, where she double majored in Finance and Chinese.',
    ],
  },
  {
    id: 'isobel-denby-jones',
    name: 'Isobel Denby-Jones',
    role: 'Associate',
    image: '/images/team/isobel-denby-jones.jpg',
    bio: [
      'Ms. Denby-Jones is an Associate at Trinity Investments.',
      'She is responsible for the sourcing, underwriting, and execution of investment opportunities across Europe, as well as portfolio management.',
      'Prior to joining Trinity, Ms. Denby-Jones worked at Northwood Investors and Goldman Sachs.',
      'Ms. Denby-Jones received a Bachelors degree from the University of Oxford and a Masters degree from the University of Cambridge.',
    ],
  },
  {
    id: 'genevieve-lieber',
    name: 'Genevieve Lieber',
    role: 'Associate',
    image: '/images/team/genevieve-lieber.jpg',
    bio: [
      'Ms. Lieber is an Associate at Trinity Investments.',
      'She is responsible for providing asset management services across Trinity portfolio.',
      'Prior to joining Trinity Investments, Ms. Lieber received an MBA from The Wharton School where she majored in Real Estate.',
      'Over the course of her MBA, she gained valuable experience working with hospitality-focused companies.',
      'Before pivoting into hospitality, Ms. Lieber was a consultant at Accenture Strategy.',
      'She received her undergraduate BA from the University of Pennsylvania.',
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
