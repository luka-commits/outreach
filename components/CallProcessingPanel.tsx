import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { Lead, CallOutcome, CallRecord } from '../types';
import { useTwilioDevice } from '../hooks/useTwilioDevice';
import { useCreateCallRecord, useUpdateCallRecord } from '../hooks/queries/useCallRecordsQuery';
import { useHasTwilioConfigured } from '../hooks/queries/useTwilioCredentialsQuery';

interface CallProcessingPanelProps {
  lead: Lead;
  script?: string;
  template?: string;
  onOutcome: (outcome: CallOutcome, notes: string, durationSeconds: number) => void;
  onSkip: () => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const CallProcessingPanel: React.FC<CallProcessingPanelProps> = ({
  lead,
  script,
  template,
  onOutcome,
  onSkip,
}) => {
  const [notes, setNotes] = useState('');
  const [showScript, setShowScript] = useState(true);
  const [currentCallRecord, setCurrentCallRecord] = useState<CallRecord | null>(null);
  const [callEnded, setCallEnded] = useState(false);
  const [finalDuration, setFinalDuration] = useState(0);

  const {
    deviceStatus,
    callStatus,
    isMuted,
    callDuration,
    initialize,
    makeCall,
    hangUp,
    toggleMute,
  } = useTwilioDevice();

  const { isConfigured: twilioConfigured, isLoading: twilioLoading, credentials } = useHasTwilioConfigured();
  const createCallRecord = useCreateCallRecord();
  const updateCallRecord = useUpdateCallRecord();

  // Initialize Twilio device when component mounts
  useEffect(() => {
    if (twilioConfigured && deviceStatus === 'offline') {
      initialize();
    }
  }, [twilioConfigured, deviceStatus, initialize]);

  // Track when call ends
  useEffect(() => {
    if (callStatus === 'completed' || callStatus === 'failed') {
      setCallEnded(true);
      setFinalDuration(callDuration);
    }
  }, [callStatus, callDuration]);

  const handleDial = async () => {
    if (!lead.phone || !credentials?.phoneNumber) return;

    try {
      // Create call record first
      const record = await createCallRecord.mutateAsync({
        leadId: lead.id,
        fromNumber: credentials.phoneNumber,
        toNumber: lead.phone,
      });
      setCurrentCallRecord(record);

      // Make the call
      await makeCall(lead.phone, record.id);
    } catch (error) {
      console.error('Failed to initiate call:', error);
    }
  };

  const handleHangUp = () => {
    hangUp();
  };

  const handleOutcome = async (outcome: CallOutcome) => {
    // Update call record with outcome
    if (currentCallRecord) {
      await updateCallRecord.mutateAsync({
        callId: currentCallRecord.id,
        leadId: lead.id,
        updates: {
          outcome,
          notes: notes || undefined,
          durationSeconds: finalDuration || callDuration,
          endedAt: new Date().toISOString(),
        },
      });
    }

    onOutcome(outcome, notes, finalDuration || callDuration);
  };

  const addQuickNote = (note: string) => {
    setNotes((prev) => (prev ? `${prev}\n${note}` : note));
  };

  // Not configured state
  if (twilioLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!twilioConfigured) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
        <AlertCircle className="mx-auto text-amber-500 mb-3" size={32} />
        <h3 className="font-bold text-amber-800 mb-2">Calling Not Set Up</h3>
        <p className="text-sm text-amber-700 mb-4">
          Go to Settings to connect your Twilio account before making calls.
        </p>
        <button
          onClick={onSkip}
          className="px-4 py-2 bg-amber-100 text-amber-800 font-bold rounded-lg hover:bg-amber-200 transition-colors"
        >
          Skip This Task
        </button>
      </div>
    );
  }

  // No phone number
  if (!lead.phone) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
        <Phone className="mx-auto text-slate-400 mb-3" size={32} />
        <h3 className="font-bold text-slate-700 mb-2">No Phone Number</h3>
        <p className="text-sm text-slate-500 mb-4">
          This lead doesn&apos;t have a phone number. Add one or skip this task.
        </p>
        <button
          onClick={onSkip}
          className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors"
        >
          Skip This Task
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lead Info */}
      <div className="bg-slate-50 rounded-2xl p-4">
        <h3 className="font-black text-lg text-slate-900">{lead.companyName}</h3>
        {lead.contactName && (
          <p className="text-slate-600">{lead.contactName}</p>
        )}
        <p className="text-lg font-mono text-indigo-600 mt-1">{lead.phone}</p>
      </div>

      {/* Script Section */}
      {(script || template) && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowScript(!showScript)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-600" />
              <span className="font-bold text-slate-700">Script / Talking Points</span>
            </div>
            {showScript ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showScript && (
            <div className="px-4 pb-4">
              <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-900 whitespace-pre-wrap">
                {script || template}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Call Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-center gap-6">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            disabled={!callStatus || callStatus === 'completed' || callStatus === 'failed'}
            className={`p-4 rounded-full transition-all ${
              isMuted
                ? 'bg-red-100 text-red-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {/* Duration Display */}
          <div className="text-center min-w-[80px]">
            <div className="text-2xl font-mono font-bold text-slate-900">
              {formatDuration(callEnded ? finalDuration : callDuration)}
            </div>
            <div className="text-xs text-slate-500 uppercase font-bold">
              {callStatus === 'initiated' && 'Connecting...'}
              {callStatus === 'ringing' && 'Ringing...'}
              {callStatus === 'in-progress' && 'In Progress'}
              {callStatus === 'reconnecting' && 'Reconnecting...'}
              {callStatus === 'completed' && 'Completed'}
              {callStatus === 'failed' && 'Failed'}
              {!callStatus && deviceStatus === 'connecting' && 'Initializing...'}
              {!callStatus && deviceStatus === 'ready' && 'Ready'}
              {!callStatus && deviceStatus === 'offline' && 'Offline'}
            </div>
          </div>

          {/* Dial/Hangup Button */}
          {!callStatus || callStatus === 'completed' || callStatus === 'failed' ? (
            <button
              onClick={handleDial}
              disabled={deviceStatus !== 'ready' || createCallRecord.isPending}
              className="p-4 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createCallRecord.isPending || deviceStatus === 'connecting' ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Phone size={24} />
              )}
            </button>
          ) : (
            <button
              onClick={handleHangUp}
              className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <PhoneOff size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Call Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about the call..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
          rows={3}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={() => addQuickNote('Interested - follow up')}
            className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full hover:bg-green-200 transition-colors"
          >
            Interested
          </button>
          <button
            onClick={() => addQuickNote('Call back later')}
            className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full hover:bg-amber-200 transition-colors"
          >
            Call back
          </button>
          <button
            onClick={() => addQuickNote('Not interested')}
            className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full hover:bg-red-200 transition-colors"
          >
            Not interested
          </button>
          <button
            onClick={() => addQuickNote('Left voicemail')}
            className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full hover:bg-slate-200 transition-colors"
          >
            Left VM
          </button>
        </div>
      </div>

      {/* Outcome Buttons */}
      <div className="space-y-3">
        <p className="text-sm font-bold text-slate-500 uppercase">Select Outcome</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleOutcome('connected')}
            disabled={updateCallRecord.isPending}
            className="flex items-center justify-center gap-2 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={18} />
            Connected
          </button>
          <button
            onClick={() => handleOutcome('voicemail')}
            disabled={updateCallRecord.isPending}
            className="flex items-center justify-center gap-2 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            <MessageSquare size={18} />
            Voicemail
          </button>
          <button
            onClick={() => handleOutcome('no_answer')}
            disabled={updateCallRecord.isPending}
            className="flex items-center justify-center gap-2 py-3 bg-slate-500 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            <Clock size={18} />
            No Answer
          </button>
          <button
            onClick={() => handleOutcome('busy')}
            disabled={updateCallRecord.isPending}
            className="flex items-center justify-center gap-2 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            <PhoneOff size={18} />
            Busy
          </button>
        </div>
        <button
          onClick={() => handleOutcome('wrong_number')}
          disabled={updateCallRecord.isPending}
          className="w-full flex items-center justify-center gap-2 py-2 bg-red-100 text-red-600 font-bold rounded-xl hover:bg-red-200 transition-colors disabled:opacity-50"
        >
          <XCircle size={18} />
          Wrong Number
        </button>
      </div>
    </div>
  );
};

export default CallProcessingPanel;
