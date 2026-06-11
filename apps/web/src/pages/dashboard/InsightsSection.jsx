import React, { useState } from 'react';
import { Lightbulb, X, Check, ArrowRight, Sparkles, AlertTriangle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useInsights } from '../../hooks/useInsights';
import { useKeywords } from '../../hooks/useKeywords';
import { Link } from 'react-router-dom';

const InsightsSection = ({ userId }) => {
  const { insights, loading, dismissInsight } = useInsights(userId);
  const { addKeyword } = useKeywords(userId);
  const [applyingId, setApplyingId] = useState(null);

  if (loading || insights.length === 0) return null;

  // Render only the latest/highest-priority active insight to keep the layout extremely clean & compact
  const activeInsight = insights[0];

  const handleApplyAction = async () => {
    setApplyingId(activeInsight.id);
    try {
      if (activeInsight.type === 'SUGGEST_KEYWORD') {
        const { suggestedTrigger, suggestedResponse } = activeInsight.metadata || {};
        if (suggestedTrigger && suggestedResponse) {
          // Instantly create the keyword in their account optimistically!
          await addKeyword({
            triggers: suggestedTrigger,
            response: suggestedResponse,
            matchType: 'contains'
          });
        }
      }
      // Instantly dismiss the insight upon successful action
      await dismissInsight(activeInsight.id);
    } catch (err) {
      console.error("[Insights Apply Error]:", err);
    } finally {
      setApplyingId(null);
    }
  };

  let icon = <Lightbulb size={16} className="text-yellow-500" />;
  let badgeColor = "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
  let actionBtnText = "Apply suggestion";
  let showLink = null;

  if (activeInsight.type === 'UPSELL_OPPORTUNITY') {
    icon = <AlertTriangle size={16} className="text-accent" />;
    badgeColor = "bg-accent/10 text-accent font-bold";
    actionBtnText = "Upgrade Plan";
    showLink = "/billing";
  } else if (activeInsight.type === 'SUGGEST_KEYWORD') {
    icon = <Sparkles size={16} className="text-purple-500 animate-pulse" />;
    badgeColor = "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold";
    actionBtnText = "Automate Now";
  } else if (activeInsight.type === 'PLATFORM_TIP') {
    icon = <Lightbulb size={16} className="text-primary" />;
    badgeColor = "bg-primary/10 text-primary font-bold";
    actionBtnText = "Explore Features";
    showLink = "/services";
  }

  return (
    <div className="relative animate-in">
      <Card className="p-3 sm:p-4 border-2 border-primary/20 bg-primary-glow flex flex-col md:flex-row items-start md:items-center justify-between gap-3 overflow-visible">
        {/* Magic Glowing Border Accent */}
        <div className="absolute -inset-px rounded-card border-2 border-primary/20 animate-pulse pointer-events-none" />

        <div className="flex items-start gap-3 min-w-0 relative z-10">
          <div className="p-2 bg-surface-2 rounded-lg shrink-0 mt-0.5 md:mt-0 shadow-sm border border-border">
            {icon}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${badgeColor}`}>
                {activeInsight.type?.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-text-light font-mono">
                {new Date(activeInsight.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h4 className="text-[13px] font-bold text-text-primary tracking-tight leading-snug">
              {activeInsight.title}
            </h4>
            <p className="text-[12px] text-text-secondary leading-relaxed max-w-2xl">
              {activeInsight.description}
            </p>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 relative z-10 pl-11 md:pl-0">
          {showLink ? (
            <Button 
              as={Link} 
              to={showLink} 
              size="pill" 
              className="!h-7 !px-4 text-[12px] w-full md:w-auto font-semibold shadow-sm"
              onClick={() => dismissInsight(activeInsight.id)}
            >
              {actionBtnText} <ArrowRight size={13} className="ml-1.5" />
            </Button>
          ) : (
            <Button 
              size="pill" 
              className="!h-7 !px-4 text-[12px] w-full md:w-auto font-semibold shadow-sm"
              onClick={handleApplyAction}
              loading={applyingId === activeInsight.id}
            >
              {actionBtnText} <Check size={13} className="ml-1.5" />
            </Button>
          )}

          <button 
            onClick={() => dismissInsight(activeInsight.id)}
            className="p-1.5 rounded-full text-text-light hover:text-primary hover:bg-surface-2 transition-default shadow-sm border border-border bg-background"
            title="Dismiss insight"
          >
            <X size={14} />
          </button>
        </div>
      </Card>
    </div>
  );
};

export default InsightsSection;
