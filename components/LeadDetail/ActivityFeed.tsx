import React, { memo } from 'react';
import {
  History,
  Instagram,
  Facebook,
  Linkedin,
  Mail,
  Phone,
  Footprints,
  Zap,
} from 'lucide-react';
import { Activity } from '../../types';
import { getHistoryColor } from '../../utils/styles';

interface ActivityFeedProps {
  activities: Activity[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = memo(({ activities }) => {
  return (
    <section className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-sm flex flex-col flex-1 min-h-[500px]">
      <header className="flex items-center gap-2 mb-8">
        <History className="text-indigo-600" size={20} />
        <h3 className="text-xl font-black text-slate-900">Lead History</h3>
      </header>

      <div className="space-y-8 relative pl-6 flex-1">
        <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-100 rounded-full" />

        {activities.length > 0 ? (
          activities.map((item, idx) => (
            <div
              key={item.id}
              className="relative group animate-in slide-in-from-left-4 duration-300"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Timeline Icon Dot */}
              <div
                className={`absolute -left-[1.55rem] top-1 w-7 h-7 rounded-lg border-4 border-white shadow-sm flex items-center justify-center z-10 transition-all group-hover:scale-110 ${getHistoryColor(item.platform)}`}
              >
                {getHistoryIcon(item.platform)}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-start">
                  <p className="font-black text-xs text-slate-800 uppercase tracking-tight">
                    {item.action}
                  </p>
                  <span className="text-[10px] font-bold text-slate-300">
                    {new Date(item.timestamp).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {item.note && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white transition-all group-hover:border-indigo-100">
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {item.note}
                    </p>
                  </div>
                )}
                {item.isFirstOutreach && (
                  <span className="inline-block bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-indigo-100 mt-1">
                    Initial Contact
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-40">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <History size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-black text-sm">No activity logged yet.</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Activities will appear here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
});

ActivityFeed.displayName = 'ActivityFeed';

const getHistoryIcon = (platform?: string) => {
  switch (platform) {
    case 'instagram':
      return <Instagram size={12} />;
    case 'facebook':
      return <Facebook size={12} />;
    case 'linkedin':
      return <Linkedin size={12} />;
    case 'email':
      return <Mail size={12} />;
    case 'call':
      return <Phone size={12} />;
    case 'walkIn':
      return <Footprints size={12} />;
    default:
      return <Zap size={12} />;
  }
};

export default ActivityFeed;
