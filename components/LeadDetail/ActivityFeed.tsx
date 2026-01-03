import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import {
  Send,
  Instagram,
  Phone,
  Mail,
  Linkedin,
  Facebook,
  Footprints,
  StickyNote,
  CalendarClock,
  Clock,
  Calendar,
  CheckCircle2,
  Bell,
  X,
  History,
  Filter,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  ArrowUpRight,
  ArrowDownLeft,
  Voicemail,
  PhoneMissed,
  AlertCircle,
  XCircle,
  CheckCircle,
  Sparkles,
  FileText,
  Zap,
} from 'lucide-react';
import { Activity, TaskAction, CallOutcome } from '../../types';
import { TimelineItem, useUnifiedTimeline } from '../../hooks/queries/useUnifiedTimeline';
import { groupByDate, formatDateGroupHeader } from '../../utils/dateFormat';

export type ComposerChannel = Activity['platform'] | 'note';

interface ActivityFeedProps {
  leadId: string;
  onSubmit: (
    note: string,
    platform: Activity['platform'] | undefined,
    scheduleFollowUp?: { hours: number | null; customDate?: string; note?: string }
  ) => void;
  onInitiateCall: () => void;
  onOpenEmailComposer: () => void;
  initialChannel?: ComposerChannel;
  onChannelChange?: (channel: ComposerChannel) => void;
}

const CHANNELS: {
  id: ComposerChannel;
  icon: React.ReactNode;
  label: string;
  color: string;
  isAction?: boolean;
}[] = [
  { id: 'instagram', icon: <Instagram size={16} />, label: 'DM', color: 'from-pink-500 to-purple-600' },
  { id: 'email', icon: <Mail size={16} />, label: 'Email', color: 'from-rose-500 to-red-600', isAction: true },
  { id: 'call', icon: <Phone size={16} />, label: 'Call', color: 'from-emerald-500 to-green-600', isAction: true },
  { id: 'facebook', icon: <Facebook size={16} />, label: 'FB', color: 'from-blue-500 to-blue-600' },
  { id: 'linkedin', icon: <Linkedin size={16} />, label: 'LI', color: 'from-sky-500 to-blue-700' },
  { id: 'walkIn', icon: <Footprints size={16} />, label: 'Walk-in', color: 'from-violet-500 to-purple-600' },
  { id: 'note', icon: <StickyNote size={16} />, label: 'Note', color: 'from-slate-400 to-slate-500' },
];

type FilterType = 'all' | 'calls' | 'emails' | 'dms' | 'other';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All Activity' },
  { value: 'calls', label: 'Calls Only' },
  { value: 'emails', label: 'Emails Only' },
  { value: 'dms', label: 'DMs Only' },
  { value: 'other', label: 'Other' },
];

const OUTCOME_CONFIG: Record<CallOutcome, { label: string; icon: React.ReactNode; colorClass: string }> = {
  connected: { label: 'Connected', icon: <CheckCircle size={12} />, colorClass: 'bg-emerald-100 text-emerald-700' },
  voicemail: { label: 'Voicemail', icon: <Voicemail size={12} />, colorClass: 'bg-amber-100 text-amber-700' },
  no_answer: { label: 'No Answer', icon: <PhoneMissed size={12} />, colorClass: 'bg-slate-100 text-slate-600' },
  busy: { label: 'Busy', icon: <AlertCircle size={12} />, colorClass: 'bg-orange-100 text-orange-700' },
  wrong_number: { label: 'Wrong Number', icon: <XCircle size={12} />, colorClass: 'bg-rose-100 text-rose-700' },
};

const ActivityFeed: React.FC<ActivityFeedProps> = memo(({
  leadId,
  onSubmit,
  onInitiateCall,
  onOpenEmailComposer,
  initialChannel = 'note',
  onChannelChange,
}) => {
  const { data: timelineItems, isLoading, isError, error } = useUnifiedTimeline(leadId);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Composer state
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState<ComposerChannel>(initialChannel);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleNote, setScheduleNote] = useState('');
  const inputRef = useRef<HTMLDivElement>(null);

  // Update channel when initialChannel changes
  useEffect(() => {
    setChannel(initialChannel);
    // Scroll to input when channel changes from external source
    if (initialChannel !== 'note') {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [initialChannel]);

  const handleChannelChange = (newChannel: ComposerChannel) => {
    // Handle special action channels
    if (newChannel === 'call') {
      onInitiateCall();
      return;
    }
    if (newChannel === 'email') {
      onOpenEmailComposer();
      return;
    }

    setChannel(newChannel);
    onChannelChange?.(newChannel);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    onSubmit(
      note,
      channel === 'note' ? undefined : channel,
      showSchedule ? { hours: null, note: scheduleNote } : undefined
    );

    setNote('');
    setScheduleNote('');
    setShowSchedule(false);
  };

  const handleQuickSchedule = (hours: number | null, customDate?: string) => {
    if (!note.trim()) return;

    const scheduleData = customDate
      ? { hours: null, customDate, note: scheduleNote }
      : { hours, note: scheduleNote };

    onSubmit(
      note,
      channel === 'note' ? undefined : channel,
      scheduleData
    );

    setNote('');
    setScheduleNote('');
    setShowSchedule(false);
  };

  // Filter items
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

  const getPlaceholder = () => {
    switch (channel) {
      case 'instagram':
        return 'Write about your Instagram DM interaction...';
      case 'email':
        return 'Describe the email you sent or received...';
      case 'call':
        return 'Notes about the call...';
      case 'facebook':
        return 'Write about your Facebook message...';
      case 'linkedin':
        return 'Describe your LinkedIn interaction...';
      case 'walkIn':
        return 'Notes from the in-person visit...';
      default:
        return 'Write a note about this lead...';
    }
  };

  const activeChannel = CHANNELS.find((c) => c.id === channel);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
      {/* Header with Filter */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={14} className="text-indigo-500" />
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Activity
          </h4>
          {filteredItems.length > 0 && (
            <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
              {filteredItems.length}
            </span>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <Filter size={12} />
            {FILTER_OPTIONS.find((o) => o.value === filter)?.label}
            <ChevronDown size={12} />
          </button>

          {showFilterDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setFilter(option.value);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                      filter === option.value ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto max-h-[400px] p-4">
        {isError ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <AlertCircle size={24} className="text-red-400 mb-2" />
            <p className="text-red-600 font-medium text-sm">Failed to load activities</p>
            <p className="text-slate-400 text-xs mt-1">{error?.message || 'Unknown error'}</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse flex items-center gap-2 text-slate-400">
              <div className="w-4 h-4 bg-slate-200 rounded-full animate-bounce" />
              <span className="text-sm font-medium">Loading activity...</span>
            </div>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="space-y-4 relative pl-6">
            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-100 rounded-full" />
            {groupedItems.map(([dateKey, dayItems]) => (
              <div key={dateKey} className="space-y-3">
                {/* Date Header */}
                <div className="relative -ml-6 flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center z-10">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest bg-white pr-2">
                    {formatDateGroupHeader(dateKey)}
                  </span>
                </div>
                {dayItems.map((item) => (
                  <TimelineItemCard key={item.id} item={item} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-center opacity-50">
            <History size={24} className="text-slate-300 mb-2" />
            <p className="text-slate-500 font-medium text-sm">No activity logged yet</p>
          </div>
        )}
      </div>

      {/* Composer Section */}
      <div ref={inputRef} className="border-t border-slate-200 p-4 bg-slate-50">
        {/* Channel Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-3 p-1 bg-white rounded-lg border border-slate-200">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => handleChannelChange(ch.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                channel === ch.id && !ch.isAction
                  ? `bg-gradient-to-r ${ch.color} text-white shadow-sm`
                  : ch.isAction
                    ? 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {ch.icon}
              <span className="hidden sm:inline">{ch.label}</span>
            </button>
          ))}
        </div>

        {/* Text Area */}
        <form onSubmit={handleSubmit}>
          <div className="relative mb-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full min-h-[80px] p-3 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all resize-none"
            />
            {activeChannel && channel !== 'note' && (
              <div className={`absolute top-2 right-2 p-1 rounded-md bg-gradient-to-r ${activeChannel.color} text-white`}>
                {activeChannel.icon}
              </div>
            )}
          </div>

          {/* Schedule + Submit Row */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowSchedule(!showSchedule)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                showSchedule
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <CalendarClock size={14} />
              Schedule follow-up
              {showSchedule && (
                <X
                  size={14}
                  className="ml-1 hover:text-blue-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSchedule(false);
                  }}
                />
              )}
            </button>

            <button
              type="submit"
              disabled={!note.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all"
            >
              <Send size={14} />
              Save Activity
            </button>
          </div>

          {/* Schedule Options */}
          {showSchedule && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <ScheduleButton icon={<Clock size={14} />} label="1 Hour" onClick={() => handleQuickSchedule(1)} disabled={!note.trim()} />
                <ScheduleButton icon={<Calendar size={14} />} label="Tomorrow" onClick={() => handleQuickSchedule(24)} disabled={!note.trim()} />
                <ScheduleButton
                  icon={<CheckCircle2 size={14} />}
                  label="End of Day"
                  onClick={() => {
                    const date = new Date();
                    date.setHours(17, 0, 0, 0);
                    handleQuickSchedule(null, date.toISOString());
                  }}
                  disabled={!note.trim()}
                />
                <ScheduleButton
                  icon={<Bell size={14} />}
                  label="Next Morning"
                  onClick={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + 1);
                    date.setHours(9, 0, 0, 0);
                    handleQuickSchedule(null, date.toISOString());
                  }}
                  disabled={!note.trim()}
                />
              </div>
              <input
                type="text"
                value={scheduleNote}
                onChange={(e) => setScheduleNote(e.target.value)}
                placeholder="Optional: Add a note for the follow-up..."
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          )}
        </form>
      </div>
    </div>
  );
});

ActivityFeed.displayName = 'ActivityFeed';

// Schedule Button Component
const ScheduleButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex flex-col items-center justify-center gap-1 p-2 bg-white border border-blue-200 rounded-lg text-center hover:bg-blue-100 hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <span className="text-blue-600">{icon}</span>
    <span className="text-[10px] font-medium text-slate-600">{label}</span>
  </button>
);

// Timeline Item Card
const TimelineItemCard: React.FC<{ item: TimelineItem }> = memo(({ item }) => {
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
      className={`relative group ${hasExpandableContent ? 'cursor-pointer' : ''}`}
      onClick={() => hasExpandableContent && setIsExpanded(!isExpanded)}
    >
      {/* Timeline Dot */}
      <div className={`absolute -left-[1.55rem] top-1 w-6 h-6 rounded-lg border-2 border-white shadow-sm flex items-center justify-center z-10 ${getTimelineItemColor(item)}`}>
        {getTimelineItemIcon(item)}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.direction === 'inbound' ? (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-600" title="Inbound">
                <ArrowDownLeft size={10} />
              </span>
            ) : (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600" title="Outbound">
                <ArrowUpRight size={10} />
              </span>
            )}
            <p className="font-medium text-xs text-slate-800 uppercase tracking-tight">
              {isCall ? 'Call' : item.action}
            </p>
            {isCall && outcomeConfig && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${outcomeConfig.colorClass}`}>
                {outcomeConfig.icon}
                {outcomeConfig.label}
              </span>
            )}
            {isCall && item.durationSeconds !== undefined && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded-full text-[9px] font-medium text-slate-600">
                <Clock size={10} />
                {formatDuration(item.durationSeconds)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {item.recordingUrl && (
              <button
                onClick={handlePlayPause}
                className={`p-1.5 rounded-lg transition-all ${
                  isPlaying ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                }`}
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              </button>
            )}
            <span className="text-[10px] font-bold text-slate-300">
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {hasExpandableContent && (
              <div className="text-slate-400">
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            )}
          </div>
        </div>

        {!isCall && item.note && (
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.note}</p>
          </div>
        )}

        {isCall && isExpanded && hasExpandableContent && (
          <div className="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
            {item.aiSummary && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles size={10} className="text-purple-500" />
                  <span className="text-[9px] font-bold text-purple-600 uppercase tracking-widest">AI Summary</span>
                </div>
                <p className="text-xs text-slate-700 bg-purple-50 p-2 rounded-lg border border-purple-100">{item.aiSummary}</p>
              </div>
            )}
            {item.transcription && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <FileText size={10} className="text-indigo-500" />
                  <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">Transcript</span>
                </div>
                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 max-h-24 overflow-y-auto">
                  {item.transcription}
                </div>
              </div>
            )}
            {item.callNotes && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <FileText size={10} className="text-slate-500" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Notes</span>
                </div>
                <p className="text-xs text-slate-600">{item.callNotes}</p>
              </div>
            )}
          </div>
        )}

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

// Helpers
function getTimelineItemIcon(item: TimelineItem) {
  if (item.type === 'call') return <Phone size={10} />;
  switch (item.platform) {
    case 'instagram': return <Instagram size={10} />;
    case 'facebook': return <Facebook size={10} />;
    case 'linkedin': return <Linkedin size={10} />;
    case 'email': return <Mail size={10} />;
    case 'call': return <Phone size={10} />;
    case 'walkIn': return <Footprints size={10} />;
    default: return <Zap size={10} />;
  }
}

function getTimelineItemColor(item: TimelineItem): string {
  if (item.type === 'call') return 'bg-emerald-100 text-emerald-600';
  switch (item.platform) {
    case 'instagram': return 'bg-gradient-to-br from-purple-500 to-pink-500 text-white';
    case 'facebook': return 'bg-blue-600 text-white';
    case 'linkedin': return 'bg-blue-700 text-white';
    case 'email': return 'bg-amber-100 text-amber-600';
    case 'call': return 'bg-emerald-100 text-emerald-600';
    case 'walkIn': return 'bg-teal-100 text-teal-600';
    default: return 'bg-slate-100 text-slate-600';
  }
}

// Helper to map strategy action to composer channel
export function actionToChannel(action: TaskAction): ComposerChannel {
  switch (action) {
    case 'send_dm': return 'instagram';
    case 'send_email': return 'email';
    case 'call': return 'call';
    case 'fb_message': return 'facebook';
    case 'linkedin_dm': return 'linkedin';
    case 'walk_in': return 'walkIn';
    default: return 'note';
  }
}

export default ActivityFeed;
