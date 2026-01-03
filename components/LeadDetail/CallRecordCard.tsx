import React, { memo, useState } from 'react';
import {
  Phone,
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  FileText,
  Sparkles,
  CheckCircle,
  XCircle,
  Voicemail,
  PhoneMissed,
  AlertCircle,
} from 'lucide-react';
import { CallRecord, CallOutcome } from '../../types';

interface CallRecordCardProps {
  record: CallRecord;
}

const OUTCOME_CONFIG: Record<CallOutcome, { label: string; icon: React.ReactNode; colorClass: string }> = {
  connected: {
    label: 'Connected',
    icon: <CheckCircle size={14} />,
    colorClass: 'bg-emerald-100 text-emerald-700',
  },
  voicemail: {
    label: 'Voicemail',
    icon: <Voicemail size={14} />,
    colorClass: 'bg-amber-100 text-amber-700',
  },
  no_answer: {
    label: 'No Answer',
    icon: <PhoneMissed size={14} />,
    colorClass: 'bg-slate-100 text-slate-600',
  },
  busy: {
    label: 'Busy',
    icon: <AlertCircle size={14} />,
    colorClass: 'bg-orange-100 text-orange-700',
  },
  wrong_number: {
    label: 'Wrong Number',
    icon: <XCircle size={14} />,
    colorClass: 'bg-rose-100 text-rose-700',
  },
};

const CallRecordCard: React.FC<CallRecordCardProps> = memo(({ record }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const outcomeConfig = record.outcome ? OUTCOME_CONFIG[record.outcome] : null;

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePlayPause = () => {
    if (!record.recordingUrl) return;

    if (!audioRef) {
      const audio = new Audio(record.recordingUrl);
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

  const hasExpandableContent = record.aiSummary || record.transcription || record.notes;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-all">
      {/* Header Row */}
      <div
        className={`p-4 flex items-center gap-4 ${hasExpandableContent ? 'cursor-pointer' : ''}`}
        onClick={() => hasExpandableContent && setIsExpanded(!isExpanded)}
      >
        {/* Phone Icon */}
        <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
          <Phone size={18} />
        </div>

        {/* Call Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">Call</span>
            {outcomeConfig && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${outcomeConfig.colorClass}`}>
                {outcomeConfig.icon}
                {outcomeConfig.label}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDateTime(record.startedAt)}
          </p>
        </div>

        {/* Duration Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl">
          <Clock size={14} className="text-slate-500" />
          <span className="text-sm font-bold text-slate-700">
            {formatDuration(record.durationSeconds)}
          </span>
        </div>

        {/* Recording Button (if available) */}
        {record.recordingUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPause();
            }}
            className={`p-2 rounded-xl transition-all ${
              isPlaying
                ? 'bg-indigo-500 text-white'
                : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
            }`}
            title={isPlaying ? 'Pause recording' : 'Play recording'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
        )}

        {/* Expand/Collapse Button */}
        {hasExpandableContent && (
          <div className="text-slate-400">
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        )}
      </div>

      {/* Expandable Content */}
      {isExpanded && hasExpandableContent && (
        <div className="px-4 pb-4 pt-0 space-y-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
          {/* AI Summary */}
          {record.aiSummary && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-purple-500" />
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">
                  AI Summary
                </span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed bg-purple-50 p-3 rounded-xl border border-purple-100">
                {record.aiSummary}
              </p>
            </div>
          )}

          {/* Transcription */}
          {record.transcription && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-indigo-500" />
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                  Transcript
                </span>
              </div>
              <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 max-h-48 overflow-y-auto">
                {record.transcription}
              </div>
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-slate-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Notes
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {record.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CallRecordCard.displayName = 'CallRecordCard';

export default CallRecordCard;
