import React, { useState } from 'react';
import { Loader2, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const EcoCashModal = ({ isOpen, onClose, step, onPay, setStep, plan }) => {
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState('ecocash');

  const handleSubmit = (e) => {
    e.preventDefault();
    onPay({ phone, method });
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={`Upgrade to ${plan?.name || 'Business'}`}
    >
      {step === 1 && (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="text-center p-6 bg-surface-2 rounded-card border border-border">
            <div className="text-[14px] text-text-secondary mb-1">Amount to Pay</div>
            <div className="text-[32px] font-bold text-primary">{plan?.price || '$10.00'}<span className="text-[16px] font-medium">/mo</span></div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4">
              <label className={`flex-1 p-4 border rounded-card cursor-pointer transition-all ${method === 'ecocash' ? 'border-primary bg-primary/5' : 'border-border hover:border-text-light'}`}>
                <input type="radio" name="method" value="ecocash" checked={method === 'ecocash'} onChange={() => setMethod('ecocash')} className="hidden" />
                <div className="text-center font-medium">EcoCash</div>
              </label>
              <label className={`flex-1 p-4 border rounded-card cursor-pointer transition-all ${method === 'onemoney' ? 'border-primary bg-primary/5' : 'border-border hover:border-text-light'}`}>
                <input type="radio" name="method" value="onemoney" checked={method === 'onemoney'} onChange={() => setMethod('onemoney')} className="hidden" />
                <div className="text-center font-medium">OneMoney</div>
              </label>
            </div>

            <Input 
              label="Mobile Number" 
              placeholder="0771234567" 
              helper={`Enter your registered ${method === 'ecocash' ? 'EcoCash' : 'OneMoney'} number`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full py-6 h-auto">Pay Now</Button>
        </form>
      )}

      {step === 2 && (
        <div className="py-12 flex flex-col items-center text-center space-y-6 animate-pulse">
          <Loader2 size={48} className="text-accent animate-spin" />
          <h3 className="text-[18px] font-semibold">Sending payment request...</h3>
        </div>
      )}

      {step === 3 && (
        <div className="py-12 flex flex-col items-center text-center space-y-8">
          <Smartphone size={64} className="text-primary" />
          <div className="space-y-2">
            <h3 className="text-[18px] font-semibold">Check your phone</h3>
            <p className="text-[14px] text-text-secondary max-w-[280px]">
              Enter your PIN on your phone to authorize the payment.
            </p>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="py-12 flex flex-col items-center text-center space-y-8">
          <CheckCircle2 size={48} className="text-success" />
          <h3 className="text-[20px] font-semibold">Payment confirmed! 🎉</h3>
          <Button className="w-full" onClick={onClose}>Finish</Button>
        </div>
      )}

      {step === 5 && (
        <div className="py-12 flex flex-col items-center text-center space-y-8">
          <AlertCircle size={48} className="text-danger" />
          <h3 className="text-[20px] font-semibold">Payment failed</h3>
          <Button variant="outline" className="w-full" onClick={() => setStep(1)}>Retry</Button>
        </div>
      )}
    </Modal>
  );
};

export default EcoCashModal;
