import React from 'react';
import Card from '../../components/ui/Card';

const StatCard = ({ label, value, subValue, trend }) => (
  <Card className="p-2.5 sm:p-4">
    <div className="text-[10px] sm:text-[12px] text-text-secondary mb-0.5 truncate" title={label}>{label}</div>
    <div className="text-[18px] sm:text-[28px] font-semibold text-text-primary leading-tight font-mono">{value}</div>
    <div className="flex items-center mt-0.5">
      <span className={`text-[9px] sm:text-[11px] ${trend?.startsWith('+') ? 'text-success' : 'text-text-light'} truncate`}>
        {trend || subValue}
      </span>
      {subValue && trend && <span className="text-[9px] sm:text-[11px] text-text-light ml-1 truncate">{subValue}</span>}
    </div>
  </Card>
);

const StatsGrid = ({ stats }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
    <StatCard label="Messages Today" value={stats.messagesToday} subValue="today" />
    <StatCard label="AI Used" value={stats.aiUsed} subValue="this mo." />
    <StatCard label="Keywords Matched" value={stats.keywordsMatched} subValue="today" />
    <StatCard label="Active Bots" value={stats.activeBots} subValue="online" />
  </div>
);

export default StatsGrid;
