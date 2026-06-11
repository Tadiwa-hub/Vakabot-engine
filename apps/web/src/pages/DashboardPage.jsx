import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { Bot as BotIcon, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PlanUsage from './dashboard/PlanUsage';
import StatsGrid from './dashboard/StatsGrid';
import BotCards from './dashboard/BotCards';
import ActivityList from './dashboard/ActivityList';
import InsightsSection from './dashboard/InsightsSection';
import { analyticsService } from '../services/api';
import { useInstance } from '../hooks/useInstance';

const DashboardPage = () => {
  const { user } = useUser();
  const { toggle: toggleInstance } = useInstance(user?.id);

  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: () => analyticsService.getDashboardData(user.id),
    enabled: !!user?.id,
    refetchInterval: 10000, // Background polling every 10s
    staleTime: 5000, // Data stays fresh for 5 seconds
  });

  // Extract variables from consolidated dashboardData
  const rawInstance = dashboardData?.instance;
  const instance = rawInstance?.status === 'CONNECTED' ? rawInstance : null;
  const keywords = dashboardData?.keywords || [];
  const services = dashboardData?.services || [];
  const userData = dashboardData?.user || null;
  const apiStats = dashboardData?.stats || null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const bots = instance ? [{
    id: instance.id,
    name: instance.instanceName,
    phone: instance.phoneNumber || 'Not linked',
    status: instance.status.toLowerCase(),
    isOn: instance.isActive,
    messagesToday: apiStats?.messagesToday || 0,
    aiResponses: userData?.aiUsageCount || 0,
    keywords: keywords.length,
    services: services.length,
  }] : [];

  const stats = {
    messagesToday: apiStats?.messagesToday || 0,
    aiUsed: userData?.aiUsageCount || 0,
    aiLimit: userData?.aiLimit || 25,
    keywordsMatched: apiStats?.keywordsMatched || 0,
    activeBots: instance?.status === 'CONNECTED' ? 1 : 0,
  };

  const activity = apiStats?.recentActivity?.map(msg => ({
    id: msg.id,
    phone: msg.remoteJid.split('@')[0],
    message: msg.content,
    time: new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: msg.responseType || 'fallback',
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-text-light">
        <Loader2 className="animate-spin mr-3" size={24} />
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 sm:gap-4 px-0.5">
        <div>
          <h1 className="text-[18px] sm:text-24 font-bold tracking-tight">Dashboard</h1>
          <p className="text-[12px] sm:text-[14px] text-text-secondary mt-0.5">
            {greeting}, {user?.firstName || 'User'}
          </p>
        </div>
        <div className="text-[11px] sm:text-[14px] text-text-secondary font-semibold">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <InsightsSection userId={user?.id} />

      {!instance ? (
        <Card className="flex flex-col items-center justify-center py-12 sm:py-20 px-4 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4 sm:mb-6">
            <BotIcon size={24} className="text-text-light sm:size-32" />
          </div>
          <h2 className="text-[16px] sm:text-[18px] font-bold mb-1.5">No bots connected yet</h2>
          <p className="text-[12px] sm:text-[14px] text-text-secondary max-w-[280px] mb-6 sm:mb-8">
            Connect your WhatsApp number to get started in under 2 minutes
          </p>
          <Button as={Link} to="/bots/connect" className="w-full sm:w-auto px-10">
            Connect Your First Bot
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
          {/* Main Controls & Stats (Left side - 2 columns wide on laptop) */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <PlanUsage stats={stats} plan={userData?.plan} aiExpiryDate={userData?.aiExpiryDate} />
            <StatsGrid stats={stats} />
            <BotCards bots={bots} onToggle={toggleInstance} />
          </div>

          {/* Real-time System Feed & Console (Right side - 1 column wide on laptop) */}
          <div className="lg:col-span-1">
            <ActivityList activity={activity} />
          </div>
        </div>
      )}

      <style>{`
        .animate-in { animation: slideUp 0.4s ease-out; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
