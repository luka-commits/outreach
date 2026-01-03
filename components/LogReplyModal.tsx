import React, { useState } from 'react';
import { X, MessageCircle, Mail, Phone, Instagram, Facebook, Linkedin, Footprints, Check } from 'lucide-react';
import { Activity } from '../types';

interface LogReplyModalProps {
  isOpen: boolean;
  leadName: string;
  onClose: () => void;
  onSubmit: (data: {
    platform: Activity['platform'];
    note: string;
    updateStatus: boolean;
  }) => void;
}

const PLATFORMS: { value: Activity['platform']; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'email', label: 'Email', icon: <Mail size={18} />, color: 'bg-rose-500' },
  { value: 'instagram', label: 'Instagram', icon: <Instagram size={18} />, color: 'bg-gradient-to-br from-pink-500 to-purple-600' },
  { value: 'facebook', label: 'Facebook', icon: <Facebook size={18} />, color: 'bg-blue-600' },
  { value: 'linkedin', label: 'LinkedIn', icon: <Linkedin size={18} />, color: 'bg-sky-600' },
  { value: 'call', label: 'Phone Call', icon: <Phone size={18} />, color: 'bg-emerald-500' },
  { value: 'walkIn', label: 'In-Person', icon: <Footprints size={18} />, color: 'bg-violet-500' },
];

const LogReplyModal: React.FC<LogReplyModalProps> = ({
  isOpen,
  leadName,
  onClose,
  onSubmit,
}) => {
  const [platform, setPlatform] = useState<Activity['platform']>('email');
  const [note, setNote] = useState('');
  const [updateStatus, setUpdateStatus] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({ platform, note, updateStatus });
    // Reset form
    setPlatform('email');
    setNote('');
    setUpdateStatus(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-md w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20">
              <MessageCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Log Reply</h3>
              <p className="text-sm text-emerald-100 truncate max-w-[200px]">
                {leadName} responded
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Platform Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
              Reply Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    platform === p.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-md text-white ${p.color}`}>
                    {p.icon}
                  </div>
                  <span className="text-xs font-medium text-slate-600">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
              Notes (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did they say? Any follow-up needed?"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
              rows={3}
            />
          </div>

          {/* Update Status Checkbox */}
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg cursor-pointer group">
            <div
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                updateStatus
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-slate-300 group-hover:border-slate-400'
              }`}
            >
              {updateStatus && <Check size={14} className="text-white" />}
            </div>
            <input
              type="checkbox"
              checked={updateStatus}
              onChange={(e) => setUpdateStatus(e.target.checked)}
              className="sr-only"
            />
            <div>
              <p className="text-sm font-medium text-slate-700">
                Update status to "Replied"
              </p>
              <p className="text-xs text-slate-500">
                Automatically change lead status when logging this reply
              </p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-md hover:bg-emerald-600 transition-colors"
          >
            Log Reply
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogReplyModal;
