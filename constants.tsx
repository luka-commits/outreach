
import React from 'react';
import { Instagram, Mail, Phone, Facebook, MessageSquare, Zap, Rocket, PhoneCall, Linkedin, Footprints } from 'lucide-react';
import { Strategy, TaskAction } from './types';

export const STRATEGIES: Strategy[] = [
  {
    id: 'call_sequence',
    name: 'Calling Sequence',
    description: 'High-touch phone sequence for direct sales.',
    steps: [
      {
        dayOffset: 0,
        action: 'call',
        template: "Initial call: Introduction and value proposition."
      },
      {
        dayOffset: 2,
        action: 'call',
        template: "Follow-up call: Address objections or provide more info."
      },
      {
        dayOffset: 4,
        action: 'call',
        template: "Final follow-up: Closing the loop or scheduling demo."
      }
    ]
  },
  {
    id: 'customer_dm',
    name: 'Instagram DM Strategy',
    description: 'Instagram DM first, then follow-up next day.',
    steps: [
      {
        dayOffset: 0,
        action: 'send_dm',
        template: "Hey! Do you guys do {service}? Looking for someone in the area..."
      },
      {
        dayOffset: 1,
        action: 'send_dm',
        template: "Hey, just following up on my message yesterday! Wanted to see if you had capacity?"
      }
    ]
  },
  {
    id: 'linkedin_outreach',
    name: 'LinkedIn Professional',
    description: 'Professional connection and follow-up sequence.',
    steps: [
      {
        dayOffset: 0,
        action: 'linkedin_dm',
        template: "Hi {contactName}, I saw your profile and love the work {companyName} is doing. Would love to connect!"
      },
      {
        dayOffset: 3,
        action: 'linkedin_dm',
        template: "Hi {contactName}, thanks for connecting! I'd love to share how we help companies like yours."
      }
    ]
  },
  {
    id: 'startup_pitch',
    name: 'Multi-Channel Pitch',
    description: 'Multi-channel sequence over 5 days.',
    steps: [
      {
        dayOffset: 0,
        action: 'send_email',
        template: "Hi {contactName},\n\nI love what {companyName} is doing. We've built something that could help with your current workflow. Would you be open to a 5-min chat?"
      },
      {
        dayOffset: 2,
        action: 'send_dm',
        template: "Hey {contactName}! Sent you an email a couple of days ago about {companyName}. Check your inbox when you have a sec!"
      },
      {
        dayOffset: 5,
        action: 'fb_message',
        template: "Hi there, just reaching out via FB to see if you saw my previous messages about a potential collaboration?"
      }
    ]
  }
];

export const ACTION_ICONS: Record<TaskAction, React.ReactNode> = {
  send_dm: <Instagram size={18} className="text-pink-500" />,
  send_email: <Mail size={18} className="text-rose-500" />,
  call: <Phone size={18} className="text-emerald-500" />,
  fb_message: <Facebook size={18} className="text-blue-700" />,
  linkedin_dm: <Linkedin size={18} className="text-blue-600" />,
  manual: <MessageSquare size={18} className="text-slate-500" />,
  walk_in: <Footprints size={18} className="text-indigo-500" />
};

export const STRATEGY_ICONS: Record<string, React.ReactNode> = {
  call_sequence: <PhoneCall size={20} className="text-emerald-500" />,
  customer_dm: <Zap size={20} className="text-orange-500" />,
  linkedin_outreach: <Linkedin size={20} className="text-blue-600" />,
  startup_pitch: <Rocket size={20} className="text-indigo-500" />
};
