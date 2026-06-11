import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Check, Loader2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EcoCashModal from './dashboard/EcoCashModal';
import { useBilling } from '../hooks/useBilling';
import { useUserStats } from '../hooks/useUserStats';

const plans = [
  { name: 'Starter', price: '$5', features: ['150 AI messages', 'Valid for 30 days', 'Unlimited Keywords'], buttonText: 'Buy Bundle', variant: 'secondary' },
  { name: 'Business', price: '$15', features: ['500 AI messages', 'Valid for 30 days', 'Unlimited Keywords'], buttonText: 'Buy Bundle', variant: 'pro', highlight: true, popular: true },
  { name: 'Pro', price: '$25', features: ['1000 AI messages', 'Valid for 30 days', 'Unlimited Keywords'], buttonText: 'Buy Bundle', variant: 'primary' },
];

const BillingPage = () => {
  const { user } = useUser();
  const { userData } = useUserStats(user?.id);
  const { history, loading, pay } = useBilling(user?.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1);
  const [selectedPlan, setSelectedJid] = useState(plans[1]);

  const handlePay = async (data) => {
    // e.preventDefault() is now handled in the modal
    setPaymentStep(2);
    try {
      const email = user?.primaryEmailAddress?.emailAddress || 'customer@velo.ai';
      await pay({ 
        plan: selectedPlan.name, 
        amount: selectedPlan.price.replace('$', ''), 
        method: data.method,
        phone: data.phone,
        email: email
      });
      
      setPaymentStep(3);
      // Wait a bit to simulate checking status or if real, wait for polling
      setTimeout(() => setPaymentStep(4), 10000);
    } catch (err) {
      setPaymentStep(5);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-text-light" /></div>;

  const currentLimit = userData?.aiLimit || 25;
  const currentUsage = userData?.aiUsageCount || 0;
  const remainingMsgs = Math.max(0, currentLimit - currentUsage);
  
  let expiryText = "Trial (No Expiry)";
  if (userData?.aiExpiryDate) {
    const daysLeft = Math.ceil((new Date(userData.aiExpiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    expiryText = daysLeft > 0 ? `Expires in ${daysLeft} Days` : "Expired";
  }

  return (
    <div className="space-y-12 animate-in pb-12">
      <div>
        <h1 className="text-24 font-semibold">Billing & Top-ups</h1>
        <p className="text-[14px] text-text-secondary mt-1">Manage your AI message bundles</p>
      </div>

      <Card className="p-8 max-w-2xl">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-6 flex-1">
            <div className="label-sm">Message Balance</div>
            <div className="text-[32px] font-bold">{remainingMsgs} <span className="text-[16px] font-medium text-text-secondary">AI Messages Left</span></div>
            <div className="text-[14px] font-medium text-text-secondary">
              {expiryText}
            </div>
            <div className="space-y-4">
              <div>
                <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(remainingMsgs / Math.max(currentLimit, 1)) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <Button onClick={() => { setSelectedJid(plans[1]); setIsModalOpen(true); }} className="px-8 py-6 h-auto text-[15px]">Top-up Balance</Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {plans.map((plan, i) => (
          <Card key={i} className={`p-6 flex flex-col relative overflow-visible ${plan.highlight ? 'border-2 border-accent bg-accent-glow' : ''}`}>
            {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Most Popular</div>}
            <div className="mb-8">
              <h3 className="text-[14px] font-bold uppercase tracking-widest text-text-light mb-4">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-[32px] font-bold text-primary">{plan.price}</span>
                <span className="text-[14px] text-text-secondary font-medium">/bundle</span>
              </div>
            </div>
            <ul className="space-y-4 flex-1 mb-8">
              {plan.features.map((f, j) => (
                <li key={j} className="flex items-center gap-3 text-[14px] text-text-secondary"><Check size={16} className="text-success shrink-0" />{f}</li>
              ))}
            </ul>
            <Button 
              variant={plan.highlight ? 'primary' : 'outline'} 
              className="w-full" 
              onClick={() => { setSelectedJid(plan); setIsModalOpen(true); }} 
            >
              {plan.buttonText}
            </Button>
          </Card>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-[16px] font-semibold px-1">Payment History</h2>
        <Card className="overflow-hidden">
          {/* Mobile Card List */}
          <div className="divide-y divide-border lg:hidden">
            {history.length === 0 ? (
              <div className="p-8 text-center text-text-light text-[13px]">No payments found</div>
            ) : history.map(p => (
              <div key={p.id} className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[14px]">{p.plan} - {p.amount}</span>
                  <Badge variant={p.status === 'PAID' ? 'connected' : 'disconnected'}>{p.status}</Badge>
                </div>
                <div className="text-text-secondary text-[12px]">
                  {new Date(p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table */}
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="px-6 py-4 label-sm">Date</th>
                  <th className="px-6 py-4 label-sm">Plan</th>
                  <th className="px-6 py-4 label-sm">Amount</th>
                  <th className="px-6 py-4 label-sm text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-text-light text-[14px]">No payments found</td></tr>
                ) : history.map(p => (
                  <tr key={p.id} className="hover:bg-surface transition-default text-[13px]">
                    <td className="px-6 py-4">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium">{p.plan}</td>
                    <td className="px-6 py-4">{p.amount}</td>
                    <td className="px-6 py-4 text-right"><Badge variant={p.status === 'PAID' ? 'connected' : 'disconnected'}>{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <EcoCashModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setTimeout(() => setPaymentStep(1), 500); }} 
        step={paymentStep} 
        onPay={handlePay} 
        setStep={setPaymentStep}
        plan={selectedPlan}
      />

      <style>{`
        .animate-in { animation: slideUp 0.4s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default BillingPage;
