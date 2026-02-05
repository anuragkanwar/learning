import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.heroBanner}>
      {/* Animated Background Elements */}
      <div className={styles.heroBackground}>
        <div className={styles.gradientOrb1}></div>
        <div className={styles.gradientOrb2}></div>
        <div className={styles.gradientOrb3}></div>
        <div className={styles.gridPattern}></div>
      </div>

      <div className="container">
        <div className={styles.heroContent}>
          {/* Code Tag Badge */}
          <div className={styles.codeTag}>
            <span className={styles.tagBracket}>&lt;</span>
            <span className={styles.tagName}>developer</span>
            <span className={styles.tagBracket}>/&gt;</span>
          </div>

          {/* Main Title with Gradient */}
          <Heading as="h1" className={styles.heroTitle}>
            <span className={styles.titleGradient}>{siteConfig.title}</span>
          </Heading>

          {/* Animated Subtitle */}
          <p className={styles.heroSubtitle}>
            <span className={styles.typewriter}>
              Building software. Sharing knowledge. Crafting the future.
            </span>
          </p>

          {/* Terminal-style Description */}
          <div className={styles.terminalBox}>
            <div className={styles.terminalHeader}>
              <span className={styles.terminalDot}></span>
              <span className={styles.terminalDot}></span>
              <span className={styles.terminalDot}></span>
              <span className={styles.terminalTitle}>anumax@dev:~</span>
            </div>
            <div className={styles.terminalBody}>
              <p><span className={styles.terminalPrompt}>$</span> <span className={styles.terminalCommand}>cat mission.txt</span></p>
              <p className={styles.terminalOutput}>
                A curated collection of software engineering wisdom.
                From system design to clean code. Production-ready insights.
              </p>
              <p><span className={styles.terminalPrompt}>$</span> <span className={styles.terminalCursor}>_</span></p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className={styles.buttons}>
            <Link
              className={clsx('button button--primary button--lg', styles.primaryButton)}
              to="/docs/intro">
              <span className={styles.buttonIcon}>🚀</span>
              Start Learning
            </Link>
            <Link
              className={clsx('button button--secondary button--lg', styles.secondaryButton)}
              to="https://github.com/anuragkanwar/learning">
              <span className={styles.buttonIcon}>⭐</span>
              Star on GitHub
            </Link>
          </div>

          {/* Stats Row */}
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>50+</span>
              <span className={styles.statLabel}>Topics</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>∞</span>
              <span className={styles.statLabel}>Curiosity</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>100%</span>
              <span className={styles.statLabel}>Passion</span>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className={styles.scrollIndicator}>
            <div className={styles.scrollMouse}>
              <div className={styles.scrollWheel}></div>
            </div>
            <span className={styles.scrollText}>Scroll to explore</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function TechStack() {
  const technologies = [
    { name: 'Spring Boot', icon: '🍃', color: '#6db33f' },
    { name: 'React', icon: '⚛️', color: '#61dafb' },
    { name: 'System Design', icon: '🏗️', color: '#ff6b6b' },
    { name: 'Java', icon: '☕', color: '#f89820' },
    { name: 'DevOps', icon: '🐳', color: '#2496ed' },
    { name: 'DSA', icon: '📊', color: '#9b59b6' },
  ];

  return (
    <section className={styles.techStack}>
      <div className="container">
        <div className={styles.techStackHeader}>
          <span className={styles.sectionTag}>// EXPERTISE</span>
          <Heading as="h2" className={styles.sectionTitle}>
            Tech Stack
          </Heading>
        </div>
        <div className={styles.techGrid}>
          {technologies.map((tech, idx) => (
            <div key={idx} className={styles.techCard} style={{'--tech-color': tech.color}}>
              <span className={styles.techIcon}>{tech.icon}</span>
              <span className={styles.techName}>{tech.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuoteSection() {
  return (
    <section className={styles.quoteSection}>
      <div className={styles.quoteBackground}></div>
      <div className="container">
        <blockquote className={styles.quote}>
          <span className={styles.quoteMark}>"</span>
          <p className={styles.quoteText}>
            The only way to do great work is to love what you do.
          </p>
          <cite className={styles.quoteAuthor}>— Steve Jobs</cite>
        </blockquote>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="A software developer's knowledge hub - Spring Boot, System Design, React, and more.">
      <HomepageHeader />
      <main>
        <TechStack />
        <HomepageFeatures />
        <QuoteSection />
      </main>
    </Layout>
  );
}
