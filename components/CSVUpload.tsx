import React, { useRef, useState, useCallback } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Loader2, Phone, Mail, MapPin } from 'lucide-react';
import { Lead, ColumnMapping, ColumnMappingTarget, LeadField, CustomFieldType, CustomFieldFormValue } from '../types';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../hooks/useAuth';
import { checkDuplicateCompanies, setCustomFieldValues } from '../services/supabase';
import CSVColumnMapper from './CSVColumnMapper';

interface CSVUploadProps {
  onClose: () => void;
  onUpload: (leads: Lead[]) => void;
  currentLeadCount: number;
}

type Step = 'upload' | 'mapping' | 'confirm';

// Parsed CSV data before conversion to leads
interface ParsedCSVData {
  headers: string[];
  rows: string[][];
  delimiter: string;
}

// Custom field values to save after lead creation
interface CustomFieldMapping {
  fieldId: string;
  fieldType: CustomFieldType;
  csvIndex: number;
}

// Advanced Mapping Aliases for Scrapers (Outscraper, etc.)
const COLUMN_ALIASES: Record<string, { field: LeadField; aliases: string[] }> = {
  company: { field: 'company_name', aliases: ['name', 'company', 'business', 'title', 'company_name'] },
  contact: { field: 'contact_name', aliases: ['contact', 'contact_name', 'owner_title', 'person', 'ansprechpartner', 'name_for_emails'] },
  email: { field: 'email', aliases: ['email', 'email address', 'e-mail', 'mail', 'company_insights.email', 'primary_email'] },
  phone: { field: 'phone', aliases: ['phone', 'phone_number', 'tel', 'mobile', 'company_insights.phone', 'contact_phone'] },
  website: { field: 'website_url', aliases: ['site', 'website', 'url', 'homepage', 'domain'] },
  instagram: { field: 'instagram_url', aliases: ['instagram_url', 'instagram', 'ig_url', 'company_insights.instagram'] },
  facebook: { field: 'facebook_url', aliases: ['facebook_url', 'facebook', 'fb_url', 'company_insights.facebook'] },
  linkedin: { field: 'linkedin_url', aliases: ['linkedin_url', 'linkedin', 'li_url', 'company_insights.linkedin'] },
  address: { field: 'address', aliases: ['full_address', 'address', 'street', 'location_address'] },
  location: { field: 'location', aliases: ['city', 'location', 'borough', 'town', 'stadt'] },
  niche: { field: 'niche', aliases: ['category', 'niche', 'industry', 'subtypes', 'type', 'company_insights.industry'] },
  rating: { field: 'google_rating', aliases: ['rating', 'google_rating', 'stars', 'bewertung'] },
  reviews: { field: 'google_review_count', aliases: ['reviews', 'review_count', 'reviews_count', 'rezensionen'] },
  query: { field: 'search_query', aliases: ['query', 'search_query'] },
};

const parseCSVLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
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

// Run alias matching to auto-detect column mappings (only for built-in fields)
const runAliasMatching = (headers: string[]): ColumnMapping[] => {
  const usedFields = new Set<LeadField>();

  return headers.map((header, index) => {
    const lowerHeader = header.toLowerCase().trim();

    // Try to find a matching alias
    for (const { field, aliases } of Object.values(COLUMN_ALIASES)) {
      if (usedFields.has(field)) continue;

      // Exact match first
      if (aliases.some(alias => lowerHeader === alias)) {
        usedFields.add(field);
        return {
          csvColumn: header,
          csvIndex: index,
          target: { type: 'builtin', field } as ColumnMappingTarget,
          source: 'alias' as const,
        };
      }

      // Partial match (includes)
      if (aliases.some(alias => lowerHeader.includes(alias))) {
        usedFields.add(field);
        return {
          csvColumn: header,
          csvIndex: index,
          target: { type: 'builtin', field } as ColumnMappingTarget,
          source: 'alias' as const,
        };
      }
    }

    // No match found
    return { csvColumn: header, csvIndex: index, target: null, source: 'manual' as const };
  });
};

// Parse a string value to the appropriate custom field type
const parseCustomFieldValue = (value: string, fieldType: CustomFieldType): CustomFieldFormValue => {
  if (!value || value.trim() === '') return null;

  switch (fieldType) {
    case 'text':
    case 'url':
    case 'single_select':
      return value.trim();

    case 'number': {
      const num = parseFloat(value.replace(',', '.'));
      return isNaN(num) ? null : num;
    }

    case 'date': {
      // Accept ISO date format or try to parse common formats
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      // Try to parse other formats and convert to ISO
      const parsed = Date.parse(value);
      if (!isNaN(parsed)) {
        const isoDate = new Date(parsed).toISOString().split('T')[0];
        return isoDate ?? null;
      }
      return null;
    }

    case 'checkbox':
      return ['true', 'yes', '1', 'x', 'ja'].includes(value.toLowerCase().trim());

    case 'multi_select':
      // Split on comma or semicolon for array
      return value.split(/[,;]/).map(v => v.trim()).filter(v => v);

    default:
      return null;
  }
};

// Convert rows to leads using the confirmed mappings
const convertRowsToLeads = (
  rows: string[][],
  mappings: ColumnMapping[],
  checkLimit: (count: number, type: 'leads') => boolean,
  currentLeadCount: number,
  maxLeads: number
): {
  leads: Lead[];
  customFieldData: Map<string, Array<{ fieldId: string; value: CustomFieldFormValue }>>;
  limitReached: boolean;
  limitMessage: string | null;
} => {
  const leads: Lead[] = [];
  const customFieldData = new Map<string, Array<{ fieldId: string; value: CustomFieldFormValue }>>();
  let limitReached = false;
  let limitMessage: string | null = null;

  // Build index lookup for built-in fields
  const builtinFieldToIndex: Partial<Record<LeadField, number>> = {};
  const customFieldMappings: CustomFieldMapping[] = [];

  mappings.forEach(m => {
    if (m.target?.type === 'builtin') {
      builtinFieldToIndex[m.target.field] = m.csvIndex;
    } else if (m.target?.type === 'custom') {
      customFieldMappings.push({
        fieldId: m.target.fieldId,
        fieldType: m.target.fieldType,
        csvIndex: m.csvIndex,
      });
    }
  });

  const parseNum = (val: string): number | undefined => {
    if (!val) return undefined;
    const normalized = val.replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? undefined : num;
  };

  for (const row of rows) {
    // Enforce limit during parsing
    if (!checkLimit(currentLeadCount + leads.length, 'leads')) {
      limitReached = true;
      limitMessage = `Import stopped at ${leads.length} leads. Limit of ${maxLeads} reached.`;
      break;
    }

    const getValue = (field: LeadField): string | undefined => {
      const idx = builtinFieldToIndex[field];
      return idx !== undefined ? row[idx]?.trim() || undefined : undefined;
    };

    // Derive location from search_query if not directly mapped
    let location = getValue('location');
    const searchQuery = getValue('search_query');
    if (!location && searchQuery) {
      const parts = searchQuery.split(',').map(p => p.trim());
      location = parts[2] || parts[parts.length - 2];
    }

    const companyName = getValue('company_name') || 'Unnamed Lead';
    const leadId = crypto.randomUUID();

    leads.push({
      id: leadId,
      companyName,
      contactName: getValue('contact_name'),
      email: getValue('email'),
      phone: getValue('phone'),
      websiteUrl: getValue('website_url'),
      instagramUrl: getValue('instagram_url'),
      facebookUrl: getValue('facebook_url'),
      linkedinUrl: getValue('linkedin_url'),
      twitterUrl: getValue('twitter_url'),
      youtubeUrl: getValue('youtube_url'),
      tiktokUrl: getValue('tiktok_url'),
      address: getValue('address'),
      location,
      zipCode: getValue('zip_code'),
      country: getValue('country'),
      niche: getValue('niche'),
      category: getValue('category'),
      googleRating: parseNum(getValue('google_rating') ?? ''),
      googleReviewCount: getValue('google_review_count') ? Math.floor(parseNum(getValue('google_review_count') ?? '') || 0) : undefined,
      ownerTitle: getValue('owner_title'),
      executiveSummary: getValue('executive_summary'),
      searchQuery: getValue('search_query'),
      currentStepIndex: 0,
      status: 'not_contacted',
      createdAt: new Date().toISOString(),
    });

    // Extract custom field values for this lead
    if (customFieldMappings.length > 0) {
      const customValues: Array<{ fieldId: string; value: CustomFieldFormValue }> = [];

      for (const cfm of customFieldMappings) {
        const rawValue = row[cfm.csvIndex]?.trim() || '';
        const parsedValue = parseCustomFieldValue(rawValue, cfm.fieldType);

        // Only add non-null values
        if (parsedValue !== null) {
          customValues.push({ fieldId: cfm.fieldId, value: parsedValue });
        }
      }

      if (customValues.length > 0) {
        customFieldData.set(leadId, customValues);
      }
    }
  }

  return { leads, customFieldData, limitReached, limitMessage };
};

const CSVUpload: React.FC<CSVUploadProps> = ({ onClose, onUpload, currentLeadCount }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [csvData, setCsvData] = useState<ParsedCSVData | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [parsedLeads, setParsedLeads] = useState<Lead[]>([]);
  const [customFieldData, setCustomFieldData] = useState<Map<string, Array<{ fieldId: string; value: CustomFieldFormValue }>>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { checkLimit, limits } = useSubscription();
  const { user } = useAuth();

  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const MAX_COLUMNS = 100;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // SECURITY: Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }

    if (!checkLimit(currentLeadCount, 'leads')) {
      setError(`Limit reached! Free plan is limited to ${limits.maxLeads} leads. Upgrade to Pro.`);
      return;
    }

    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let text = event.target?.result as string;
        text = text.replace(/^\uFEFF/, ''); // Remove BOM

        const rawRows = text.split(/\r?\n/).filter(row => row.trim().length > 0);
        if (rawRows.length < 2) {
          setError("File seems empty or has no data rows.");
          setIsProcessing(false);
          return;
        }

        const firstLine = rawRows[0] ?? '';
        const delimiter = firstLine.includes(';') ? ';' : ',';
        const headers = parseCSVLine(firstLine, delimiter);

        // SECURITY: Validate column count
        if (headers.length > MAX_COLUMNS) {
          setError(`Too many columns (${headers.length}). Maximum is ${MAX_COLUMNS}.`);
          setIsProcessing(false);
          return;
        }

        // Parse all data rows
        const dataRows = rawRows.slice(1).map(row => parseCSVLine(row, delimiter));

        // Run alias matching for initial mappings
        const initialMappings = runAliasMatching(headers);

        setCsvData({ headers, rows: dataRows, delimiter });
        setMappings(initialMappings);
        setStep('mapping');
        setIsProcessing(false);
      } catch (err) {
        setError("Error parsing the CSV file. Check delimiter and encoding.");
        setIsProcessing(false);
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const handleMappingConfirm = useCallback((confirmedMappings: ColumnMapping[]) => {
    if (!csvData) return;

    setMappings(confirmedMappings);

    // Convert rows to leads using confirmed mappings
    const { leads, customFieldData: cfData, limitReached, limitMessage } = convertRowsToLeads(
      csvData.rows,
      confirmedMappings,
      checkLimit,
      currentLeadCount,
      limits.maxLeads
    );

    if (limitReached && limitMessage) {
      setError(limitMessage);
    }

    setParsedLeads(leads);
    setCustomFieldData(cfData);
    setStep('confirm');
  }, [csvData, checkLimit, currentLeadCount, limits.maxLeads]);

  const handleBack = useCallback(() => {
    if (step === 'mapping') {
      // Go back to upload
      setCsvData(null);
      setMappings([]);
      setStep('upload');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else if (step === 'confirm') {
      // Go back to mapping
      setStep('mapping');
      setParsedLeads([]);
      setCustomFieldData(new Map());
    }
  }, [step]);

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
        alert(`${newLeads.length} leads imported, ${duplicates} duplicates skipped.`);
      }

      if (newLeads.length === 0) {
        setError(`All ${parsedLeads.length} leads were duplicates and skipped.`);
        setIsProcessing(false);
        return;
      }

      // First, upload the leads
      onUpload(newLeads);

      // Then save custom field values for non-duplicate leads
      if (customFieldData.size > 0) {
        const newLeadIds = new Set(newLeads.map(l => l.id));

        for (const [leadId, values] of customFieldData.entries()) {
          // Only save custom fields for leads that weren't duplicates
          if (newLeadIds.has(leadId) && values.length > 0) {
            try {
              await setCustomFieldValues(user.id, leadId, values);
            } catch (err) {
              // Log but don't fail the entire import for custom field errors
              console.error(`Failed to save custom fields for lead ${leadId}:`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Import failed:', err);
      setError("Failed to import leads. Please try again.");
      setIsProcessing(false);
    }
  };

  const resetUpload = () => {
    setCsvData(null);
    setMappings([]);
    setParsedLeads([]);
    setCustomFieldData(new Map());
    setStep('upload');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Render column mapper step
  if (step === 'mapping' && csvData) {
    return (
      <CSVColumnMapper
        headers={csvData.headers}
        rows={csvData.rows}
        initialMappings={mappings}
        onConfirm={handleMappingConfirm}
        onBack={handleBack}
      />
    );
  }

  // Render upload or confirm step
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg p-8 animate-in zoom-in duration-300 relative shadow-md">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 rounded-md">
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Upload size={32} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {step === 'confirm' ? 'Confirm Import' : 'Lead Import'}
          </h3>
          <p className="text-slate-500 mt-2 text-sm">
            {step === 'confirm'
              ? 'Review your leads before importing'
              : 'Outscraper & Google Maps data auto-detected.'}
          </p>
        </div>

        <div className="space-y-6">
          <div className={`bg-slate-50 border-2 border-dashed rounded-lg p-8 text-center transition-all min-h-[200px] flex flex-col items-center justify-center ${error ? 'border-rose-200 bg-rose-50' : 'border-slate-200 hover:border-blue-300 hover:bg-white'}`}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />

            {isProcessing ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={40} className="text-blue-600 animate-spin" />
                <p className="font-medium text-slate-600 text-sm">
                  {step === 'confirm' ? 'Importing leads...' : 'Scanning data structure...'}
                </p>
              </div>
            ) : step === 'upload' ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-slate-500 text-sm">Supports standard CSVs and deep-data scraper exports.</p>
                  <p className="text-blue-600 text-xs font-medium bg-blue-50 px-3 py-1 rounded">Automatic Duplicate Removal Active</p>
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="px-8 py-3 bg-white border border-slate-200 rounded-md font-medium text-sm shadow-sm hover:border-blue-400 transition-all text-blue-600 hover:bg-blue-50">
                  Select CSV File
                </button>
              </div>
            ) : (
              // Confirm step
              <div className="space-y-4 w-full animate-in fade-in duration-500">
                <div className="flex flex-col items-center">
                  <CheckCircle2 size={40} className="text-emerald-500 mb-2" />
                  <p className="font-bold text-slate-900 text-xl">{parsedLeads.length} Leads Ready</p>
                  {customFieldData.size > 0 && (
                    <p className="text-sm text-slate-500 mt-1">
                      + {customFieldData.size} with custom fields
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                  <ImportStat label="Phone Numbers" count={parsedLeads.filter(l => l.phone).length} icon={<Phone size={12} />} />
                  <ImportStat label="Emails Found" count={parsedLeads.filter(l => l.email).length} icon={<Mail size={12} />} />
                  <ImportStat label="Locations" count={parsedLeads.filter(l => l.location).length} icon={<MapPin size={12} />} />
                  <ImportStat label="Ratings" count={parsedLeads.filter(l => l.googleRating).length} />
                </div>

                <button onClick={resetUpload} className="text-xs text-slate-400 font-medium hover:text-rose-500 transition-colors">
                  Select different file
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-3 text-rose-600">
              <AlertCircle size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {step === 'confirm' && (
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                disabled={isProcessing}
                className="flex-1 py-3 font-medium text-sm rounded-md transition-all bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                Back to Mapping
              </button>
              <button
                onClick={confirmUpload}
                disabled={parsedLeads.length === 0 || isProcessing}
                className="flex-1 py-3 font-medium text-sm rounded-md transition-all bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Importing...' : `Import ${parsedLeads.length} Leads`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ImportStat: React.FC<{ label: string; count: number; icon?: React.ReactNode }> = ({ label, count, icon }) => (
  <div className="bg-white border border-slate-200 p-3 rounded-md flex flex-col items-center justify-center gap-1">
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-blue-500">{icon}</span>}
      <span className="text-lg font-bold text-slate-900">{count}</span>
    </div>
    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-tight text-center">{label}</span>
  </div>
);

export default CSVUpload;
