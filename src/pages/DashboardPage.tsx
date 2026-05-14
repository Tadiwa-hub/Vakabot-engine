import { useEffect, useState } from "react";
import { useUser, UserButton } from "@clerk/clerk-react";
import authStyles from "./Auth.module.css";
import dashStyles from "./Dashboard.module.css";
import { Bot, Zap, Loader2, MessageSquare, CreditCard } from "lucide-react";

const API_BASE = "https://vakabot-backend.zimbabwe.workers.dev/api";

type Tab = 'overview' | 'auto-replies' | 'profile' | 'plans' | 'admin';

const ADMIN_ID = 'user_3DIOS7jr8olpHz10a4aZLIWwhuh';

export default function DashboardPage() {
  const { user } = useUser();
  const [instance, setInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  
  useEffect(() => {
    console.log("Current Tab:", activeTab);
  }, [activeTab]);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [newReply, setNewReply] = useState("");
  const [addingRule, setAddingRule] = useState(false);
  
  // Business Profile State
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [hours, setHours] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [plan, setPlan] = useState<any>(null);
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const [pairingCode, setPairingCode] = useState("");
  const [fetchingCode, setFetchingCode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Payment States
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'ecocash' | 'onemoney'>('ecocash');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [paymentError, setPaymentError] = useState("");

  // Admin States
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminSearch, setAdminSearch] = useState("");

  const plansList = [
    { id: 'free', name: 'Free Starter', price: 0, aiLimit: 20, features: ['20 AI Messages/mo', 'Basic Auto-Replies', 'Community Support'] },
    { id: 'mini', name: 'Mini Biz', price: 10, aiLimit: 100, features: ['100 AI Messages/mo', 'Unlimited Auto-Replies', 'Email Support'] },
    { id: 'basic', name: 'Basic Business', price: 15, aiLimit: 500, features: ['500 AI Messages/mo', 'Priority Email Support', 'Business Profile'] },
    { id: 'growth', name: 'Growth', price: 25, aiLimit: 1500, features: ['1,500 AI Messages/mo', 'WhatsApp Webhook', 'Priority Support'] },
    { id: 'pro', name: 'Pro Agency', price: 45, aiLimit: 5000, features: ['5,000 AI Messages/mo', 'Custom AI Personality', 'All Premium Features'] },
  ];

  // Fetch Instance Data
  useEffect(() => {
    if (user) fetchInstance();
  }, [user]);

  // Polling for QR / Status / Usage updates
  useEffect(() => {
    if (instance) {
      // Poll faster if not connected, slower if connected to save resources
      const intervalTime = instance.status === "CONNECTED" ? 10000 : 5000;
      const interval = setInterval(fetchInstance, intervalTime);
      return () => clearInterval(interval);
    }
  }, [instance?.status]);

  // Pairing Code Countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);
  const [profileLoaded, setProfileLoaded] = useState(false);

  async function fetchInstance() {
    try {
      const res = await fetch(`${API_BASE}/instance/${user?.id}`);
      const data = await res.json();
      setInstance(data.instance);
      
      // Only populate profile fields on first load to avoid overwriting user input
      if (data.user) {
        if (!profileLoaded) {
          setBusinessName(data.user.businessName || "");
          setBusinessType(data.user.businessType || "");
          setLocation(data.user.location || "");
          setHours(data.user.hours || "");
          setOwnerName(data.user.ownerName || "");
          setAiInstructions(data.user.aiInstructions || "");
          setProfileLoaded(true);
        }
        setAiUsageCount(data.user.aiUsageCount || 0);
      }
      if (data.plan) {
        setPlan(data.plan);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleGetPairingCode() {
    setFetchingCode(true);
    try {
      const res = await fetch(`${API_BASE}/instance/${user?.id}/pairing-code`);
      const data = await res.json();
      if (data.code) {
        setPairingCode(data.code);
        setTimeLeft(60); // Reset timer to 60s
      } else if (data.error) {
        alert(data.error);
      } else {
        alert("Failed to get code. Try again.");
      }
    } catch (e) {
      alert("Error fetching code.");
    } finally {
      setFetchingCode(false);
    }
  }

  async function handleRefreshCode() {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/instance/${user?.id}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: instance?.phoneNumber })
      });
      const data = await res.json();
      setInstance(data);
      if (data.pairingCode) {
        setPairingCode(data.pairingCode);
        setTimeLeft(60);
      } else {
        alert("Instance refreshed. Fetching new code...");
        handleGetPairingCode();
      }
    } catch (e) {
      alert("Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleInitiatePayment() {
    if (!paymentPhone) return alert("Enter EcoCash/OneMoney number");
    setPaymentStatus('pending');
    setPaymentError("");

    try {
      const res = await fetch(`${API_BASE}/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          planId: selectedPlan.id,
          amount: selectedPlan.price,
          phone: paymentPhone,
          method: paymentMethod
        })
      });
      const data = await res.json();
      if (data.success) {
        // Start polling
        const interval = setInterval(() => checkStatus(data.paymentId), 5000);
        (window as any).paymentInterval = interval;
      } else {
        setPaymentStatus('error');
        setPaymentError(data.error);
      }
    } catch (e) {
      setPaymentStatus('error');
      setPaymentError("Network error. Try again.");
    }
  }

  async function checkStatus(id: string) {
    try {
      const res = await fetch(`${API_BASE}/payment/check/${id}`);
      const data = await res.json();
      if (data.status === 'PAID') {
        setPaymentStatus('success');
        clearInterval((window as any).paymentInterval);
        setTimeout(() => {
          setPaymentStatus('idle');
          setSelectedPlan(null);
          fetchInstance(); // Refresh plan data
        }, 3000);
      } else if (data.status === 'Error' || data.status === 'Cancelled') {
        setPaymentStatus('error');
        setPaymentError("Payment was cancelled or failed.");
        clearInterval((window as any).paymentInterval);
      }
    } catch (e) {
      console.error("Poll error:", e);
    }
  }

  useEffect(() => {
    return () => {
      if ((window as any).paymentInterval) clearInterval((window as any).paymentInterval);
    };
  }, []);

  // Remove the old loadProfile effect since we now get everything in fetchInstance
  useEffect(() => {
    if (user) fetchInstance();
  }, [user]);

  async function handleCreate() {
    if (!phoneNumber) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/instance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: user?.id, 
          phoneNumber,
          email: user?.primaryEmailAddress?.emailAddress 
        }),
      });
      const data = await res.json();
      setInstance(data);
    } catch (e) {
      alert("Creation failed.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect? You will need to re-pair your phone to reconnect.")) return;
    setDisconnecting(true);
    try {
      await fetch(`${API_BASE}/instance/${user?.id}/disconnect`, { method: "POST" });
      setInstance(null);
      setActiveTab('overview');
    } catch (e) {
      alert("Failed to disconnect.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleToggleBot() {
    if (!instance) return;
    setToggling(true);
    try {
      const res = await fetch(`${API_BASE}/instance/${user?.id}/toggle`, { method: "POST" });
      const data = await res.json();
      setInstance({ ...instance, isActive: data.isActive });
    } catch (e) {
      alert("Failed to toggle bot status.");
    } finally {
      setToggling(false);
    }
  }

  async function fetchRules() {
    try {
      const res = await fetch(`${API_BASE}/auto-replies/${user?.id}`);
      const data = await res.json();
      setRules(data.rules || []);
    } catch (e) {
      console.error("Fetch rules error:", e);
    }
  }

  async function handleAddRule() {
    if (!newKeyword || !newReply) return;
    setAddingRule(true);
    try {
      const res = await fetch(`${API_BASE}/auto-replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, keyword: newKeyword, replyText: newReply }),
      });
      const data = await res.json();
      setRules([...rules, data.rule]);
      setNewKeyword("");
      setNewReply("");
    } catch (e) {
      alert("Failed to add rule.");
    } finally {
      setAddingRule(false);
    }
  }

  async function handleDeleteRule(id: string) {
    try {
      await fetch(`${API_BASE}/auto-replies/${id}`, { method: "DELETE" });
      setRules(rules.filter(r => r.id !== id));
    } catch (e) {
      alert("Failed to delete rule.");
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      await fetch(`${API_BASE}/user/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          businessName,
          businessType,
          location,
          hours,
          ownerName,
          aiInstructions
        }),
      });
      alert("Profile updated successfully!");
    } catch (e) {
      alert("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  // Fetch data when switching tabs
  useEffect(() => {
    if (!user) return;
    
    if (activeTab === 'auto-replies') fetchRules();
    if (activeTab === 'admin') fetchAdminData();
  }, [activeTab, user]);

  async function fetchAdminData() {
    if (user?.id !== ADMIN_ID) return;
    try {
      const headers = { 'x-user-id': user.id };
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/admin/stats`, { headers }),
        fetch(`${API_BASE}/admin/users`, { headers })
      ]);
      const stats = await statsRes.json();
      const usersData = await usersRes.json();
      setAdminStats(stats);
      setAdminUsers(usersData.users || []);
    } catch (e) {
      console.error("Admin fetch error:", e);
    }
  }

  // --- ADMIN ACTIONS ---
  async function adminAction(action: string, targetUserId: string, extra = {}) {
    if (user?.id !== ADMIN_ID) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${targetUserId}/${action}`, {
        method: "POST",
        headers: { 'x-user-id': user.id, 'Content-Type': 'application/json' },
        body: JSON.stringify(extra)
      });
      if (res.ok) fetchAdminData();
      else alert("Action failed");
    } catch (e) {
      alert("Error performing action");
    }
  }

  useEffect(() => {
    if (activeTab === 'admin') fetchAdminData();
  }, [activeTab]);

  if (loading) return (
    <div className={authStyles.page}>
      <Loader2 className={authStyles.spinner} size={40} style={{ color: 'var(--primary)' }} />
    </div>
  );

  return (
    <div className={dashStyles.layout}>
      {/* Sidebar Navigation */}
      <aside className={dashStyles.sidebar}>
        <div className={dashStyles.brand}>
          <div className={dashStyles.logo}>V</div>
          <span className={dashStyles.brandName}>VakaBot</span>
        </div>
        
        <nav className={dashStyles.nav}>
          <button 
            className={`${dashStyles.navItem} ${activeTab === 'overview' ? dashStyles.active : ''}`}
            onClick={() => setActiveTab('overview')}
            disabled={!instance || instance.status !== "CONNECTED"}
          >
            <Zap size={18} /> Overview
          </button>
          <button 
            className={`${dashStyles.navItem} ${activeTab === 'auto-replies' ? dashStyles.active : ''}`}
            onClick={() => setActiveTab('auto-replies')}
            disabled={!instance || instance.status !== "CONNECTED"}
          >
            <MessageSquare size={18} /> Auto Replies
          </button>
          <button 
            className={`${dashStyles.navItem} ${activeTab === 'profile' ? dashStyles.active : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <Bot size={18} /> Business & AI
          </button>
          <button 
            className={`${dashStyles.navItem} ${activeTab === 'plans' ? dashStyles.active : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            <CreditCard size={18} /> Subscription
          </button>
          {user?.id === ADMIN_ID && (
            <button 
              className={`${dashStyles.navItem} ${activeTab === 'admin' ? dashStyles.active : ''}`}
              onClick={() => setActiveTab('admin')}
              style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem', color: '#f59e0b' }}
            >
              <Zap size={18} /> Admin Portal
            </button>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={dashStyles.main}>
        {/* Header */}
        <header className={dashStyles.header}>
          <div className={dashStyles.headerTitle}>
            {(!instance || instance.status !== "CONNECTED") 
              ? "Engine Setup" 
              : activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            {user?.id === ADMIN_ID && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={dashStyles.mobileAdminBtn}
                style={{ 
                  background: 'rgba(245,158,11,0.1)', 
                  color: '#f59e0b', 
                  border: '1px solid rgba(245,158,11,0.2)', 
                  padding: '0.5rem', 
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <Zap size={18} />
              </button>
            )}
            {instance?.status === "CONNECTED" && (
              <div className={dashStyles.statusBadge} style={{ display: window.innerWidth < 600 ? 'none' : 'inline-flex' }}>
                <div className={dashStyles.statusDot} />
                Engine Live
              </div>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* Scrollable Content */}
        <div className={dashStyles.content}>
          {(!instance || instance.status !== "CONNECTED") ? (
            /* =========================================
               SETUP & PAIRING FLOW (Centered)
               ========================================= */
            <div className={dashStyles.setupContainer}>
              <div className={authStyles.card} style={{ maxWidth: '500px', width: '100%', margin: '0 auto' }}>
                {!instance ? (
                  <div className="animate-in">
                    <h1 className={authStyles.title}>Initialize Engine</h1>
                    <p className={authStyles.subtitle}>Enter your WhatsApp number to start your VakaBot instance.</p>
                    
                    <div className={authStyles.form}>
                      <div className={authStyles.field}>
                        <label className={authStyles.label}>WhatsApp Number</label>
                        <input 
                          className={authStyles.input}
                          placeholder="+263 7..."
                          value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value)}
                        />
                      </div>
                      <button 
                        className={authStyles.btn} 
                        onClick={handleCreate}
                        disabled={creating || !phoneNumber}
                      >
                        {creating ? "Provisioning..." : "Start Engine"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="animate-in" style={{ textAlign: 'center' }}>
                    {instance.status === "CONNECTING" ? (
                      <div style={{ padding: '2rem 0' }}>
                        <Loader2 className={authStyles.spinner} size={48} style={{ color: 'var(--primary)', margin: '0 auto 1.5rem' }} />
                        <h1 className={authStyles.title}>Linking...</h1>
                        <p className={authStyles.subtitle}>Finalizing connection with your WhatsApp. This usually takes 5-10 seconds.</p>
                      </div>
                    ) : (
                      <>
                        <h1 className={authStyles.title}>Pairing Required</h1>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                          <p style={{ color: '#8b949e', fontSize: '0.9rem' }}>
                            Follow the instructions below to link your WhatsApp.
                          </p>
                        </div>

                        <div style={{ margin: '0 0 1.5rem 0', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', border: '1px dashed rgba(255,255,255,0.2)' }}>
                          {fetchingCode ? (
                            <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Loader2 className={authStyles.spinner} color="white" />
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', width: '100%' }}>
                              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                                ⚠️ Ensure the number below matches your WhatsApp number exactly!
                              </p>
                              <p style={{ color: '#8b949e', fontSize: '0.8rem', marginBottom: '0.8rem' }}>Pairing Code for <strong>{instance?.phoneNumber}</strong>:</p>
                              <div style={{ 
                                fontSize: '2rem', 
                                fontWeight: '800', 
                                letterSpacing: '2px', 
                                color: 'var(--primary)',
                                background: 'rgba(0,0,0,0.2)',
                                padding: '1rem',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                wordBreak: 'break-all'
                              }}>
                                {pairingCode || "---- ----"}
                              </div>
                              
                              {timeLeft > 0 ? (
                                <div style={{ marginBottom: '1rem' }}>
                                  <div className={dashStyles.progressBarWrapper}>
                                    <div 
                                      className={dashStyles.progressBar} 
                                      style={{ width: `${(timeLeft / 60) * 100}%`, background: timeLeft < 15 ? '#ef4444' : 'var(--primary)' }} 
                                    />
                                  </div>
                                  <p style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: '0.5rem' }}>
                                    Code expires in {timeLeft}s
                                  </p>
                                </div>
                              ) : pairingCode && (
                                <p style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: '1rem' }}>
                                  Code expired. Please refresh.
                                </p>
                              )}

                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                {pairingCode && timeLeft > 0 && (
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(pairingCode);
                                      alert("Code copied!");
                                    }}
                                    className={dashStyles.btn}
                                    style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
                                  >
                                    Copy Code
                                  </button>
                                )}
                                <button 
                                  onClick={handleRefreshCode}
                                  disabled={refreshing}
                                  className={`${dashStyles.btn} ${dashStyles.btnOutline}`}
                                  style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
                                >
                                  {refreshing ? "Refreshing..." : (timeLeft === 0 ? "Get New Code" : "Refresh")}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ marginBottom: '0.8rem', color: 'white', fontWeight: '600', fontSize: '0.95rem' }}>
                            Link with Phone Number
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', color: '#8b949e', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', color: 'white' }}>1</div>
                              <p>Open <strong>WhatsApp</strong> and go to <strong>Linked Devices</strong></p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', color: 'white' }}>2</div>
                              <p>Tap <strong>Link a Device</strong> then <strong>"Link with phone number instead"</strong> at the bottom</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', color: 'white' }}>3</div>
                              <p>Enter the 8-digit code shown above on your phone</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* =========================================
               DASHBOARD TABS
               ========================================= */
            <div className={dashStyles.animateIn}>
              {activeTab === 'overview' && (
                <div className={dashStyles.animateIn}>
                  {/* Welcome Banner */}
                  <div className={dashStyles.welcomeBanner}>
                    <div>
                      <h2 style={{ fontWeight: '800', fontSize: '1.3rem', margin: 0, letterSpacing: '-0.02em' }}>
                        Welcome back, {user?.firstName || 'Business Owner'} 👋
                      </h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.4rem 0 0' }}>
                        Your VakaBot engine is {instance.isActive ? 'running smoothly' : 'currently paused'}.
                      </p>
                    </div>
                    <div className={dashStyles.statusBadge} style={{ 
                      whiteSpace: 'nowrap',
                      background: instance.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      borderColor: instance.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: instance.isActive ? '#10b981' : '#ef4444'
                    }}>
                      <div className={dashStyles.statusDot} style={{ 
                        background: instance.isActive ? '#10b981' : '#ef4444', 
                        boxShadow: `0 0 8px ${instance.isActive ? '#10b981' : '#ef4444'}` 
                      }} />
                      {instance.isActive ? "Online" : "Paused"}
                    </div>
                  </div>

                  {/* Stat Cards */}
                  <div className={dashStyles.statGrid}>
                    <div className={dashStyles.statCard}>
                      <div className={dashStyles.statLabel}>Total Responses</div>
                      <div className={dashStyles.statValue}>{aiUsageCount}</div>
                      <div className={dashStyles.statSub}>Lifetime automated replies</div>
                      <div className={dashStyles.statIcon} style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary)' }}>
                        <MessageSquare size={16} />
                      </div>
                    </div>
                    <div className={dashStyles.statCard}>
                      <div className={dashStyles.statLabel}>Current Plan</div>
                      <div className={dashStyles.statValue} style={{ fontSize: '1.2rem', textTransform: 'capitalize' }}>
                        {plan?.name || 'Free Starter'}
                      </div>
                      <div className={dashStyles.statSub}>{plan?.aiResponsesLimit || 20} monthly limit</div>
                      <div className={dashStyles.statIcon} style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--accent)' }}>
                        <CreditCard size={16} />
                      </div>
                    </div>
                    <div className={dashStyles.statCard}>
                      <div className={dashStyles.statLabel}>Bot Status</div>
                      <div className={dashStyles.statValue} style={{ fontSize: '1.2rem', color: instance.isActive ? 'var(--success)' : 'var(--danger)' }}>
                        {instance.isActive ? 'Active' : 'Paused'}
                      </div>
                      <button 
                        onClick={handleToggleBot}
                        disabled={toggling}
                        className={dashStyles.btn}
                        style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', marginTop: '0.5rem', width: '100%' }}
                      >
                        {toggling ? '...' : (instance.isActive ? 'Pause' : 'Resume')}
                      </button>
                    </div>
                  </div>

                  <div className={dashStyles.section}>
                    <h3 className={dashStyles.sectionTitle}><Zap size={18} color="var(--primary)" /> Usage Tracking</h3>
                    <div className={dashStyles.usageContainer}>
                      <div className={dashStyles.usageRingWrapper}>
                        <svg className={dashStyles.usageRing} viewBox="0 0 120 120">
                          <circle className={dashStyles.usageRingBg} cx="60" cy="60" r="50" />
                          <circle 
                            className={dashStyles.usageRingProgress} 
                            cx="60" cy="60" r="50" 
                            style={{ 
                              stroke: aiUsageCount / (plan?.aiResponsesLimit || 20) > 0.8 ? 'var(--danger)' : 'var(--primary)',
                              strokeDasharray: `${2 * Math.PI * 50}`,
                              strokeDashoffset: `${2 * Math.PI * 50 * (1 - Math.min(aiUsageCount / (plan?.aiResponsesLimit || 20), 1))}`
                            }}
                          />
                        </svg>
                        <div className={dashStyles.usageText}>
                          <span className={dashStyles.usageCount}>{aiUsageCount}</span>
                          <span className={dashStyles.usageTotal}>/ {plan?.aiResponsesLimit || 20}</span>
                        </div>
                      </div>
                      <div className={dashStyles.usageInfo}>
                        <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Monthly AI Quota</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          You have used <strong>{Math.round((aiUsageCount / (plan?.aiResponsesLimit || 20)) * 100)}%</strong> of your monthly automated response limit.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'auto-replies' && (
                <div className={dashStyles.animateIn}>
                  <div className={dashStyles.section}>
                    <h2 className={dashStyles.sectionTitle}><MessageSquare size={16} /> Auto-Reply Rules</h2>
                    <p className={dashStyles.sectionDesc} style={{ marginBottom: '1.25rem' }}>
                      When a customer sends a keyword, VakaBot replies instantly.
                    </p>
                   
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                      <div className={dashStyles.formGrid}>
                        <div className={authStyles.field} style={{ marginBottom: 0 }}>
                          <label className={authStyles.label} style={{ fontSize: '0.75rem' }}>Keyword</label>
                          <input className={dashStyles.input} style={{ margin: 0 }} placeholder="e.g. hello" value={newKeyword} onChange={e => setNewKeyword(e.target.value)} />
                        </div>
                        <div className={authStyles.field} style={{ marginBottom: 0 }}>
                          <label className={authStyles.label} style={{ fontSize: '0.75rem' }}>Response</label>
                          <input className={dashStyles.input} style={{ margin: 0 }} placeholder="What the bot should say" value={newReply} onChange={e => setNewReply(e.target.value)} />
                        </div>
                        <button className={dashStyles.btn} onClick={handleAddRule} disabled={addingRule || !newKeyword || !newReply}>
                          {addingRule ? "..." : "Add Rule"}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {rules.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No auto-replies configured yet.</p>
                        </div>
                      ) : (
                        rules.map(rule => (
                          <div key={rule.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.85rem' }}>
                              <span style={{ color: 'var(--primary)', fontWeight: '700', marginRight: '0.75rem' }}>IF "{rule.keyword.toUpperCase()}"</span>
                              <span style={{ color: 'var(--text-muted)' }}>→ {rule.replyText}</span>
                            </div>
                            <button onClick={() => handleDeleteRule(rule.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Delete</button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'plans' && (
                <div className={dashStyles.animateIn}>
                <div className={dashStyles.section}>
                  <h2 className={dashStyles.sectionTitle}><CreditCard size={16} color="var(--primary)" /> Subscription Plans</h2>
                  <p className={dashStyles.sectionDesc} style={{ marginBottom: '1rem' }}>Choose the plan that fits your business. Upgrade anytime.</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    {plansList.map(p => (
                      <div key={p.id} style={{ 
                        padding: '1.5rem', 
                        background: p.id === 'pro' ? 'rgba(14, 165, 233, 0.05)' : 'var(--bg-card)', 
                        borderRadius: '14px', 
                        border: plan?.id === p.id 
                          ? '2px solid var(--primary)' 
                          : p.id === 'pro' 
                            ? '1px solid rgba(14, 165, 233, 0.25)' 
                            : '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.25s ease',
                        position: 'relative'
                      }}>
                        {plan?.id === p.id && <span style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'var(--primary)', color: 'white', fontSize: '0.65rem', padding: '0.3rem 0.7rem', borderRadius: '20px', fontWeight: '800' }}>ACTIVE</span>}
                        {p.id === 'pro' && !plan?.id && <span style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)', color: 'white', fontSize: '0.75rem', padding: '0.4rem 1rem', borderRadius: '12px', fontWeight: '900', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.4)' }}>RECOMMENDED</span>}
                        
                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.35rem' }}>{p.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.15rem', marginBottom: '1.25rem' }}>
                          <span style={{ fontSize: '1.6rem', fontWeight: '800' }}>${p.price}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>/mo</span>
                        </div>
                        
                        <div style={{ flex: 1, marginBottom: '1.25rem' }}>
                          {p.features.map((f, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              <Zap size={12} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} /> {f}
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => p.price > 0 && setSelectedPlan(p)}
                          className={dashStyles.btn}
                          style={{ 
                            width: '100%', 
                            background: plan?.id === p.id ? 'rgba(255,255,255,0.05)' : undefined,
                            border: plan?.id === p.id ? '1px solid var(--border)' : undefined,
                            color: plan?.id === p.id ? 'var(--text-muted)' : undefined
                          }}
                          disabled={plan?.id === p.id || p.price === 0}
                        >
                          {plan?.id === p.id ? "Current Plan" : p.price === 0 ? "Free Starter" : "Upgrade Now"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                </div>
              )}
              {activeTab === 'profile' && (
                <div className={dashStyles.animateIn}>
                <div className={dashStyles.section}>
                  <h2 className={dashStyles.sectionTitle}><Bot size={16} /> Business Profile & AI Context</h2>
                  <p className={dashStyles.sectionDesc} style={{ marginBottom: '1rem' }}>
                    Tell the AI about your business. It uses this to answer customer questions.
                  </p>
                  
                  <div className={`${authStyles.form} ${dashStyles.formGrid}`} style={{ marginTop: '1.5rem' }}>
                    <div className={authStyles.field}>
                      <label className={authStyles.label}>Business Name</label>
                      <input 
                        className={dashStyles.input} 
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        placeholder="e.g. Klintech Solutions"
                      />
                    </div>
                    <div className={authStyles.field}>
                      <label className={authStyles.label}>Business Type</label>
                      <select 
                        className={dashStyles.input}
                        value={businessType}
                        onChange={e => setBusinessType(e.target.value)}
                        style={{ color: 'white', background: 'rgba(0,0,0,0.2)' }}
                      >
                        <option value="">Select type...</option>
                        <option value="Retail">Retail</option>
                        <option value="Service Provider">Service Provider</option>
                        <option value="Restaurant">Restaurant</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="E-commerce">E-commerce</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className={authStyles.field}>
                      <label className={authStyles.label}>Location</label>
                      <input 
                        className={dashStyles.input} 
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        placeholder="e.g. 123 Main St, Harare"
                      />
                    </div>
                    <div className={authStyles.field}>
                      <label className={authStyles.label}>Business Hours</label>
                      <input 
                        className={dashStyles.input} 
                        value={hours}
                        onChange={e => setHours(e.target.value)}
                        placeholder="e.g. Mon-Fri 8am-5pm"
                      />
                    </div>
                    <div className={authStyles.field}>
                      <label className={authStyles.label}>Owner/Contact Name</label>
                      <input 
                        className={dashStyles.input} 
                        value={ownerName}
                        onChange={e => setOwnerName(e.target.value)}
                        placeholder="Who to connect to if AI fails?"
                      />
                    </div>
                    <div className={authStyles.field} style={{ gridColumn: '1 / -1' }}>
                      <label className={authStyles.label}>Custom AI Instructions</label>
                      <textarea 
                        className={dashStyles.input}
                        style={{ minHeight: '100px', paddingTop: '0.5rem' }}
                        value={aiInstructions}
                        onChange={e => setAiInstructions(e.target.value)}
                        placeholder="e.g. Always be polite. Mention that we have a 10% discount this month."
                      />
                    </div>
                    <button 
                      className={dashStyles.btn} 
                      style={{ gridColumn: '1 / -1' }}
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                    >
                      {savingProfile ? "Saving..." : "Save Business Profile"}
                    </button>
                  </div>

                  <div style={{ marginTop: '3rem', padding: '1.25rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px' }}>
                    <h3 style={{ fontSize: '1rem', color: '#ef4444', marginBottom: '0.5rem', fontWeight: 700 }}>Danger Zone</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>Disconnecting will stop all automated replies and require re-pairing your phone.</p>
                    <button 
                      className={dashStyles.btn} 
                      style={{ background: '#ef4444', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)', width: 'auto' }}
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                    >
                      {disconnecting ? "Disconnecting..." : "Disconnect WhatsApp Engine"}
                    </button>
                  </div>
                </div>
              )}
                </div>
                </div>
              )}

              {activeTab === 'admin' && user?.id === ADMIN_ID && (
                <div className={dashStyles.animateIn}>
                  <div className={dashStyles.section}>
                    <h2 className={dashStyles.sectionTitle} style={{ color: '#f59e0b' }}><Zap size={16} /> Platform Overview</h2>
                    <p className={dashStyles.sectionDesc}>Master control for VakaBot SaaS.</p>
                    
                    <div className={dashStyles.statGrid} style={{ marginTop: '1.5rem' }}>
                      <div className={dashStyles.statCard}>
                        <div className={dashStyles.statLabel}>Total Users</div>
                        <div className={dashStyles.statValue}>{adminStats?.totalUsers || 0}</div>
                      </div>
                      <div className={dashStyles.statCard}>
                        <div className={dashStyles.statLabel}>Active Engines</div>
                        <div className={dashStyles.statValue} style={{ color: '#10b981' }}>{adminStats?.activeInstances || 0}</div>
                      </div>
                      <div className={dashStyles.statCard}>
                        <div className={dashStyles.statLabel}>Total AI Messages</div>
                        <div className={dashStyles.statValue}>{adminStats?.totalAiUsage || 0}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', marginBottom: '1.5rem' }}>
                      <h3 className={dashStyles.sectionTitle} style={{ margin: 0 }}>Manage Users</h3>
                      <input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', fontSize: '0.85rem', width: '250px' }}
                      />
                    </div>

                    <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '1rem' }}>Business / User</th>
                            <th style={{ padding: '1rem' }}>Plan</th>
                            <th style={{ padding: '1rem' }}>Usage</th>
                            <th style={{ padding: '1rem' }}>Status</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminUsers
                            .filter(u => !adminSearch || u.email?.toLowerCase().includes(adminSearch.toLowerCase()) || u.businessName?.toLowerCase().includes(adminSearch.toLowerCase()))
                            .map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ fontWeight: 600 }}>{u.businessName || 'Unnamed Biz'}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <select 
                                  value={u.planId || 'free'} 
                                  onChange={(e) => adminAction('update-plan', u.id, { planId: e.target.value })}
                                  style={{ background: 'transparent', color: 'white', border: 'none', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}
                                >
                                  <option value="free">FREE</option>
                                  <option value="mini">MINI</option>
                                  <option value="pro">PRO</option>
                                  <option value="enterprise">ULTRA</option>
                                </select>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {u.aiUsage || 0}
                                  <button onClick={() => adminAction('reset-usage', u.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }} title="Reset Usage"><Zap size={12} /></button>
                                </div>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <span style={{ 
                                  padding: '0.2rem 0.4rem', 
                                  borderRadius: '4px', 
                                  fontSize: '0.65rem', 
                                  fontWeight: 700,
                                  background: u.status === 'CONNECTED' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                  color: u.status === 'CONNECTED' ? '#10b981' : '#ef4444'
                                }}>
                                  {u.status || 'OFFLINE'}
                                </span>
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  <button 
                                    onClick={() => adminAction('toggle-bot', u.id)}
                                    style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', cursor: 'pointer' }}
                                    title="Toggle Instance Activity"
                                  >
                                    <Bot size={14} />
                                  </button>
                                  <button 
                                    onClick={() => { if(confirm(`Delete instance ${u.instanceName}?`)) adminAction('toggle-bot', u.id) }} 
                                    style={{ padding: '0.4rem', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }}
                                    title="Hard Reset"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      {/* Payment Modal */}
      {selectedPlan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '2rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Upgrade to {selectedPlan.name}</h3>
            <p style={{ color: '#8b949e', marginBottom: '1.5rem' }}>Total: <strong>${selectedPlan.price}.00</strong></p>

            {paymentStatus === 'idle' && (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <button 
                    onClick={() => setPaymentMethod('ecocash')}
                    style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: paymentMethod === 'ecocash' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentMethod === 'ecocash' ? 'rgba(14,165,233,0.1)' : 'transparent', color: 'white', cursor: 'pointer' }}
                  >
                    EcoCash
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('onemoney')}
                    style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: paymentMethod === 'onemoney' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentMethod === 'onemoney' ? 'rgba(14,165,233,0.1)' : 'transparent', color: 'white', cursor: 'pointer' }}
                  >
                    OneMoney
                  </button>
                </div>

                <div className={authStyles.field} style={{ marginBottom: '1.5rem' }}>
                  <label className={authStyles.label}>Mobile Number</label>
                  <input 
                    className={dashStyles.input}
                    value={paymentPhone}
                    onChange={e => setPaymentPhone(e.target.value)}
                    placeholder="e.g. 0777123456"
                  />
                </div>

                <button className={dashStyles.btn} style={{ width: '100%', justifyContent: 'center' }} onClick={handleInitiatePayment}>
                  Pay with Paynow
                </button>
                <button 
                  onClick={() => setSelectedPlan(null)}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#8b949e', marginTop: '1rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </>
            )}

            {paymentStatus === 'pending' && (
              <div style={{ padding: '2rem 0' }}>
                <div style={{ width: '50px', height: '50px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }}></div>
                <h4 style={{ marginBottom: '0.5rem' }}>Waiting for Payment...</h4>
                <p style={{ color: '#8b949e', fontSize: '0.9rem' }}>Please check your phone for the EcoCash/OneMoney prompt.</p>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div style={{ padding: '2rem 0' }}>
                <div style={{ width: '60px', height: '60px', background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'white', fontSize: '2rem' }}>✓</div>
                <h4 style={{ marginBottom: '0.5rem' }}>Payment Successful!</h4>
                <p style={{ color: '#8b949e', fontSize: '0.9rem' }}>Welcome to {selectedPlan.name}. Your account is being updated.</p>
              </div>
            )}

            {paymentStatus === 'error' && (
              <div style={{ padding: '2rem 0' }}>
                <div style={{ width: '60px', height: '60px', background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'white', fontSize: '2rem' }}>!</div>
                <h4 style={{ marginBottom: '0.5rem' }}>Payment Failed</h4>
                <p style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{paymentError}</p>
                <button className={dashStyles.btn} onClick={() => setPaymentStatus('idle')}>Try Again</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      {instance?.status === "CONNECTED" && (
        <div className={dashStyles.mobileNav}>
          <button 
            className={`${dashStyles.mobileNavItem} ${activeTab === 'overview' ? dashStyles.active : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Zap size={20} />
            <span>Home</span>
          </button>
          <button 
            className={`${dashStyles.mobileNavItem} ${activeTab === 'auto-replies' ? dashStyles.active : ''}`}
            onClick={() => setActiveTab('auto-replies')}
          >
            <MessageSquare size={20} />
            <span>Replies</span>
          </button>
          <button 
            className={`${dashStyles.mobileNavItem} ${activeTab === 'services' ? dashStyles.active : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <Bot size={20} />
            <span>Services</span>
          </button>
          <button 
            className={`${dashStyles.mobileNavItem} ${activeTab === 'profile' ? dashStyles.active : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <Webhook size={20} />
            <span>Profile</span>
          </button>
          <button 
            className={`${dashStyles.mobileNavItem} ${activeTab === 'plans' ? dashStyles.active : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            <CreditCard size={20} />
            <span>Plans</span>
          </button>
          <button 
            className={`${dashStyles.mobileNavItem} ${activeTab === 'settings' ? dashStyles.active : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </div>
      )}
    </div>
  );
}
