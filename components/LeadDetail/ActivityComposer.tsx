import React, { memo, useState, useEffect } from 'react';
import {
  MessageSquare,
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
} from 'lucide-react';
import { Activity, TaskAction } from '../../types';

export type ComposerChannel = Activity['platform'] | 'note';

interface ActivityComposerProps {
  onSubmit: (
    note: string,
    platform: Activity['platform'] | undefined,
    scheduleFollowUp?: { hours: number | null; customDate?: string; note?: string }
  ) => void;
  initialChannel?: ComposerChannel;
  onChannelChange?: (channel: ComposerChannel) => void;
}

const CHANNELS: {
  id: ComposerChannel;
  icon: React.ReactNode;
  label: string;
  color: string;
}[] = [
  { id: 'instagram', icon: <Instagram size={16} />, label: 'DM', color: 'from-pink-500 to-purple-600' },
  { id: 'email', icon: <Mail size={16} />, label: 'Email', color: 'from-rose-500 to-red-600' },
  { id: 'call', icon: <Phone size={16} />, label: 'Call', color: 'from-emerald-500 to-green-600' },
  { id: 'facebook', icon: <Facebook size={16} />, label: 'FB', color: 'from-blue-500 to-blue-600' },
  { id: 'linkedin', icon: <Linkedin size={16} />, label: 'LI', color: 'from-sky-500 to-blue-700' },
  { id: 'walkIn', icon: <Footprints size={16} />, label: 'Walk-in', color: 'from-violet-500 to-purple-600' },
  { id: 'note', icon: <StickyNote size={16} />, label: 'Note', color: 'from-slate-400 to-slate-500' },
];

const ActivityComposer: React.FC<ActivityComposerProps> = memo(({
  onSubmit,
  initialChannel = 'note',
  onChannelChange,
}) => {
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState<ComposerChannel>(initialChannel);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleNote, setScheduleNote] = useState('');

  // Update channel when initialChannel changes (e.g., from NextActionCard)
  useEffect(() => {
    setChannel(initialChannel);
  }, [initialChannel]);

  const handleChannelChange = (newChannel: ComposerChannel) => {
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

    let scheduleData: { hours: number | null; customDate?: string; note?: string };

    if (customDate) {
      scheduleData = { hours: null, customDate, note: scheduleNote };
    } else {
      scheduleData = { hours, note: scheduleNote };
    }

    onSubmit(
      note,
      channel === 'note' ? undefined : channel,
      scheduleData
    );

    setNote('');
    setScheduleNote('');
    setShowSchedule(false);
  };

  const getPlaceholder = () => {
    switch (channel) {
      case 'instagram':
        return 'Write about your Instagram DM interaction...';
      case 'email':
        return 'Describe the email you sent or received...';
      case 'call':
        return 'Notes about the call (outcome, discussed topics, next steps)...';
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
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-indigo-600" size={18} />
          <h3 className="text-sm font-bold text-slate-900">Log Activity</h3>
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4 p-1 bg-slate-100 rounded-lg">
        {CHANNELS.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => handleChannelChange(ch.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              channel === ch.id
                ? `bg-gradient-to-r ${ch.color} text-white shadow-sm`
                : 'text-slate-500 hover:text-slate-700 hover:bg-white'
            }`}
          >
            {ch.icon}
            <span className="hidden sm:inline">{ch.label}</span>
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Text Area */}
        <div className="relative">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-full min-h-[100px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all resize-none"
          />
          {activeChannel && channel !== 'note' && (
            <div className={`absolute top-3 right-3 p-1.5 rounded-md bg-gradient-to-r ${activeChannel.color} text-white`}>
              {activeChannel.icon}
            </div>
          )}
        </div>

        {/* Schedule Follow-up Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowSchedule(!showSchedule)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              showSchedule
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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

          {/* Schedule Options */}
          {showSchedule && (
            <div className="mt-3 p-4 bg-blue-50 border border-blue-100 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <ScheduleButton
                  icon={<Clock size={14} />}
                  label="1 Hour"
                  onClick={() => handleQuickSchedule(1)}
                  disabled={!note.trim()}
                />
                <ScheduleButton
                  icon={<Calendar size={14} />}
                  label="Tomorrow"
                  onClick={() => handleQuickSchedule(24)}
                  disabled={!note.trim()}
                />
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
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!note.trim()}
          className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all"
        >
          <Send size={16} />
          Save Activity
        </button>
      </form>
    </div>
  );
});

ActivityComposer.displayName = 'ActivityComposer';

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
    className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-blue-200 rounded-lg text-center hover:bg-blue-100 hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <span className="text-blue-600">{icon}</span>
    <span className="text-[10px] font-medium text-slate-600">{label}</span>
  </button>
);

// Helper to map strategy action to composer channel
export function actionToChannel(action: TaskAction): ComposerChannel {
  switch (action) {
    case 'send_dm':
      return 'instagram';
    case 'send_email':
      return 'email';
    case 'call':
      return 'call';
    case 'fb_message':
      return 'facebook';
    case 'linkedin_dm':
      return 'linkedin';
    case 'walk_in':
      return 'walkIn';
    default:
      return 'note';
  }
}

export default ActivityComposer;
