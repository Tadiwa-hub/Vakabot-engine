import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Zap, ShieldCheck, CreditCard, Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import styles from './DocsPage.module.css';

const DocsPage = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      {/* Sidebar / Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoPill}>V</div>
          <span className={styles.brandName}>Velo Docs</span>
        </div>
        
        <nav className={styles.nav}>
          <a href="#quickstart" className={styles.navLink}>Quickstart</a>
          <a href="#takeover" className={styles.navLink}>Human Takeover</a>
          <a href="#ai-logic" className={styles.navLink}>AI Logic</a>
          <a href="#billing" className={styles.navLink}>Local Billing</a>
          <a href="#security" className={styles.navLink}>Security</a>
        </nav>

        <div className={styles.sidebarFooter}>
          <Button onClick={() => navigate('/')} variant="ghost" className={styles.backBtn}>
            <ArrowLeft size={16} />
            Back to Home
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.content}>
        <section id="quickstart" className={styles.section}>
          <div className={styles.iconHeader}><Zap size={24} /></div>
          <h1 className={styles.title}>2-Minute Quickstart</h1>
          <p className={styles.intro}>Get your first intelligent assistant live on WhatsApp in three simple steps.</p>
          
          <div className={styles.step}>
            <h3>1. Connect</h3>
            <p>Enter your business phone number and scan the pairing code. Our engine connects in under 2 seconds.</p>
          </div>
          <div className={styles.step}>
            <h3>2. Train</h3>
            <p>Define your business personality and upload your service details. The AI learns your brand instantly.</p>
          </div>
          <div className={styles.step}>
            <h3>3. Deploy</h3>
            <p>Activate your bot. It will now handle inquiries, sales, and support while you sleep.</p>
          </div>
        </section>

        <hr className={styles.divider} />

        <section id="takeover" className={styles.section}>
          <div className={styles.iconHeader}><ShieldCheck size={24} /></div>
          <h2 className={styles.title}>Human Auto-Takeover</h2>
          <p>Never lose the personal touch. Velo AI detects when you start typing on WhatsApp and automatically pauses itself.</p>
          <div className={styles.featureBox}>
            <p><strong>Auto-Pause:</strong> Bot stops logic the moment a human operator intervenes.</p>
            <p><strong>Seamless Resume:</strong> Hand the conversation back to AI with one click from your dashboard.</p>
          </div>
        </section>

        <section id="ai-logic" className={styles.section}>
          <div className={styles.iconHeader}><BookOpen size={24} /></div>
          <h2 className={styles.title}>Smart AI Logic</h2>
          <p>We use high-speed inference to ensure your customers get answers in milliseconds, not minutes.</p>
          <ul className={styles.list}>
            <li>Professional tone by default.</li>
            <li>Strict adherence to your business rules.</li>
            <li>Fallback to human operator for complex queries.</li>
          </ul>
        </section>

        <section id="billing" className={styles.section}>
          <div className={styles.iconHeader}><CreditCard size={24} /></div>
          <h2 className={styles.title}>Local Zimbabwean Billing</h2>
          <p>Integrated with Paynow for seamless local payments. No need for international cards.</p>
          <div className={styles.billingGrid}>
            <div className={styles.planCard}>
              <h4>Free Tier</h4>
              <p>20 AI Responses / mo</p>
            </div>
            <div className={styles.planCard}>
              <h4>Pro Tier</h4>
              <p>Unlimited AI Logic</p>
            </div>
          </div>
        </section>

        <section id="security" className={styles.section}>
          <div className={styles.iconHeader}><Lock size={24} /></div>
          <h2 className={styles.title}>Security & Safety</h2>
          <p>Your data and WhatsApp connection are handled with industry-standard encryption.</p>
          <p className={styles.smallText}>We utilize the Evolution API for stable, official-like Baileys connections to minimize ban risks.</p>
        </section>
      </main>
    </div>
  );
};

export default DocsPage;
