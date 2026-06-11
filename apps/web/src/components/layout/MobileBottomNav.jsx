import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bot, 
  MessageSquare, 
  BarChart3, 
  Settings,
  MoreVertical,
  Key,
  ShoppingBag,
  CreditCard,
  X
} from 'lucide-react';

const NavTab = ({ to, icon: Icon, label, onClick }) => (
  <NavLink 
    to={to} 
    onClick={onClick}
    className={({ isActive }) => `
      flex flex-col items-center justify-center flex-1 relative h-full
      ${isActive ? 'text-accent' : 'text-text-light'}
    `}
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <div className="absolute top-0.5 w-1 h-1 rounded-full bg-accent" />
        )}
        <Icon size={18} className="mb-0.5" />
        <span className="text-[9px] font-bold tracking-tight">{label}</span>
      </>
    )}
  </NavLink>
);

const MobileBottomNav = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { pathname } = useLocation();

  const menuItems = [
    { to: '/keywords', icon: Key, label: 'Keywords' },
    { to: '/services', icon: ShoppingBag, label: 'Services' },
    { to: '/billing', icon: CreditCard, label: 'Billing' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      {/* Overlay Menu */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in flex flex-col justify-end p-2.5">
          <div className="bg-background rounded-xl p-4.5 space-y-4 animate-in slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold uppercase tracking-wider text-text-secondary">More Options</h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-1.5 -mr-1.5 text-text-light hover:text-primary">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              {menuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-center transition-default ${pathname === item.to ? 'bg-accent-glow border-accent text-primary' : 'bg-surface border-border text-text-secondary'}`}
                >
                  <item.icon size={20} />
                  <span className="text-[11px] font-semibold">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-12 bg-background/95 backdrop-blur-md border-t border-border flex items-center justify-around pb-0.5 z-50 shadow-[0_-1px_3px_rgba(0,0,0,0.02)]">
        <NavTab to="/dashboard" icon={LayoutDashboard} label="Home" />
        <NavTab to="/bots" icon={Bot} label="Bots" />
        <NavTab to="/conversations" icon={MessageSquare} label="Chats" />
        <NavTab to="/analytics" icon={BarChart3} label="Stats" />
        <button 
          onClick={() => setIsMenuOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 h-full ${isMenuOpen ? 'text-accent' : 'text-text-light'}`}
        >
          <MoreVertical size={18} className="mb-0.5" />
          <span className="text-[9px] font-bold tracking-tight">More</span>
        </button>
      </nav>

      <style>{`
        .animate-in { animation: fadeIn 0.2s ease-out; }
        .slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); } to { transform: translateY(0); } }
      `}</style>
    </>
  );
};

export default MobileBottomNav;
