import React from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import Card from '../../components/ui/Card';
import Toggle from '../../components/ui/Toggle';
import Badge from '../../components/ui/Badge';

const BotCards = ({ bots, onToggle }) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between px-1">
      <h2 className="text-[13px] sm:text-[16px] font-semibold uppercase tracking-wider text-text-secondary">Your Bots</h2>
      <Link to="/bots" className="text-[12px] font-medium text-accent hover:underline">
        Manage all →
      </Link>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      {bots.map(bot => (
        <Card key={bot.id} className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between mb-3.5 sm:mb-6">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${bot.status === 'connected' ? 'bg-success' : 'bg-text-light'}`} />
              <span className="text-[11px] font-semibold capitalize text-text-secondary tracking-tight">{bot.status}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-text-secondary">Bot: {bot.isOn ? 'ON' : 'OFF'}</span>
              <Toggle checked={bot.isOn} onChange={(e) => onToggle && onToggle(e.target.checked)} />
              <Link to="/bots" className="text-text-light hover:text-primary transition-default p-1 hover:bg-surface-2 rounded">
                <MoreHorizontal size={16} />
              </Link>
            </div>
          </div>

          <div className="mb-3.5 sm:mb-6 min-w-0">
            <h3 className="text-[15px] sm:text-[16px] font-bold truncate tracking-tight" title={bot.name}>{bot.name}</h3>
            <div className="text-[12px] text-text-secondary font-mono">{bot.phone}</div>
          </div>

          <div className="text-[11px] sm:text-[12px] text-text-secondary flex items-center gap-2 border-t border-border pt-3 sm:pt-4">
            <span>{bot.messagesToday} messages today</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{bot.aiResponses} AI responses</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            <Badge variant="secondary" className="!text-[9px] !px-1.5 !py-0.5">Keywords: {bot.keywords}</Badge>
            <Badge variant="secondary" className="!text-[9px] !px-1.5 !py-0.5">Services: {bot.services}</Badge>
          </div>
        </Card>
      ))}
    </div>
  </section>
);

export default BotCards;
