import React, { useState } from 'react';
import { X, UserPlus, Building, Mail, Phone, Globe, Instagram, Facebook, Linkedin, MapPin } from 'lucide-react';
import { Lead } from '../types';
import { useSubscription } from '../hooks/useSubscription';

interface LeadAddFormProps {
  onClose: () => void;
  onAdd: (lead: Lead) => void;
  currentLeadCount: number;
}

const LeadAddForm: React.FC<LeadAddFormProps> = ({ onClose, onAdd, currentLeadCount }) => {
  const { checkLimit, limits, isPro } = useSubscription();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    websiteUrl: '',
    instagramUrl: '',
    facebookUrl: '',
    linkedinUrl: '',
    address: '', // Added address
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check Limit
    if (!checkLimit(currentLeadCount, 'leads')) {
      setError(`Limit reached! Free plan is limited to ${limits.maxLeads} leads.Upgrade to Pro.`);
      return;
    }

    if (!formData.companyName) return;

    const newLead: Lead = {
      id: crypto.randomUUID(),
      ...formData,
      currentStepIndex: 0,
      status: 'not_contacted',
      createdAt: new Date().toISOString()
    };

    onAdd(newLead);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 animate-in zoom-in duration-300 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-8 right-8 p-3 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 rounded-2xl">
          <X size={24} />
        </button>

        <header className="mb-10 text-center">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
            <UserPlus size={40} />
          </div>
          <h3 className="text-4xl font-black text-slate-900 tracking-tight">New Lead</h3>
          <p className="text-slate-500 mt-2 font-medium">Create a single entry for manual outreach tracking.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8 max-h-[70vh] overflow-y-auto pr-4 scrollbar-hide">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-bold text-center">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company & Contact</h4>
              <FormInput icon={<Building size={18} />} name="companyName" placeholder="Company Name *" value={formData.companyName} onChange={handleChange} required />
              <FormInput icon={<UserPlus size={18} />} name="contactName" placeholder="Contact Person" value={formData.contactName} onChange={handleChange} />
              <FormInput icon={<Mail size={18} />} name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} type="email" />
              <FormInput icon={<Phone size={18} />} name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} />
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Digital Presence</h4>
              <FormInput icon={<Globe size={18} />} name="websiteUrl" placeholder="Website URL" value={formData.websiteUrl} onChange={handleChange} />
              <FormInput icon={<Instagram size={18} />} name="instagramUrl" placeholder="Instagram URL" value={formData.instagramUrl} onChange={handleChange} />
              <FormInput icon={<Facebook size={18} />} name="facebookUrl" placeholder="Facebook URL" value={formData.facebookUrl} onChange={handleChange} />
              <FormInput icon={<Linkedin size={18} />} name="linkedinUrl" placeholder="LinkedIn URL" value={formData.linkedinUrl} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location Details</h4>
            <div className="relative group">
              <div className="absolute left-6 top-6 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                <MapPin size={20} />
              </div>
              <textarea
                name="address"
                placeholder="Business Physical Address (for Walk-ins)"
                value={formData.address}
                onChange={handleChange}
                className="w-full pl-16 pr-6 py-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-slate-700 font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-400 outline-none transition-all min-h-[100px] resize-none"
              />
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
            <button type="submit" className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]">
              Create Lead Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FormInput: React.FC<{ icon: React.ReactNode, name: string, placeholder: string, value: string, onChange: (e: any) => void, type?: string, required?: boolean }> = ({ icon, name, placeholder, value, onChange, type = "text", required }) => (
  <div className="relative group">
    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
      {icon}
    </div>
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-slate-700 font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-400 outline-none transition-all"
    />
  </div>
);

export default LeadAddForm;
