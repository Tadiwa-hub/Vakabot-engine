import React from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  BarChart3, 
  Settings, 
  Zap, 
  BrainCircuit,
  CreditCard,
  ExternalLink
} from 'lucide-react';
import styles from './MainDashboard.module.css';

const MainDashboard = ({ instance, onDisconnect }) => {
  const { user } = useUser();
  const isActive = instance?.isActive ?? true;

  return (
    <div className={styles.layout}>
      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoPill}>V</div>
          <span className={styles.brandName}>Velo AI</span>
        </div>

        <nav className={styles.nav}>
          <button className={`${styles.navItem} ${styles.navItemActive}`}>
            <LayoutDashboard size={18} className={styles.navIcon} />
            <span>Overview</span>
          </button>
          <button className={styles.navItem}>
            <MessageSquare size={18} className={styles.navIcon} />
            <span>Chat History</span>
          </button>
          <button className={styles.navItem}>
            <Users size={18} className={styles.navIcon} />
            <span>Contacts</span>
          </button>
          <button className={styles.navItem}>
            <BarChart3 size={18} className={styles.navIcon} />
            <span>Analytics</span>
          </button>
          <button className={styles.navItem}>
            <Settings size={18} className={styles.navIcon} />
            <span>Settings</span>
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
           <div className={styles.navItem} style={{ cursor: 'default' }}>
              <UserButton afterSignOutUrl="/" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{user?.firstName || 'Account'}</span>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerInfo}>
            <h1>Hello, {user?.firstName || 'Business Owner'}</h1>
            <p>Your AI assistant is synchronized and ready.</p>
          </div>
          
          <div className={`${styles.statusPill} ${isActive ? styles.activeStatus : styles.pausedStatus}`}>
            <div className={styles.statusDot} />
            {isActive ? 'Bot Active' : 'Bot Paused'}
          </div>
        </header>

        {/* Action Cards Grid */}
        <section className={styles.actionGrid}>
          <div className={styles.actionCard}>
            <div className={styles.cardIcon}>
              <BrainCircuit size={24} />
            </div>
            <div className={styles.cardContent}>
              <h3>Train Your AI</h3>
              <p>Upload business documents or text to teach Aura about your brand.</p>
            </div>
          </div>

          <div className={styles.actionCard}>
            <div className={styles.cardIcon}>
              <MessageSquare size={24} />
            </div>
            <div className={styles.cardContent}>
              <h3>Live Chats</h3>
              <p>Monitor real-time interactions and take over conversations manually.</p>
            </div>
          </div>

          <div className={styles.actionCard}>
            <div className={styles.cardIcon}>
              <CreditCard size={24} />
            </div>
            <div className={styles.cardContent}>
              <h3>Subscription</h3>
              <p>View your plan, AI response limits, and local billing details.</p>
            </div>
          </div>
        </section>

        {/* Instance Info Footer (Minimal) */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
             <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.05em' }}>Connected Instance</p>
             <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{instance?.phoneNumber || 'Unknown Number'}</p>
          </div>
          <button onClick={onDisconnect} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
            Disconnect WhatsApp
          </button>
        </div>
      </main>
    </div>
  );
};

export default MainDashboard;
