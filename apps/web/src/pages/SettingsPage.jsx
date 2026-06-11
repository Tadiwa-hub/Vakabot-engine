import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Bell, Shield, User, Trash2, Store, Clock, Loader2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toggle from '../components/ui/Toggle';
import { useUserStats } from '../hooks/useUserStats';
import { userService } from '../services/api';

const SettingsPage = () => {
  const { user } = useUser();
  const { userData, loading: userLoading, refresh } = useUserStats(user?.id);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    businessName: '',
    availability: '',
    phoneNumber: ''
  });

  useEffect(() => {
    if (userData) {
      setProfileData({
        businessName: userData.businessName || '',
        availability: userData.availability || '',
        phoneNumber: userData.phoneNumber || ''
      });
    }
  }, [userData]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await userService.updateUser(user.id, {
        ...profileData,
        email: user.primaryEmailAddress?.emailAddress
      });
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in max-w-3xl">
      <div>
        <h1 className="text-24 font-semibold">Settings</h1>
        <p className="text-[14px] text-text-secondary mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-text-primary">
          <User size={18} />
          <h2 className="text-[16px] font-semibold">Profile</h2>
        </div>
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Full Name" defaultValue={user?.fullName} disabled />
            <Input label="Email Address" defaultValue={user?.primaryEmailAddress?.emailAddress} disabled />
            <Input 
              label="Phone Number" 
              placeholder="+263..." 
              value={profileData.phoneNumber}
              onChange={(e) => setProfileData(prev => ({ ...prev, phoneNumber: e.target.value }))}
            />
          </div>
        </Card>
      </section>

      {/* Business Profile */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-text-primary">
          <Store size={18} />
          <h2 className="text-[16px] font-semibold">Business Profile</h2>
        </div>
        <Card className="p-6 space-y-6">
          <div className="space-y-6">
            <Input 
              label="Business Name" 
              placeholder="e.g. Velo Coffee" 
              value={profileData.businessName}
              onChange={(e) => setProfileData(prev => ({ ...prev, businessName: e.target.value }))}
            />
            
            <div className="space-y-2">
              <label className="label-sm block px-0.5 flex items-center gap-2">
                <Clock size={14} className="text-text-light" />
                Availability / Business Hours
              </label>
              <textarea 
                className="w-full min-h-[100px] p-4 bg-background border border-border rounded-input text-[14px] focus:outline-none focus:border-accent transition-default"
                placeholder="e.g. Mon - Fri: 9:00 AM - 5:00 PM"
                value={profileData.availability}
                onChange={(e) => setProfileData(prev => ({ ...prev, availability: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} loading={isSaving}>Save Changes</Button>
          </div>
        </Card>
      </section>

      {/* Security */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-text-primary">
          <Shield size={18} />
          <h2 className="text-[16px] font-semibold">Security</h2>
        </div>
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <Input label="Current Password" type="password" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="New Password" type="password" />
              <Input label="Confirm New Password" type="password" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => alert('Password management is handled securely via Clerk. This feature will be available in the portal soon.')}>Update Password</Button>
          </div>
        </Card>
      </section>

      {/* Notifications */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-text-primary">
          <Bell size={18} />
          <h2 className="text-[16px] font-semibold">Notifications</h2>
        </div>
        <Card className="divide-y divide-border">
          {[
            { title: 'Bot goes offline', desc: 'Get alerted when a bot loses connection' },
            { title: 'Daily summary email', desc: 'Receive a report of all bot activity' },
            { title: 'AI limit warning', desc: 'Notify me when I reach 80% of my AI limit' },
            { title: 'Payment receipts', desc: 'Send receipts to my registered email' }
          ].map((item, i) => (
            <div key={i} className="p-6 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-[14px] font-semibold">{item.title}</div>
                <div className="text-[13px] text-text-secondary">{item.desc}</div>
              </div>
              <Toggle checked={i === 0 || i === 2} />
            </div>
          ))}
        </Card>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-danger">
          <Trash2 size={18} />
          <h2 className="text-[16px] font-semibold">Danger Zone</h2>
        </div>
        <Card className="p-6 border-danger/30 bg-danger/[0.02]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="text-[14px] font-semibold">Delete Account</div>
              <p className="text-[13px] text-text-secondary">
                Permanently remove your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <Button variant="danger" className="border border-danger/30">
              Delete Account
            </Button>
          </div>
        </Card>
      </section>

      <style>{`
        .animate-in {
          animation: slideUp 0.4s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;
