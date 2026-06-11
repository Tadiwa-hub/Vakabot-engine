import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bot, 
  MessageSquare, 
  Key, 
  ShoppingBag, 
  BarChart3, 
  CreditCard, 
  Settings,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useUserStats } from '../../hooks/useUserStats';

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => `
      flex items-center h-9 px-3 rounded-md text-[14px] font-medium transition-default group
      ${isActive 
        ? 'bg-surface-2 text-primary border-l-2 border-accent' 
        : 'text-text-secondary hover:bg-[#F9F9F9] hover:text-primary'}
    `}
  >
    <Icon size={16} className="mr-3 shrink-0" />
    <span>{label}</span>
  </NavLink>
);

const SectionLabel = ({ children }) => (
  <div className="label-sm mt-6 mb-2 px-3">
    {children}
  </div>
);

const ADMIN_UUIDS = [
  "user_3EyzCfcKC4ja4chzLVL7dSdl20g",
  "user_3EAVXOo4i0Tb1YWy0TaYzpQzMSn"
];

const Sidebar = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { userData } = useUserStats(user?.id);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-background border-r border-border hidden lg:flex flex-col">
      {/* Logo area */}
      <div className="h-12 px-4 flex items-center shrink-0">
        <div className="w-2 h-2 rounded-full bg-accent mr-2" />
        <span className="text-16 font-semibold text-text-primary">Velo AI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto pt-4">
        <SectionLabel>Main</SectionLabel>
        <div className="space-y-1">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/bots" icon={Bot} label="My Bots" />
          <NavItem to="/conversations" icon={MessageSquare} label="Conversations" />
        </div>

        <SectionLabel>Manage</SectionLabel>
        <div className="space-y-1">
          <NavItem to="/keywords" icon={Key} label="Keywords" />
          <NavItem to="/services" icon={ShoppingBag} label="Services" />
          <NavItem to="/analytics" icon={BarChart3} label="Analytics" />
        </div>

        <SectionLabel>Account</SectionLabel>
        <div className="space-y-1">
          <NavItem to="/billing" icon={CreditCard} label="Billing" />
          <NavItem to="/settings" icon={Settings} label="Settings" />
        </div>

        {ADMIN_UUIDS.includes(user?.id) && (
          <>
            <SectionLabel>Platform</SectionLabel>
            <div className="space-y-1">
              <NavItem to="/admin" icon={ShieldAlert} label="Admin Panel" />
            </div>
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-border space-y-4">
        <div className="flex items-center p-2 rounded-lg border border-transparent">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[13px] font-semibold shrink-0 mr-3">
            {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold truncate text-text-primary">
                {user?.fullName || 'User'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-2 text-text-secondary font-medium uppercase">
                {userData?.plan || 'FREE'}
              </span>
            </div>
            <div className="text-[11px] text-text-light truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => signOut()}
          className="flex items-center px-3 text-[13px] text-text-secondary hover:text-danger transition-default w-full"
        >
          <LogOut size={14} className="mr-3" />
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
