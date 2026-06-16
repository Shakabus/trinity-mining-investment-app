'use client'

import { useEffect, useState } from 'react'

type Step = {
  title: string
  description: string
  icon: React.ReactNode
}

const STEPS: Step[] = [
  {
    title: 'Sign Up',
    description:
      'Create your free Trinity account in minutes with just an email and password. Get instant access to the dashboard and start your mining journey securely.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-12 w-12">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    title: 'Choose Plan',
    description:
      'Browse our flexible mining plans, from free trials to pro tiers. Select the hash rate that fits your goals and complete any quick payment for paid options.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-12 w-12">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18" />
        <path d="M15 3v18" />
        <path d="M3 9h18" />
        <path d="M3 15h18" />
      </svg>
    ),
  },
  {
    title: 'Activate Mining',
    description:
      'Set up your wallet and configure preferences. Our cloud farms kick in automatically, renting hash power to mine crypto without any hardware setup.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-12 w-12">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8" />
        <path d="M12 8v8" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: 'Earn Rewards',
    description:
      'Monitor real-time earnings on your dashboard. Withdraw your mined crypto anytime, with bonuses and daily payouts to grow your portfolio effortlessly.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-12 w-12">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
]

export default function OnboardingProcess() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex(prev => (prev + 1) % STEPS.length)
    }, 2000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  return (
    <section className="mt-24">
      <div className="text-center">
        <h2 className="text-4xl font-semibold leading-tight md:text-6xl">Onboarding Process</h2>
        <p className="mt-4 text-base text-white/60 md:text-2xl">
          We provide simple guide steps to getting started
        </p>
      </div>

      <div className="mt-14 flex flex-wrap items-start justify-center gap-y-14 lg:flex-nowrap lg:gap-y-0">
        {STEPS.map((step, index) => {
          const isActive = activeIndex === index
          const isLast = index === STEPS.length - 1
          const upCurve = index % 2 === 0
          const path = upCurve
            ? 'M 0 50 Q 50 20, 100 50 T 200 50'
            : 'M 0 50 Q 50 80, 100 50 T 200 50'

          return (
            <div
              key={step.title}
              className="relative flex w-full max-w-[320px] flex-col items-center px-4 sm:w-1/2 lg:w-1/4"
            >
              <div
                className={`flex h-[120px] w-[120px] items-center justify-center rounded-full border text-white transition-all duration-500 ${
                  isActive
                    ? 'scale-100 border-white/25 bg-white/12 opacity-100 shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_30px_rgba(255,255,255,0.22)]'
                    : 'scale-90 border-white/15 bg-white/6 opacity-60'
                }`}
                style={{
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <div className="stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
                  {step.icon}
                </div>
              </div>

              {!isLast && (
                <div className="pointer-events-none absolute left-1/2 top-[60px] hidden h-[100px] w-full lg:block">
                  <svg
                    viewBox="0 0 200 100"
                    preserveAspectRatio="none"
                    className="h-full w-full overflow-visible"
                    aria-hidden="true"
                  >
                    <path d={path} stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeDasharray="8,8" fill="none" />
                  </svg>
                  <div className="absolute -right-[5px] top-1/2 h-0 w-0 -translate-y-1/2 border-b-[6px] border-l-[10px] border-t-[6px] border-b-transparent border-l-white/40 border-t-transparent" />
                </div>
              )}

              <div className="mt-8 text-center">
                <h3 className="font-['Poppins'] text-3xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-lg leading-8 text-white/85">{step.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

