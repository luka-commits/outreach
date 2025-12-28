import React, { memo, useState } from 'react';
import { MessageSquare, Send, Instagram, Phone, Mail, User } from 'lucide-react';
import { Activity } from '../../types';

interface ActivityComposerProps {
  onSubmit: (note: string, platform: Activity['platform'] | undefined) => void;
}

const ActivityComposer: React.FC<ActivityComposerProps> = memo(({ onSubmit }) => {
  const [composerNote, setComposerNote] = useState('');
  const [composerPlatform, setComposerPlatform] = useState<Activity['platform'] | 'note'>(
    'note'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerNote.trim()) return;

    onSubmit(composerNote, composerPlatform === 'note' ? undefined : composerPlatform);

    setComposerNote('');
    setComposerPlatform('note');
  };

  return (
    <section className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-sm flex flex-col space-y-6">
      <header className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <MessageSquare className="text-indigo-600" size={20} /> Log Touchpoint
        </h3>
        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
          <ComposerToggle
            active={composerPlatform === 'note'}
            icon={<User size={14} />}
            onClick={() => setComposerPlatform('note')}
          />
          <ComposerToggle
            active={composerPlatform === 'instagram'}
            icon={<Instagram size={14} />}
            onClick={() => setComposerPlatform('instagram')}
          />
          <ComposerToggle
            active={composerPlatform === 'call'}
            icon={<Phone size={14} />}
            onClick={() => setComposerPlatform('call')}
          />
          <ComposerToggle
            active={composerPlatform === 'email'}
            icon={<Mail size={14} />}
            onClick={() => setComposerPlatform('email')}
          />
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={composerNote}
          onChange={(e) => setComposerNote(e.target.value)}
          placeholder={`Write a detailed note about your ${composerPlatform === 'note' ? 'observation' : composerPlatform}...`}
          className="w-full min-h-[120px] p-5 bg-slate-50 border border-slate-200 rounded-[2rem] font-medium text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 outline-none transition-all resize-none"
        />
        <button
          type="submit"
          disabled={!composerNote.trim()}
          className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:bg-slate-200 disabled:shadow-none transition-all"
        >
          <Send size={18} /> Save Detailed Log
        </button>
      </form>
    </section>
  );
});

ActivityComposer.displayName = 'ActivityComposer';

const ComposerToggle: React.FC<{
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ active, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-2.5 rounded-lg transition-all ${
      active
        ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
        : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    {icon}
  </button>
);

export default ActivityComposer;
