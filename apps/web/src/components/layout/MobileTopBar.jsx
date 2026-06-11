import React from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

const titleMap = {
  '/dashboard': 'Dashboard',
  '/bots': 'My Bots',
  '/keywords': 'Keywords',
  '/services': 'Services',
  '/analytics': 'Analytics',
  '/conversations': 'Conversations',
  '/billing': 'Billing',
  '/settings': 'Settings',
};

const MobileTopBar = () => {
  const { pathname } = useLocation();
  const { user } = useUser();
  const title = titleMap[pathname] || 'Velo AI';

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-12 bg-background/80 backdrop-blur-md border-b border-border px-3.5 flex items-center justify-between z-50">
      <div className="flex items-center">
        <div className="w-1.5 h-1.5 rounded-full bg-accent mr-1.5" />
        <span className="text-[12px] font-bold text-text-primary tracking-tight">Velo AI</span>
      </div>
      
      <h1 className="text-[12px] font-bold text-text-primary absolute left-1/2 -translate-x-1/2 tracking-tight">
        {title}
      </h1>

      <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
        {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase()}
      </div>
    </header>
  );
};

export default MobileTopBar;
