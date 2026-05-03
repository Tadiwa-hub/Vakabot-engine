import { useEffect, useState } from "react";
import { useUser, UserButton } from "@clerk/clerk-react";
import authStyles from "./Auth.module.css";
import dashStyles from "./Dashboard.module.css";
import { Bot, Zap, Loader2, QrCode, CheckCircle2, MessageSquare, Webhook, Settings } from "lucide-react";

const API_BASE = "https://vakabot-backend.zimbabwe.workers.dev/api";
const WEBHOOK_URL = "https://vakabot-backend.zimbabwe.workers.dev/webhook/evolution";

type Tab = 'overview' | 'auto-replies' | 'webhooks' | 'settings';

export default function DashboardPage() {
  const { user } = useUser();
  const [instance, setInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [newReply, setNewReply] = useState("");
  const [addingRule, setAddingRule] = useState(false);

  // Fetch Instance Data
  useEffect(() => {
    if (user) fetchInstance();
  }, [user]);

  // Polling for QR / Status update
  useEffect(() => {
    if (instance && instance.status !== "CONNECTED") {
      const interval = setInterval(fetchInstance, 5000);
      return () => clearInterval(interval);
    }
  }, [instance]);

  async function fetchInstance() {
    try {
      const res = await fetch(`${API_BASE}/instance/${user?.id}`);
      const data = await res.json();
      setInstance(data.instance);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

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

  // Effect to populate webhookUrl when instance loads
  useEffect(() => {
    if (instance?.webhookUrl && !webhookUrl) {
      setWebhookUrl(instance.webhookUrl);
    }
  }, [instance?.webhookUrl]);

  async function handleSaveWebhook() {
    if (!webhookUrl) return;
    setSavingWebhook(true);
    try {
      await fetch(`${API_BASE}/webhook/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, webhookUrl }),
      });
      alert("Webhook saved and activated on the Engine!");
    } catch (e) {
      alert("Failed to save webhook.");
    } finally {
      setSavingWebhook(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect? You will need to scan a new QR code to reconnect.")) return;
    setDisconnecting(true);
    try {
      await fetch(`${API_BASE}/instance/${user?.id}/disconnect`, { method: "POST" });
      setInstance({ ...instance, status: "DISCONNECTED", qrcode: null });
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

  // Fetch rules when switching to that tab
  useEffect(() => {
    if (activeTab === 'auto-replies' && user) {
      fetchRules();
    }
  }, [activeTab, user]);

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
            className={`${dashStyles.navItem} ${activeTab === 'webhooks' ? dashStyles.active : ''}`}
            onClick={() => setActiveTab('webhooks')}
            disabled={!instance || instance.status !== "CONNECTED"}
          >
            <Webhook size={18} /> Webhooks
          </button>
          <button 
            className={`${dashStyles.navItem} ${activeTab === 'settings' ? dashStyles.active : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} /> Settings
          </button>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {instance?.status === "CONNECTED" && (
              <div className={dashStyles.statusBadge}>
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
                        <p className={authStyles.subtitle}>Scan the QR code with your WhatsApp app.</p>
                        
                        <div style={{ margin: '1.5rem 0', padding: '1rem', background: 'white', borderRadius: '16px', display: 'inline-block' }}>
                          {instance.qrcode ? (
                            <img src={instance.qrcode} alt="QR Code" style={{ width: '220px', height: '220px' }} />
                          ) : (
                            <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Loader2 className={authStyles.spinner} color="black" />
                            </div>
                          )}
                        </div>

                        <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem', textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                          <p style={{ marginBottom: '0.5rem', color: 'white', fontWeight: '600' }}>Instructions:</p>
                          <p>1. Open WhatsApp on your phone</p>
                          <p>2. Tap Menu or Settings {'>'} Linked Devices</p>
                          <p>3. Tap on "Link a Device" and scan the code</p>
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
            <div className="animate-in">
              {activeTab === 'overview' && (
                <div className={dashStyles.section}>
                  <h2 className={dashStyles.sectionTitle}><Bot size={20} /> Engine Overview</h2>
                  <p className={dashStyles.sectionDesc}>
                    Your WhatsApp engine is currently active and listening for incoming messages.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Instance Name</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>{instance.instanceName}</p>
                    </div>
                    <div style={{ padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Phone Number</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>{instance.phoneNumber || "Unknown"}</p>
                    </div>
                    <div style={{ padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Bot Status</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '600', color: instance.isActive ? '#10b981' : '#ef4444' }}>
                          {instance.isActive ? "ACTIVE" : "PAUSED"}
                        </span>
                        <button 
                          onClick={handleToggleBot}
                          disabled={toggling}
                          className={dashStyles.btn}
                          style={{ 
                            padding: '0.4rem 0.8rem', 
                            fontSize: '0.75rem', 
                            background: instance.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: instance.isActive ? '#ef4444' : '#10b981',
                            border: `1px solid ${instance.isActive ? '#ef4444' : '#10b981'}`
                          }}
                        >
                          {toggling ? "..." : (instance.isActive ? "Pause Bot" : "Resume Bot")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'webhooks' && (
                <div className={dashStyles.section}>
                  <h2 className={dashStyles.sectionTitle}><Webhook size={20} /> Webhook Integrations</h2>
                  <p className={dashStyles.sectionDesc}>
                    Forward incoming WhatsApp messages to external services like Zapier, Make, or your own custom API.
                  </p>
                  
                  <div style={{ marginTop: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: '#8b949e' }}>Webhook URL</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <input 
                        className={dashStyles.input} 
                        style={{ margin: 0 }}
                        placeholder="https://your-api.com/webhook"
                        value={webhookUrl}
                        onChange={e => setWebhookUrl(e.target.value)}
                      />
                      <button 
                        className={dashStyles.btn} 
                        onClick={handleSaveWebhook}
                        disabled={savingWebhook || !webhookUrl}
                      >
                        {savingWebhook ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'auto-replies' && (
                <div className={dashStyles.section}>
                  <h2 className={dashStyles.sectionTitle}><MessageSquare size={20} /> Auto Replies</h2>
                  <p className={dashStyles.sectionDesc}>
                    Configure keyword-based responses. When a user sends a specific keyword, VakaBot will reply automatically.
                  </p>
                  
                  {/* Add Rule Form */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '1rem', alignItems: 'flex-end' }}>
                      <div className={authStyles.field} style={{ marginBottom: 0 }}>
                        <label className={authStyles.label}>Keyword</label>
                        <input 
                          className={dashStyles.input} 
                          style={{ margin: 0 }}
                          placeholder="e.g. hello"
                          value={newKeyword}
                          onChange={e => setNewKeyword(e.target.value)}
                        />
                      </div>
                      <div className={authStyles.field} style={{ marginBottom: 0 }}>
                        <label className={authStyles.label}>Response</label>
                        <input 
                          className={dashStyles.input} 
                          style={{ margin: 0 }}
                          placeholder="What the bot should say"
                          value={newReply}
                          onChange={e => setNewReply(e.target.value)}
                        />
                      </div>
                      <button 
                        className={dashStyles.btn} 
                        onClick={handleAddRule}
                        disabled={addingRule || !newKeyword || !newReply}
                      >
                        {addingRule ? "..." : "Add Rule"}
                      </button>
                    </div>
                  </div>

                  {/* Rules List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {rules.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                        <p style={{ color: '#8b949e' }}>No auto-replies configured yet.</p>
                      </div>
                    ) : (
                      rules.map(rule => (
                        <div key={rule.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem', marginRight: '1rem' }}>
                              IF "{rule.keyword.toUpperCase()}"
                            </span>
                            <span style={{ color: '#8b949e' }}>→ {rule.replyText}</span>
                          </div>
                          <button 
                            onClick={() => handleDeleteRule(rule.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className={dashStyles.section}>
                  <h2 className={dashStyles.sectionTitle}><Settings size={20} /> Instance Settings</h2>
                  <p className={dashStyles.sectionDesc}>Manage your WhatsApp engine connection.</p>
                  <button 
                    className={dashStyles.btn} 
                    style={{ background: '#ef4444' }}
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    {disconnecting ? "Disconnecting..." : "Disconnect Engine"}
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
