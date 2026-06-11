import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { Loader2 } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import Card from '../components/ui/Card';
import { useAnalytics } from '../hooks/useAnalytics';

const AnalyticsPage = () => {
  const { user } = useUser();
  const { charts, loading } = useAnalytics(user?.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-text-light">
        <Loader2 className="animate-spin mr-3" size={24} />
        Loading analytics...
      </div>
    );
  }

  const chartData = charts?.chartData?.map(d => ({
    day: new Date(d.day).toLocaleDateString([], { weekday: 'short' }),
    count: d.count
  })) || [];

  const breakdownData = charts?.breakdown?.map(b => ({
    name: (b.type || 'unknown').toUpperCase(),
    value: b.count,
    color: b.type === 'ai' ? '#7C3AED' : b.type === 'keyword' ? '#16A34A' : '#A1A1AA'
  })) || [];

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-24 font-semibold">Analytics</h1>
          <p className="text-[14px] text-text-secondary mt-1">
            Track your bot performance and user engagement
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-[16px] font-semibold mb-6">Messages Over Time</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717A' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717A' }} />
                <Tooltip cursor={{ fill: '#F4F4F5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="count" fill="#18181B" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-[16px] font-semibold mb-6">Response Breakdown</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={breakdownData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {breakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                <Legend verticalAlign="bottom" height={36} content={({ payload }) => (
                  <div className="flex justify-center gap-6 mt-4">
                    {payload.map((entry, index) => (
                      <div key={`legend-${index}`} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.payload.color }} />
                        <span className="text-[12px] text-text-secondary">{entry.value} ({entry.payload.value})</span>
                      </div>
                    ))}
                  </div>
                )} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <style>{`
        .animate-in { animation: slideUp 0.4s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AnalyticsPage;
