import React, { memo } from 'react';
import { Sparkles, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { LeadStatus } from '../../types';

interface QualifyModalProps {
  isOpen: boolean;
  companyName: string;
  onClose: () => void;
  onQualify: (status: LeadStatus) => void;
}

const QualifyModal: React.FC<QualifyModalProps> = memo(({
  isOpen,
  companyName,
  onClose,
  onQualify,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-t-[3rem] md:rounded-[3rem] p-10 animate-in slide-in-from-bottom duration-300">
        <h3 className="text-2xl font-black mb-8 text-center text-slate-900">
          Qualify {companyName}
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <QualifyOption
            icon={<Sparkles className="text-emerald-500" />}
            label="Interested"
            desc="High potential target fit."
            onClick={() => onQualify('qualified')}
            color="hover:bg-emerald-50 hover:border-emerald-200"
          />
          <QualifyOption
            icon={<CheckCircle2 className="text-blue-500" />}
            label="Responded"
            desc="Wait for further engagement."
            onClick={() => onQualify('replied')}
            color="hover:bg-blue-50 hover:border-blue-200"
          />
          <QualifyOption
            icon={<MoreHorizontal className="text-slate-500" />}
            label="Disqualify"
            desc="No interest or poor fit."
            onClick={() => onQualify('disqualified')}
            color="hover:bg-slate-50 hover:border-slate-200"
          />
        </div>
        <button
          onClick={onClose}
          className="mt-8 w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors uppercase tracking-widest text-[10px]"
        >
          Close Selection
        </button>
      </div>
    </div>
  );
});

QualifyModal.displayName = 'QualifyModal';

const QualifyOption: React.FC<{
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
  color: string;
}> = ({ icon, label, desc, onClick, color }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-5 p-6 rounded-[2rem] border border-slate-100 text-left transition-all ${color}`}
  >
    <div className="p-4 bg-white rounded-2xl shadow-sm">{icon}</div>
    <div>
      <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">
        {label}
      </h4>
      <p className="text-xs text-slate-500 font-medium">{desc}</p>
    </div>
  </button>
);

export default QualifyModal;
