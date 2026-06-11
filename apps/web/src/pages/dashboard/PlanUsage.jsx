import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const PlanUsage = ({ stats, plan = 'TRIAL', aiExpiryDate }) => {
  const currentLimit = stats?.aiLimit || 25;
  const currentUsage = stats?.aiUsed || 0;
  const remainingMsgs = Math.max(0, currentLimit - currentUsage);

  let expiryText = "Trial (No Expiry)";
  if (aiExpiryDate) {
    const daysLeft = Math.ceil((new Date(aiExpiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    expiryText = daysLeft > 0 ? `Expires in ${daysLeft} Days` : "Expired";
  }

  return (
    <Card className="p-3.5 sm:p-6 bg-accent-glow relative overflow-hidden group">
      <div className="flex items-center justify-between mb-3 sm:mb-6">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] sm:text-[12px] font-bold tracking-widest uppercase">Message Balance</span>
          <Badge variant={remainingMsgs > 0 ? 'connected' : 'disconnected'}>{remainingMsgs > 0 ? 'Active' : 'Empty'}</Badge>
        </div>
        <Button as={Link} to="/billing" size="pill" variant="pro" className="!h-5 sm:!h-6 !px-2.5 text-[11px]">Top-up</Button>
      </div>
      
      <div className="space-y-3 sm:space-y-4">
        <div>
          <div className="flex justify-between text-[11px] sm:text-[13px] font-medium mb-1.5">
            <span>{remainingMsgs} Messages Left</span>
            <span className="text-text-secondary">{expiryText}</span>
          </div>
          <div className="h-1.5 sm:h-2 w-full bg-white/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500" 
              style={{ width: `${(remainingMsgs / Math.max(currentLimit, 1)) * 100}%` }}
            />
          </div>
        </div>
        <div className="text-[11px] sm:text-[13px] font-medium">
          Active Bots: <span className="text-text-secondary">{stats?.activeBots || 0} / 1</span>
        </div>
      </div>
    </Card>
  );
};

export default PlanUsage;
