import styles from '@/components/marketing/MissionVisionCards.module.css'

export default function MissionVisionCards() {
  return (
    <section className={styles.wrapper}>
      <div className={styles.container}>
        <article className={`${styles.card} ${styles.missionCard}`}>
          <h2 className={styles.title}>Mission</h2>
          <p className={styles.content}>
            Trinity in One exists to deliver a transparent, performance-driven platform that unifies
            institutional-grade crypto mining, structured investment trading, and real-asset strategy
            in one accountable operating system. We focus on clear plan architecture, disciplined risk
            controls, and verifiable execution so clients can participate in multi-asset growth with
            confidence.
          </p>
        </article>

        <article className={`${styles.card} ${styles.visionCard}`}>
          <h2 className={styles.title}>Vision</h2>
          <p className={styles.content}>
            Our vision is to become the global benchmark for integrated digital and real-asset
            investment infrastructure, where mining output, managed trading performance, and
            portfolio-backed opportunities are tracked with full clarity from order to payout. We are
            building a resilient ecosystem designed for long-term investor alignment, operational
            integrity, and scalable value creation.
          </p>
        </article>
      </div>
    </section>
  )
}
