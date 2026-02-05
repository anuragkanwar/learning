import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Deep Dives',
    emoji: '🔬',
    description: (
      <>
        Not just surface-level explanations. We dissect concepts, explore internals, 
        and understand the <strong>why</strong> behind the <strong>what</strong>.
      </>
    ),
  },
  {
    title: 'Production Ready',
    emoji: '🚀',
    description: (
      <>
        Real-world examples. Battle-tested patterns. Code you can actually 
        ship to production without losing sleep.
      </>
    ),
  },
  {
    title: 'Curated Knowledge',
    emoji: '🧠',
    description: (
      <>
        Years of experience condensed into bite-sized, comprehensive guides. 
        Learn faster without the fluff.
      </>
    ),
  },
];

function Feature({emoji, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.featureCard}>
        <div className={styles.featureIcon}>{emoji}</div>
        <div className={styles.featureContent}>
          <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
          <p className={styles.featureDescription}>{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>// WHY HERE?</span>
          <Heading as="h2" className={styles.sectionTitle}>
            What Makes This Different
          </Heading>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
