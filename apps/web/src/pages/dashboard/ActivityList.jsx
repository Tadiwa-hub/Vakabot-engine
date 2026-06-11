import React from 'react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const ActivityList = ({ activity }) => (
  <section className="space-y-3 h-full flex flex-col">
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <h2 className="text-[14px] font-semibold uppercase tracking-wider text-text-secondary">System Console</h2>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
        </span>
      </div>
      <div className="text-[10px] font-bold tracking-widest text-success uppercase bg-success/10 px-2 py-0.5 rounded">
        Live Feed
      </div>
    </div>

    <Card className="flex-1 overflow-hidden border border-border bg-zinc-950 text-zinc-300 rounded-lg shadow-sm font-mono text-[12px]">
      {/* Terminal Bar */}
      <div className="bg-zinc-900 px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        </div>
        <span className="text-[10px] text-zinc-500 select-none">v1.0.0-terminal</span>
      </div>

      <div className="divide-y divide-zinc-900 max-h-[420px] overflow-y-auto">
        {activity.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 italic">
            $ awaiting system events...
          </div>
        ) : (
          activity.map(item => {
            let typeBadgeClass = "bg-zinc-800 text-zinc-300";
            if (item.type === "ai") typeBadgeClass = "bg-purple-950/40 text-purple-300 border border-purple-900/50";
            else if (item.type === "keyword") typeBadgeClass = "bg-green-950/40 text-green-300 border border-green-900/50";
            else if (item.type === "fallback") typeBadgeClass = "bg-yellow-950/40 text-yellow-300 border border-yellow-900/50";

            return (
              <div key={item.id} className="p-3 hover:bg-zinc-900/40 transition-default flex flex-col gap-1.5 border-l-2 border-transparent hover:border-accent">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-accent font-semibold">{`+${item.phone}`}</span>
                    <span className="text-zinc-600">|</span>
                    <span className="text-zinc-500">{item.time}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${typeBadgeClass}`}>
                    {item.type}
                  </span>
                </div>
                <div className="flex items-start gap-1 text-zinc-300 pl-1">
                  <span className="text-zinc-600">&gt;</span>
                  <p className="line-clamp-2 italic leading-relaxed text-zinc-400 break-all">"{item.message}"</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  </section>
);

export default ActivityList;
