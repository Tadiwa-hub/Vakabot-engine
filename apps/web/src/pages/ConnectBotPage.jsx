import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ArrowLeft, CheckCircle2, Loader2, Clock, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useInstance } from '../hooks/useInstance';

const ConnectBotPage = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { instance, create, cleanup, pairingCode, codeStatus, setCodeStatus } = useInstance(user?.id);
  
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const countdownRef = useRef(null);
  const instanceNameRef = useRef(null);
  const statusRef = useRef(codeStatus);

  // Sync refs to avoid stale closures in cleanup
  useEffect(() => {
    if (instance?.instanceName) instanceNameRef.current = instance.instanceName;
  }, [instance]);

  useEffect(() => {
    statusRef.current = codeStatus;
  }, [codeStatus]);

  // Automatic redirect to dashboard once connected
  useEffect(() => {
    if (codeStatus === 'connected' || instance?.status === 'CONNECTED') {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 1500); // 1.5 second delay so they see the "Connected! 🎉" screen
      return () => clearTimeout(timer);
    }
  }, [codeStatus, instance?.status, navigate]);

  // TIMER LOGIC
  useEffect(() => {
    let interval = null;
    if (codeStatus === 'active' && pairingCode) {
      setTimeLeft(60);
      
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleExpiry();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      countdownRef.current = interval;
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }

    return () => {
      if (interval) clearInterval(interval);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [codeStatus, pairingCode]);

  // Removed the eager cleanup on unmount. 
  // Background orphaned instances are cleaned up by the backend Cron Job.

  const handleExpiry = () => {
    setCodeStatus('expired');
    if (instanceNameRef.current) cleanup(instanceNameRef.current);
  };

  const handleGetCode = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await create(phone, user?.primaryEmailAddress?.emailAddress);
    } catch (err) {
      setErrorMsg(err.message || 'Connection failed. Please check your number.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTimerColor = () => {
    if (timeLeft > 30) return '#16A34A';
    if (timeLeft > 10) return '#D97706';
    return '#DC2626';
  };

  const formatCode = (code) => {
    if (!code || code.length !== 8) return code;
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center animate-in p-4">
      <div className="w-full max-w-[480px]">
        {codeStatus === 'idle' && (
          <button onClick={() => navigate('/bots')} className="flex items-center text-[14px] text-text-secondary hover:text-primary mb-8">
            <ArrowLeft size={16} className="mr-2" />
            Back to Bots
          </button>
        )}

        <Card className="p-8 md:p-10 relative overflow-hidden">
          {codeStatus === 'expired' ? (
            <div className="text-center py-4 space-y-6 animate-in">
              <Clock size={48} className="mx-auto text-danger" />
              <h2 className="text-[24px] font-bold">Code Expired</h2>
              <p className="text-[15px] text-text-secondary">This code is no longer valid. Linking requires a fresh session.</p>
              <Button onClick={() => { setCodeStatus('idle'); setPhone(''); }} className="w-full h-12 gap-2">
                <RefreshCw size={18} /> Get a New Code
              </Button>
            </div>
          ) : codeStatus === 'connected' || instance?.status === 'CONNECTED' ? (
            <div className="text-center space-y-8 animate-in">
              <CheckCircle2 size={40} className="mx-auto text-success" />
              <h2 className="text-[24px] font-bold">Connected! 🎉</h2>
              <p className="text-[14px] text-text-secondary">Your WhatsApp bot is now active.</p>
              <Button onClick={() => navigate('/dashboard')} className="w-full">Go to Dashboard →</Button>
            </div>
          ) : codeStatus === 'active' ? (
            <div className="text-center space-y-8 animate-in">
              <div className="flex flex-col items-center gap-1">
                <div className="text-[13px] font-bold uppercase" style={{ color: getTimerColor() }}>
                  Expires in 0:{timeLeft.toString().padStart(2, '0')}
                </div>
                <div className="w-full max-w-[200px] h-1 bg-border rounded-full mt-2 overflow-hidden">
                  <div className="h-full transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 60) * 100}%`, backgroundColor: getTimerColor() }} />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-[18px] font-semibold">Enter this code in WhatsApp</h2>
                <div className="bg-surface-2 border border-border rounded-xl p-6 flex flex-col items-center justify-center min-h-[140px]">
                   <div className={`text-[24px] xs:text-[32px] md:text-[42px] font-mono font-bold tracking-[2px] xs:tracking-[4px] md:tracking-[8px] text-primary transition-all duration-300 ${timeLeft <= 10 ? 'animate-pulse scale-105' : ''}`}>
                    {formatCode(pairingCode)}
                  </div>
                  <button onClick={handleCopyCode} className="mt-4 flex items-center gap-2 text-[12px] font-bold uppercase text-text-light hover:text-primary">
                    {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              </div>

              <div className="text-left bg-surface-2/50 p-6 rounded-xl space-y-4">
                <div className="text-[13px] font-bold uppercase text-text-light">Instructions:</div>
                <ol className="space-y-3">
                  {['Open WhatsApp', 'Tap Settings → Linked Devices', 'Tap Link a Device', 'Tap Link with phone number', 'Enter the code above'].map((s, i) => (
                    <li key={i} className="flex gap-3 text-[14px] text-text-secondary leading-tight">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex items-center justify-center gap-3 text-[13px] text-text-light font-medium">
                <Loader2 size={16} className="animate-spin text-primary" /> Waiting for connection...
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in">
              <div className="text-center">
                <h1 className="text-[24px] font-bold">Connect WhatsApp</h1>
                <p className="text-[14px] text-text-secondary mt-2">Enter your phone number to receive a pairing code.</p>
              </div>

              {errorMsg && (
                <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl flex gap-3 text-danger text-[14px] animate-in">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}

              <form onSubmit={handleGetCode} className="space-y-6">
                <Input label="Phone Number" placeholder="263771234567" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={loading} />
                <Button type="submit" className="w-full h-12 text-[16px]" loading={loading}>
                  {loading ? 'Requesting Code...' : 'Get Pairing Code'}
                </Button>
              </form>
            </div>
          )}
        </Card>
      </div>

      <style>{`
        .animate-in { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .animate-pulse { animation: pulse 1s infinite; }
      `}</style>
    </div>
  );
};

export default ConnectBotPage;
