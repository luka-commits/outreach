import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, Target, Clock, TrendingUp, MessageSquare } from 'lucide-react';

interface Tip {
  id: string;
  title: string;
  content: string;
  icon: React.ReactNode;
}

const TIPS: Tip[] = [
  {
    id: 'consistency',
    title: 'Consistency beats volume',
    content:
      'Reaching out to 20 leads daily is more effective than 100 leads once a week. Set realistic daily goals and stick to them. The Task Queue helps you stay on track.',
    icon: <Target size={18} />,
  },
  {
    id: 'timing',
    title: 'Time your follow-ups right',
    content:
      'Most deals happen after 5+ touches. Use Strategies to automate your follow-up schedule. A typical sequence: Day 1, Day 3, Day 7, Day 14, Day 30.',
    icon: <Clock size={18} />,
  },
  {
    id: 'personalization',
    title: 'Personalize your outreach',
    content:
      'Reference something specific about their business. Use the notes field to track details you can mention in follow-ups. Generic templates get ignored.',
    icon: <MessageSquare size={18} />,
  },
  {
    id: 'multi-channel',
    title: 'Use multiple channels',
    content:
      'Combine email, calls, and social outreach. If someone doesn\'t respond on one channel, try another. Strategies can mix channels across steps.',
    icon: <TrendingUp size={18} />,
  },
  {
    id: 'tracking',
    title: 'Track everything',
    content:
      'Log every interaction in the activity feed. This helps you pick up conversations seamlessly and shows patterns in what works. Check your Reporting weekly.',
    icon: <Lightbulb size={18} />,
  },
];

interface TipItemProps {
  tip: Tip;
  isExpanded: boolean;
  onToggle: () => void;
}

const TipItem: React.FC<TipItemProps> = ({ tip, isExpanded, onToggle }) => {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 px-1 hover:bg-gray-50/50 transition-colors duration-150"
      >
        <div className="flex items-center gap-3">
          <div className="text-pilot-blue">{tip.icon}</div>
          <span className="font-medium text-gray-900">{tip.title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="pb-4 px-1 pl-10">
          <p className="text-sm text-gray-600 leading-relaxed">{tip.content}</p>
        </div>
      )}
    </div>
  );
};

const ProTips: React.FC = () => {
  const [expandedTips, setExpandedTips] = useState<Set<string>>(new Set());

  const toggleTip = (tipId: string) => {
    setExpandedTips((prev) => {
      const next = new Set(prev);
      if (next.has(tipId)) {
        next.delete(tipId);
      } else {
        next.add(tipId);
      }
      return next;
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
          <Lightbulb size={16} className="text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Pro Tips</h2>
          <p className="text-sm text-gray-500">Best practices for outbound success</p>
        </div>
      </div>

      <div className="mt-4">
        {TIPS.map((tip) => (
          <TipItem
            key={tip.id}
            tip={tip}
            isExpanded={expandedTips.has(tip.id)}
            onToggle={() => toggleTip(tip.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ProTips;
