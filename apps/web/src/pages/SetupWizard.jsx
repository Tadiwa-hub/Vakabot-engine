import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Check, ChevronRight, Store, Clock, Briefcase, Zap, Loader2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { userService } from '../services/api';
import { useServices } from '../hooks/useServices';
import { useKeywords } from '../hooks/useKeywords';

const steps = [
  { id: 1, title: 'Business Profile', icon: Store },
  { id: 2, title: 'Your Services', icon: Briefcase },
  { id: 3, title: 'Smart Replies', icon: Zap },
];

const SetupWizard = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1 State
  const [businessData, setBusinessData] = useState({
    businessName: '',
    availability: 'Mon - Fri: 9:00 AM - 5:00 PM',
  });

  // Step 2 State
  const { addService, services } = useServices(user?.id);
  const [newService, setNewService] = useState({ name: '', description: '', price: '' });

  // Step 3 State
  const { addKeyword, keywords } = useKeywords(user?.id);
  const [newKeyword, setNewKeyword] = useState({ triggers: '', response: '' });

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!businessData.businessName) return;
      setIsSaving(true);
      try {
        await userService.updateUser(user.id, { 
          ...businessData, 
          email: user.primaryEmailAddress?.emailAddress 
        });
        setCurrentStep(2);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSaving(false);
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      navigate('/dashboard');
    }
  };

  const handleAddService = async () => {
    if (!newService.name || !newService.description) return;
    try {
      await addService(newService);
      setNewService({ name: '', description: '', price: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.triggers || !newKeyword.response) return;
    try {
      await addKeyword({ ...newKeyword, matchType: 'contains' });
      setNewKeyword({ triggers: '', response: '' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center py-12 px-4">
      {/* Progress */}
      <div className="w-full max-w-2xl mb-12">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-border -z-10" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary transition-all duration-500 -z-10" 
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
                    isActive ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/20' : 
                    isCompleted ? 'bg-primary text-white' : 'bg-surface border-2 border-border text-text-light'
                  }`}
                >
                  {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                </div>
                <span className={`text-[10px] sm:text-[12px] font-bold uppercase tracking-wider text-center hidden xs:block ${isActive ? 'text-primary' : 'text-text-light'}`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full max-w-2xl">
        {/* Step 1: Business Profile */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in">
            <div className="text-center mb-8">
              <h1 className="text-32 font-bold mb-2">Welcome to Velo AI</h1>
              <p className="text-text-secondary text-[16px]">Tell us a bit about your business to get started.</p>
            </div>
            <Card className="p-8 space-y-6 shadow-xl shadow-black/[0.02]">
              <Input 
                label="Business Name" 
                placeholder="e.g. Velo Coffee Shop" 
                value={businessData.businessName}
                onChange={(e) => setBusinessData(prev => ({ ...prev, businessName: e.target.value }))}
                required
              />
              <div className="space-y-2">
                <label className="label-sm block px-0.5 flex items-center gap-2">
                  <Clock size={14} className="text-text-light" />
                  Availability / Business Hours
                </label>
                <textarea 
                  className="w-full min-h-[100px] p-4 bg-background border border-border rounded-input text-[14px] focus:outline-none focus:border-accent transition-default"
                  placeholder="e.g. Mon - Fri: 9:00 AM - 5:00 PM&#10;Sat: 10:00 AM - 2:00 PM"
                  value={businessData.availability}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, availability: e.target.value }))}
                />
              </div>
              <Button 
                className="w-full h-12 text-[16px]" 
                onClick={handleNext} 
                loading={isSaving}
                disabled={!businessData.businessName}
              >
                Continue
                <ChevronRight size={20} className="ml-2" />
              </Button>
            </Card>
          </div>
        )}

        {/* Step 2: Services */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in">
            <div className="text-center mb-8">
              <h1 className="text-32 font-bold mb-2">What do you offer?</h1>
              <p className="text-text-secondary text-[16px]">Add the services you provide so the AI can help your customers.</p>
            </div>
            
            <Card className="p-8 space-y-6 shadow-xl shadow-black/[0.02]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Service Name" 
                  placeholder="e.g. Haircut" 
                  value={newService.name}
                  onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input 
                  label="Price (Optional)" 
                  placeholder="e.g. $25" 
                  value={newService.price}
                  onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="label-sm block px-0.5">Description</label>
                <textarea 
                  className="w-full min-h-[80px] p-4 bg-background border border-border rounded-input text-[14px] focus:outline-none focus:border-accent transition-default"
                  placeholder="Briefly describe this service..."
                  value={newService.description}
                  onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Button variant="outline" className="w-full" onClick={handleAddService}>
                Add Service
              </Button>

              {services.length > 0 && (
                <div className="pt-4 border-t border-border space-y-3">
                  <p className="text-[12px] font-bold text-text-light uppercase tracking-wider">Added Services</p>
                  {services.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                      <div className="text-[14px] font-medium">{s.name}</div>
                      <div className="text-[14px] text-primary font-bold">{s.price}</div>
                    </div>
                  ))}
                </div>
              )}

              <Button className="w-full h-12 text-[16px]" onClick={handleNext}>
                {services.length === 0 ? 'Skip for now' : 'Continue'}
                <ChevronRight size={20} className="ml-2" />
              </Button>
            </Card>
          </div>
        )}

        {/* Step 3: Keywords */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in">
            <div className="text-center mb-8">
              <h1 className="text-32 font-bold mb-2">Setup Smart Replies</h1>
              <p className="text-text-secondary text-[16px]">Create automatic responses for common questions like "location" or "booking".</p>
            </div>
            
            <Card className="p-8 space-y-6 shadow-xl shadow-black/[0.02]">
              <Input 
                label="Trigger Keywords" 
                placeholder="e.g. price, cost, how much" 
                helper="Separate with commas"
                value={newKeyword.triggers}
                onChange={(e) => setNewKeyword(prev => ({ ...prev, triggers: e.target.value }))}
              />
              <div className="space-y-2">
                <label className="label-sm block px-0.5">Bot Response</label>
                <textarea 
                  className="w-full min-h-[100px] p-4 bg-background border border-border rounded-input text-[14px] focus:outline-none focus:border-accent transition-default"
                  placeholder="What should the bot say when these keywords are matched?"
                  value={newKeyword.response}
                  onChange={(e) => setNewKeyword(prev => ({ ...prev, response: e.target.value }))}
                />
              </div>
              <Button variant="outline" className="w-full" onClick={handleAddKeyword}>
                Add Reply
              </Button>

              {keywords.length > 0 && (
                <div className="pt-4 border-t border-border space-y-3">
                  <p className="text-[12px] font-bold text-text-light uppercase tracking-wider">Added Replies</p>
                  {keywords.map(k => (
                    <div key={k.id} className="p-3 bg-surface-2 rounded-lg">
                      <div className="text-[13px] font-bold text-primary mb-1">"{k.triggers}"</div>
                      <div className="text-[12px] text-text-secondary line-clamp-1">{k.response}</div>
                    </div>
                  ))}
                </div>
              )}

              <Button className="w-full h-12 text-[16px] bg-accent hover:bg-accent-hover" onClick={handleNext}>
                Finish Setup
                <Check size={20} className="ml-2" />
              </Button>
            </Card>
          </div>
        )}
      </div>

      <style>{`
        .animate-in {
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SetupWizard;
