import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { 
  Zap, 
  ShieldCheck, 
  MessageSquare, 
  Menu,
  Headphones
} from 'lucide-react';
import Button from '../components/ui/Button';
import styles from './LandingPage.module.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();

  const handleStart = () => {
    if (isSignedIn) {
      navigate('/dashboard');
    } else {
      navigate('/sign-up');
    }
  };

  return (
    <div className={styles.container}>
      {/* Background Glow */}
      <div className={styles.glow} />

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.brand}>
          <div className={styles.logoPill}>V</div>
          <span className={styles.brandName}>Velo AI</span>
        </div>
        <div className={styles.navActions}>
          <button onClick={() => navigate('/sign-in')} className={styles.signInLink}>
            Sign In
          </button>
          <button className={styles.menuBtn}>
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className={styles.hero}>
        <h1 className={styles.headline}>
          Build Intelligent WhatsApp Assistants for Your Business
        </h1>
        <p className={styles.subtitle}>
          Automate customer support, sales, and inquiries with high-speed AI logic. Featuring real-time human takeover and local Zimbabwean payments.
        </p>

        <div className={styles.ctaGroup}>
          <Button onClick={handleStart} variant="primary">
            Get Started
          </Button>
          <Button onClick={() => navigate('/docs')} variant="secondary">
            Read Docs
          </Button>
        </div>
      </main>

      {/* Stats Footer */}
      <footer className={styles.footer}>
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <div className={styles.statIcon}><Zap size={20} /></div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>Smart AI</span>
              <span className={styles.statLabel}>Dynamic Logic</span>
            </div>
          </div>

          <div className={styles.statItem}>
            <div className={styles.statIcon}><ShieldCheck size={20} /></div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>Human Sync</span>
              <span className={styles.statLabel}>Auto-Takeover</span>
            </div>
          </div>

          <div className={styles.statItem}>
            <div className={styles.statIcon}><MessageSquare size={20} /></div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>Instant Link</span>
              <span className={styles.statLabel}>2-Second Setup</span>
            </div>
          </div>

          <div className={styles.statItem}>
            <div className={styles.statIcon}><Headphones size={20} /></div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>Local Billing</span>
              <span className={styles.statLabel}>Paynow Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
