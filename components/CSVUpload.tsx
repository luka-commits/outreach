import React, { useRef, useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Loader2, Table, Phone, Mail, MapPin } from 'lucide-react';
import Papa from 'papaparse';
import { Lead } from '../types';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../hooks/useAuth';
import { checkDuplicateCompanies } from '../services/supabase';

interface CSVUploadProps {
  onClose: () => void;
  onUpload: (leads: Lead[]) => void;
  currentLeadCount: number; // We need to know current count to check limit
}

const CSVUpload: React.FC<CSVUploadProps> = ({ onClose, onUpload, currentLeadCount }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedLeads, setParsedLeads] = useState<Lead[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);

  const { checkLimit, isPro, limits } = useSubscription();
  const { user } = useAuth();

  const parseCSVLine = (line: string, delimiter: string) => {
    // Basic CSV Line Parser (covers most cases including quotes)
    const result = [];
    let curValue = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(curValue.trim());
        curValue = "";
      } else {
        curValue += char;
      }
    }
    result.push(curValue.trim());
    return result.map(v => v.replace(/^"|"$/g, '').trim());
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!checkLimit(currentLeadCount, 'leads')) {
      setError(`Limit reached! Free plan is limited to ${limits.maxLeads} leads. Upgrade to Pro.`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setDuplicateCount(0);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let text = event.target?.result as string;
        text = text.replace(/^\uFEFF/, '');

        const rows = text.split(/\r?\n/).filter(row => row.trim().length > 0);
        if (rows.length < 2) {
          setError("File seems empty or has no data rows.");
          setIsProcessing(false);
          return;
        }

        const firstLine = rows[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';

        const headers = parseCSVLine(rows[0], delimiter).map(h => h.toLowerCase().trim());
        const leads: Lead[] = [];

        // Advanced Mapping Aliases for Scrapers (Outscraper, etc.)
        const aliases: Record<string, string[]> = {
          company: ['name', 'company', 'business', 'title', 'company_name'],
          contact: ['contact', 'contact_name', 'owner_title', 'person', 'ansprechpartner', 'name_for_emails'],
          email: ['email', 'email address', 'e-mail', 'mail', 'company_insights.email', 'primary_email'],
          phone: ['phone', 'phone_number', 'tel', 'mobile', 'company_insights.phone', 'contact_phone'],
          website: ['site', 'website', 'url', 'homepage', 'domain'],
          instagram: ['instagram_url', 'instagram', 'ig_url', 'company_insights.instagram'],
          facebook: ['facebook_url', 'facebook', 'fb_url', 'company_insights.facebook'],
          linkedin: ['linkedin_url', 'linkedin', 'li_url', 'company_insights.linkedin'],
          address: ['full_address', 'address', 'street', 'location_address'],
          location: ['city', 'location', 'borough', 'town', 'stadt'],
          niche: ['category', 'niche', 'industry', 'subtypes', 'type', 'company_insights.industry'],
          rating: ['rating', 'google_rating', 'stars', 'bewertung'],
          reviews: ['reviews', 'review_count', 'reviews_count', 'rezensionen'],
          query: ['query', 'search_query']
        };

        const getColumnIndex = (category: string) => {
          // Look for exact matches first
          let idx = headers.findIndex(h => aliases[category].some(alias => h === alias));
          // Then look for includes
          if (idx === -1) {
            idx = headers.findIndex(h => aliases[category].some(alias => h.includes(alias)));
          }
          return idx;
        };

        const idx = {
          company: getColumnIndex('company') === -1 ? 0 : getColumnIndex('company'),
          contact: getColumnIndex('contact'),
          email: getColumnIndex('email'),
          phone: getColumnIndex('phone'),
          website: getColumnIndex('website'),
          instagram: getColumnIndex('instagram'),
          facebook: getColumnIndex('facebook'),
          linkedin: getColumnIndex('linkedin'),
          address: getColumnIndex('address'),
          location: getColumnIndex('location'),
          niche: getColumnIndex('niche'),
          rating: getColumnIndex('rating'),
          reviews: getColumnIndex('reviews'),
          query: getColumnIndex('query')
        };

        for (let i = 1; i < rows.length; i++) {
          const cols = parseCSVLine(rows[i], delimiter);
          if (cols.length < 1) continue;

          // Enforce Limit During Parsing if adding multiple
          if (!checkLimit(currentLeadCount + leads.length, 'leads')) {
            setError(`Import stopped at ${leads.length} leads. Limit of ${limits.maxLeads} reached.`);
            break;
          }

          const parseNum = (val: string) => {
            if (!val) return undefined;
            const normalized = val.replace(',', '.');
            const num = parseFloat(normalized);
            return isNaN(num) ? undefined : num;
          };

          let derivedLocation = idx.location !== -1 ? cols[idx.location] : undefined;
          let derivedNiche = idx.niche !== -1 ? cols[idx.niche] : undefined;

          if (!derivedLocation && idx.query !== -1 && cols[idx.query]) {
            const parts = cols[idx.query].split(',').map(p => p.trim());
            derivedLocation = parts[2] || parts[parts.length - 2];
          }

          leads.push({
            id: crypto.randomUUID(),
            companyName: cols[idx.company] || 'Unnamed Lead',
            contactName: idx.contact !== -1 ? cols[idx.contact] : undefined,
            email: idx.email !== -1 ? cols[idx.email] : undefined,
            phone: idx.phone !== -1 ? cols[idx.phone] : undefined,
            websiteUrl: idx.website !== -1 ? cols[idx.website] : undefined,
            instagramUrl: idx.instagram !== -1 ? cols[idx.instagram] : undefined,
            facebookUrl: idx.facebook !== -1 ? cols[idx.facebook] : undefined,
            linkedinUrl: idx.linkedin !== -1 ? cols[idx.linkedin] : undefined,
            address: idx.address !== -1 ? cols[idx.address] : undefined,
            location: derivedLocation,
            niche: derivedNiche,
            googleRating: idx.rating !== -1 ? parseNum(cols[idx.rating]) : undefined,
            googleReviewCount: idx.reviews !== -1 ? Math.floor(parseNum(cols[idx.reviews]) || 0) : undefined,
            currentStepIndex: 0,
            status: 'not_contacted',
            createdAt: new Date().toISOString()
          });
        }

        setParsedLeads(leads);
        setIsProcessing(false);
      } catch (err) {
        setError("Error parsing the CSV file. Check delimiter and encoding.");
        setIsProcessing(false);
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const confirmUpload = async () => {
    if (parsedLeads.length === 0) return;

    if (!user) {
      setError("You must be logged in to import.");
      return;
    }

    try {
      setIsProcessing(true);

      // Perform Duplicate Check
      const companyNames = parsedLeads.map(l => l.companyName);
      const uniqueNames = Array.from(new Set(companyNames));

      const existingCompanies = await checkDuplicateCompanies(user.id, uniqueNames);

      const newLeads = parsedLeads.filter(l => !existingCompanies.includes(l.companyName));
      const duplicates = parsedLeads.length - newLeads.length;

      if (duplicates > 0) {
        setDuplicateCount(duplicates);
        // Notify user about skipped duplicates
        alert(`${newLeads.length} Leads importiert, ${duplicates} Duplikate übersprungen.`);
      }

      if (newLeads.length === 0) {
        setError(`All ${parsedLeads.length} leads were duplicates and skipped.`);
        setIsProcessing(false);
        return;
      }

      onUpload(newLeads);

    } catch (err) {
      console.error('Duplicate check failed:', err);
      setError("Failed to verify duplicates. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 animate-in zoom-in duration-300 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-8 right-8 p-3 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 rounded-2xl">
          <X size={24} />
        </button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <Upload size={40} />
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">Lead Import Engine</h3>
          <p className="text-slate-500 mt-2 text-sm font-medium">Outscraper & Google Maps data auto-detected.</p>
        </div>

        <div className="space-y-8">
          <div className={`bg-slate-50 border-4 border-dashed rounded-[2.5rem] p-10 text-center transition-all min-h-[220px] flex flex-col items-center justify-center ${error ? 'border-rose-200 bg-rose-50' : 'border-slate-100 hover:border-indigo-200 hover:bg-white'}`}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />

            {isProcessing ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={48} className="text-indigo-600 animate-spin" />
                <p className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Scanning Data Structure...</p>
              </div>
            ) : parsedLeads.length === 0 ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-slate-400 text-sm font-medium px-10">Supports standard CSVs and deep-data scraper exports.</p>
                  <p className="text-indigo-500 text-xs font-bold bg-indigo-50 px-3 py-1 rounded-full">Automatic Duplicate Removal Active</p>
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="px-10 py-5 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:border-indigo-400 transition-all text-indigo-600 hover:scale-[1.02] active:scale-95">
                  Select CSV File
                </button>
              </div>
            ) : (
              <div className="space-y-6 w-full animate-in fade-in duration-500">
                <div className="flex flex-col items-center">
                  <CheckCircle2 size={48} className="text-emerald-500 mb-2" />
                  <p className="font-black text-slate-900 text-2xl tracking-tight">{parsedLeads.length} Leads Found</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                  <ImportStat label="Phone Numbers" count={parsedLeads.filter(l => l.phone).length} icon={<Phone size={12} />} />
                  <ImportStat label="Emails Found" count={parsedLeads.filter(l => l.email).length} icon={<Mail size={12} />} />
                  <ImportStat label="Locations" count={parsedLeads.filter(l => l.location).length} icon={<MapPin size={12} />} />
                  <ImportStat label="Ratings" count={parsedLeads.filter(l => l.googleRating).length} />
                </div>

                <button onClick={() => { setParsedLeads([]); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-rose-500 transition-colors">Select different file</button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
              <AlertCircle size={20} />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          <button
            onClick={confirmUpload}
            disabled={parsedLeads.length === 0 || isProcessing}
            className={`w-full py-6 font-black uppercase tracking-widest text-sm rounded-[2rem] transition-all shadow-xl ${parsedLeads.length > 0 ? 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98]' : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'}`}
          >
            {parsedLeads.length > 0 ? (isProcessing ? 'Checking Duplicates...' : `Import ${parsedLeads.length} Leads`) : 'Awaiting Data Source'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ImportStat: React.FC<{ label: string, count: number, icon?: React.ReactNode }> = ({ label, count, icon }) => (
  <div className="bg-white border border-slate-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-sm">
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-indigo-500">{icon}</span>}
      <span className="text-lg font-black text-slate-900">{count}</span>
    </div>
    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter text-center">{label}</span>
  </div>
);

export default CSVUpload;
