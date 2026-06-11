import React from 'react';
import Sidebar from './Sidebar';
import MobileTopBar from './MobileTopBar';
import MobileBottomNav from './MobileBottomNav';

const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Header */}
      <MobileTopBar />

      {/* Main Content */}
      <main className="lg:pl-[240px] pt-12 lg:pt-0 pb-12 lg:pb-0">
        <div className="max-w-[1200px] mx-auto p-2.5 md:p-8 lg:p-10">
          {children}
        </div>
      </main>

      {/* Mobile Footer Nav */}
      <MobileBottomNav />
    </div>
  );
};

export default DashboardLayout;
