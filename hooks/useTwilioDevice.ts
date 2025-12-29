import { useState, useCallback, useRef, useEffect } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { useToast } from '../components/Toast';
import { getSession } from '../services/supabase';
import { CallStatus } from '../types';

type DeviceStatus = 'offline' | 'connecting' | 'ready' | 'busy';

interface UseTwilioDeviceReturn {
  deviceStatus: DeviceStatus;
  callStatus: CallStatus | null;
  activeCall: Call | null;
  isMuted: boolean;
  callDuration: number;
  initialize: () => Promise<void>;
  makeCall: (phoneNumber: string, callRecordId: string) => Promise<void>;
  hangUp: () => void;
  toggleMute: () => void;
  cleanup: () => void;
}

export function useTwilioDevice(): UseTwilioDeviceReturn {
  const [device, setDevice] = useState<Device | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>('offline');
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const { showToast } = useToast();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();

  // Fetch Twilio token from Edge Function
  const fetchTwilioToken = useCallback(async (): Promise<string> => {
    const session = await getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/twilio-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get Twilio token');
    }

    const data = await response.json();
    return data.token;
  }, [supabaseUrl]);

  // Initialize Twilio Device
  const initialize = useCallback(async () => {
    if (device) {
      console.log('Device already initialized');
      return;
    }

    try {
      setDeviceStatus('connecting');
      const token = await fetchTwilioToken();

      const newDevice = new Device(token, {
        logLevel: 1, // Errors only
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
      });

      // Device ready
      newDevice.on('registered', () => {
        console.log('Twilio Device registered');
        setDeviceStatus('ready');
      });

      // Device error
      newDevice.on('error', (error) => {
        console.error('Twilio Device error:', error);
        showToast(`Call error: ${error.message}`, 'error');
        setDeviceStatus('offline');
      });

      // Token about to expire - refresh it
      newDevice.on('tokenWillExpire', async () => {
        console.log('Token will expire, refreshing...');
        try {
          const newToken = await fetchTwilioToken();
          newDevice.updateToken(newToken);
        } catch (error) {
          console.error('Failed to refresh token:', error);
          showToast('Session expired. Please reconnect.', 'error');
          setDeviceStatus('offline');
        }
      });

      // Incoming call (we don't handle these, but log for debugging)
      newDevice.on('incoming', (call) => {
        console.log('Incoming call (rejecting):', call);
        call.reject();
      });

      // Register the device
      await newDevice.register();
      setDevice(newDevice);

    } catch (error) {
      console.error('Failed to initialize Twilio Device:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to initialize calling',
        'error'
      );
      setDeviceStatus('offline');
    }
  }, [device, fetchTwilioToken, showToast]);

  // Make an outbound call
  const makeCall = useCallback(async (phoneNumber: string, callRecordId: string) => {
    if (!device) {
      showToast('Calling not initialized. Please wait...', 'error');
      return;
    }

    if (deviceStatus !== 'ready') {
      showToast('Device not ready. Please try again.', 'error');
      return;
    }

    try {
      setDeviceStatus('busy');
      setCallStatus('initiated');

      const call = await device.connect({
        params: {
          To: phoneNumber,
          callRecordId: callRecordId,
        },
      });

      // Call ringing
      call.on('ringing', () => {
        console.log('Call ringing');
        setCallStatus('ringing');
      });

      // Call accepted/connected
      call.on('accept', () => {
        console.log('Call accepted');
        setCallStatus('in-progress');
        callStartTimeRef.current = Date.now();

        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          if (callStartTimeRef.current) {
            setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
          }
        }, 1000);
      });

      // Call reconnecting
      call.on('reconnecting', (error) => {
        console.log('Call reconnecting:', error);
        setCallStatus('reconnecting');
        showToast('Connection unstable, reconnecting...', 'error');
      });

      // Call reconnected
      call.on('reconnected', () => {
        console.log('Call reconnected');
        setCallStatus('in-progress');
      });

      // Call disconnected
      call.on('disconnect', () => {
        console.log('Call disconnected');
        setCallStatus('completed');
        cleanup();
      });

      // Call cancelled
      call.on('cancel', () => {
        console.log('Call cancelled');
        setCallStatus('failed');
        cleanup();
      });

      // Call error
      call.on('error', (error) => {
        console.error('Call error:', error);
        showToast(`Call failed: ${error.message}`, 'error');
        setCallStatus('failed');
        cleanup();
      });

      setActiveCall(call);

    } catch (error) {
      console.error('Failed to make call:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to make call',
        'error'
      );
      setCallStatus('failed');
      setDeviceStatus('ready');
    }
  }, [device, deviceStatus, showToast]);

  // Hang up current call
  const hangUp = useCallback(() => {
    if (activeCall) {
      activeCall.disconnect();
    }
  }, [activeCall]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (activeCall) {
      const newMuteState = !isMuted;
      activeCall.mute(newMuteState);
      setIsMuted(newMuteState);
    }
  }, [activeCall, isMuted]);

  // Cleanup after call ends
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    callStartTimeRef.current = null;
    setActiveCall(null);
    setIsMuted(false);
    setCallDuration(0);
    setDeviceStatus('ready');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (device) {
        device.destroy();
      }
    };
  }, [device]);

  return {
    deviceStatus,
    callStatus,
    activeCall,
    isMuted,
    callDuration,
    initialize,
    makeCall,
    hangUp,
    toggleMute,
    cleanup,
  };
}
