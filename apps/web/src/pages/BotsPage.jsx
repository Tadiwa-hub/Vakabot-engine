import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, MoreHorizontal } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Toggle from '../components/ui/Toggle';
import { useInstance } from '../hooks/useInstance';
import { useKeywords } from '../hooks/useKeywords';
import { useServices } from '../hooks/useServices';

const BotsPage = () => {
  const { user } = useUser();
  const { instance: rawInstance, loading, disconnect, toggle } = useInstance(user?.id);
  // Treat a disconnected instance as null to match Dashboard behavior
  const instance = rawInstance?.status === 'CONNECTED' ? rawInstance : null;
  const { keywords } = useKeywords(user?.id);
  const { services } = useServices(user?.id);

  const bots = instance ? [{
    id: instance.id,
    name: instance.instanceName,
    phone: instance.phoneNumber || 'Not linked',
    status: instance.status.toLowerCase(),
    isOn: instance.isActive,
    messagesToday: 0,
    aiResponses: 0,
    keywords: keywords.length,
    services: services.length,
  }] : [];

  if (loading) return <div className="p-8">Loading bots...</div>;

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-24 font-semibold">My Bots</h1>
          <p className="text-[14px] text-text-secondary mt-1">
            Manage your connected WhatsApp numbers
          </p>
        </div>
        {!instance && (
          <Button as={Link} to="/bots/connect" className="w-full sm:w-auto justify-center">
            <Plus size={18} className="mr-2" />
            Connect Bot
          </Button>
        )}
      </div>

      {/* Bot List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bots.map(bot => (
          <Card key={bot.id} className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <Badge variant={bot.status} pill>{bot.status.toUpperCase()}</Badge>
              <div className="flex items-center gap-3">
                <Toggle checked={bot.isOn} onChange={(e) => toggle(e.target.checked)} />
                <button 
                  onClick={() => {
                    if (confirm('Disconnect this bot?')) disconnect();
                  }}
                  className="text-text-light hover:text-danger transition-default"
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 mb-8 min-w-0">
              <h3 className="text-[18px] font-semibold truncate" title={bot.name}>{bot.name}</h3>
              <div className="text-[14px] text-text-secondary">{bot.phone}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border pt-6">
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wider text-text-light font-bold">Messages</div>
                <div className="text-[16px] font-semibold">{bot.messagesToday}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wider text-text-light font-bold">AI Replies</div>
                <div className="text-[16px] font-semibold">{bot.aiResponses}</div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Badge variant="secondary">Keywords: {bot.keywords}</Badge>
              <Badge variant="secondary">Services: {bot.services}</Badge>
            </div>
          </Card>
        ))}

        {/* Connect New Bot Card */}
        {!instance && (
          <Link 
            to="/bots/connect"
            className="group block"
          >
            <Card className="h-full border-dashed border-2 border-border flex flex-col items-center justify-center p-8 py-12 bg-transparent hover:bg-surface transition-default text-center">
              <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-4 group-hover:scale-110 transition-default">
                <Plus size={24} className="text-text-secondary" />
              </div>
              <h3 className="text-[16px] font-semibold">Connect New Bot</h3>
              <p className="text-[13px] text-text-light mt-1">Add another WhatsApp number</p>
            </Card>
          </Link>
        )}
      </div>

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

export default BotsPage;
