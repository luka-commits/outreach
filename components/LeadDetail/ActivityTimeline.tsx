import React, { memo, useMemo, useState } from 'react';
import {
  History,
  Instagram,
  Facebook,
  Linkedin,
  Mail,
  Phone,
  Footprints,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Play,
  Pause,
  Clock,
  CheckCircle,
  XCircle,
  Voicemail,
  PhoneMissed,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
} from 'lucide-react';
import { TimelineItem, useUnifiedTimeline } from '../../hooks/queries/useUnifiedTimeline';
import { groupByDate, formatDateGroupHeader } from '../../utils/dateFormat';
import { CallOutcome } from '../../types';

interface ActivityTimelineProps {
  leadId: string;
}

type FilterType = 'all' | 'calls' | 'emails' | 'dms' | 'other';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All Activity' },
  { value: 'calls', label: 'Calls Only' },
  { value: 'emails', label: 'Emails Only' },
  { value: 'dms', label: 'DMs Only' },
  { value: 'other', label: 'Other' },
];

const OUTCOME_CONFIG: Record<CallOutcome, { label: string; icon: React.ReactNode; colorClass: string }> = {
  connected: {
    label: 'Connected',
    icon: <CheckCircle size={12} />,
    colorClass: 'bg-emerald-100 text-emerald-700',
  },
  voicemail: {
    label: 'Voicemail',
    icon: <Voicemail size={12} />,
    colorClass: 'bg-amber-100 text-amber-700',
  },
  no_answer: {
    label: 'No Answer',
    icon: <PhoneMissed size={12} />,
    colorClass: 'bg-slate-100 text-slate-600',
  },
  busy: {
    label: 'Busy',
    icon: <AlertCircle size={12} />,
    colorClass: 'bg-orange-100 text-orange-700',
  },
  wrong_number: {
    label: 'Wrong Number',
    icon: <XCircle size={12} />,
    colorClass: 'bg-rose-100 text-rose-700',
  },
};

const ActivityTimeline: React.FC<ActivityTimelineProps> = memo(({ leadId }) => {
  const { data: timelineItems, isLoading } = useUnifiedTimeline(leadId);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Filter items based on selected filter
  const filteredItems = useMemo(() => {
    if (filter === 'all') return timelineItems;

    return timelineItems.filter((item) => {
      switch (filter) {
        case 'calls':
          return item.type === 'call' || item.platform === 'call';
        case 'emails':
          return item.platform === 'email';
        case 'dms':
          return item.platform === 'instagram' || item.platform === 'facebook' || item.platform === 'linkedin';
        case 'other':
          return item.platform === 'walkIn' || !item.platform;
        default:
          return true;
      }
    });
  }, [timelineItems, filter]);

  // Group by date
  const groupedItems = useMemo(() => {
    const groups = groupByDate(filteredItems, (item) => item.timestamp);
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredItems]);

  if (isLoading) {
    return (
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <header className="flex items-center gap-2 mb-6">
          <History className="text-blue-600" size={20} />
          <h3 className="text-lg font-bold text-slate-900">Activity History</h3>
        </header>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse flex items-center gap-2 text-slate-400">
            <div className="w-4 h-4 bg-slate-200 rounded-full animate-bounce" />
            <span className="text-sm font-medium">Loading activity...</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col flex-1 min-h-[400px]">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <History className="text-blue-600" size={20} />
          <h3 className="text-lg font-bold text-slate-900">Activity History</h3>
          {filteredItems.length > 0 && (
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredItems.length}
            </span>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Filter size={14} />
            {FILTER_OPTIONS.find((o) => o.value === filter)?.label}
            <ChevronDown size={14} />
          </button>

          {showFilterDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowFilterDropdown(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setFilter(option.value);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                      filter === option.value
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      <div className="space-y-6 relative pl-6 flex-1">
        <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-100 rounded-full" />

        {filteredItems.length > 0 ? (
          groupedItems.map(([dateKey, dayItems], groupIdx) => (
            <div key={dateKey} className="space-y-4">
              {/* Date Header */}
              <div className="relative -ml-6 flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center z-10">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                </div>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest bg-white pr-2">
                  {formatDateGroupHeader(dateKey)}
                </span>
              </div>

              {/* Items for this date */}
              {dayItems.map((item, idx) => (
                <TimelineItemCard
                  key={item.id}
                  item={item}
                  animationDelay={(groupIdx * dayItems.length + idx) * 30}
                />
              ))}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 opacity-40">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <History size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium text-sm">No activity logged yet.</p>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">
              Activities will appear here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
});

ActivityTimeline.displayName = 'ActivityTimeline';

// Individual timeline item card
interface TimelineItemCardProps {
  item: TimelineItem;
  animationDelay: number;
}

const TimelineItemCard: React.FC<TimelineItemCardProps> = memo(({ item, animationDelay }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const isCall = item.type === 'call';
  const hasExpandableContent = isCall && (item.aiSummary || item.transcription || item.callNotes);
  const outcomeConfig = item.outcome ? OUTCOME_CONFIG[item.outcome] : null;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.recordingUrl) return;

    if (!audioRef) {
      const audio = new Audio(item.recordingUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      setAudioRef(audio);
      audio.play();
      setIsPlaying(true);
    } else if (isPlaying) {
      audioRef.pause();
      setIsPlaying(false);
    } else {
      audioRef.play();
      setIsPlaying(true);
    }
  };

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`relative group animate-in slide-in-from-left-4 duration-300 ${
        hasExpandableContent ? 'cursor-pointer' : ''
      }`}
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={() => hasExpandableContent && setIsExpanded(!isExpanded)}
    >
      {/* Timeline Icon Dot */}
      <div
        className={`absolute -left-[1.55rem] top-1 w-7 h-7 rounded-lg border-4 border-white shadow-sm flex items-center justify-center z-10 transition-all group-hover:scale-110 ${getTimelineItemColor(item)}`}
      >
        {getTimelineItemIcon(item)}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Direction indicator */}
            {item.direction === 'inbound' ? (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-600" title="Inbound reply">
                <ArrowDownLeft size={10} />
              </span>
            ) : (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600" title="Outbound">
                <ArrowUpRight size={10} />
              </span>
            )}

            {/* Action label */}
            <p className="font-medium text-xs text-slate-800 uppercase tracking-tight">
              {isCall ? 'Call' : item.action}
            </p>

            {/* Call outcome badge */}
            {isCall && outcomeConfig && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${outcomeConfig.colorClass}`}>
                {outcomeConfig.icon}
                {outcomeConfig.label}
              </span>
            )}

            {/* Call duration */}
            {isCall && item.durationSeconds !== undefined && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded-full text-[9px] font-medium text-slate-600">
                <Clock size={10} />
                {formatDuration(item.durationSeconds)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Recording play button */}
            {item.recordingUrl && (
              <button
                onClick={handlePlayPause}
                className={`p-1.5 rounded-lg transition-all ${
                  isPlaying
                    ? 'bg-indigo-500 text-white'
                    : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                }`}
                title={isPlaying ? 'Pause recording' : 'Play recording'}
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              </button>
            )}

            {/* Timestamp */}
            <span className="text-[10px] font-bold text-slate-300">
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {/* Expand indicator for calls */}
            {hasExpandableContent && (
              <div className="text-slate-400">
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            )}
          </div>
        </div>

        {/* Note content for activities */}
        {!isCall && item.note && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-white transition-all group-hover:border-blue-100">
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {item.note}
            </p>
          </div>
        )}

        {/* Expandable content for calls */}
        {isCall && isExpanded && hasExpandableContent && (
          <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
            {item.aiSummary && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles size={12} className="text-purple-500" />
                  <span className="text-[9px] font-bold text-purple-600 uppercase tracking-widest">
                    AI Summary
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed bg-purple-50 p-2.5 rounded-lg border border-purple-100">
                  {item.aiSummary}
                </p>
              </div>
            )}

            {item.transcription && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText size={12} className="text-indigo-500" />
                  <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">
                    Transcript
                  </span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-h-32 overflow-y-auto">
                  {item.transcription}
                </div>
              </div>
            )}

            {item.callNotes && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText size={12} className="text-slate-500" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    Notes
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.callNotes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* First outreach badge */}
        {item.isFirstOutreach && (
          <span className="inline-block bg-blue-50 text-blue-600 text-[8px] font-medium uppercase px-2 py-0.5 rounded border border-blue-100 mt-1">
            Initial Contact
          </span>
        )}
      </div>
    </div>
  );
});

TimelineItemCard.displayName = 'TimelineItemCard';

// Helper functions
function getTimelineItemIcon(item: TimelineItem) {
  if (item.type === 'call') return <Phone size={12} />;

  switch (item.platform) {
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
}

function getTimelineItemColor(item: TimelineItem): string {
  if (item.type === 'call') return 'bg-emerald-100 text-emerald-600';

  switch (item.platform) {
    case 'instagram':
      return 'bg-gradient-to-br from-purple-500 to-pink-500 text-white';
    case 'facebook':
      return 'bg-blue-600 text-white';
    case 'linkedin':
      return 'bg-blue-700 text-white';
    case 'email':
      return 'bg-amber-100 text-amber-600';
    case 'call':
      return 'bg-emerald-100 text-emerald-600';
    case 'walkIn':
      return 'bg-teal-100 text-teal-600';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export default ActivityTimeline;
