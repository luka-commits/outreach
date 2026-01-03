
import { GoogleGenAI } from "@google/genai";
import { LeadField } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize lazily or conditionally to prevent crash on import
const getAiClient = () => {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// All valid lead fields for AI detection
const VALID_LEAD_FIELDS: LeadField[] = [
  'company_name', 'contact_name', 'email', 'phone',
  'website_url', 'instagram_url', 'facebook_url', 'linkedin_url',
  'twitter_url', 'youtube_url', 'tiktok_url',
  'address', 'location', 'zip_code', 'country',
  'niche', 'category', 'google_rating', 'google_review_count',
  'owner_title', 'executive_summary', 'search_query'
];

export async function generatePersonalizedMessage(
  companyName: string,
  baseTemplate: string,
  contactName?: string
): Promise<string> {
  const ai = getAiClient();

  if (!ai) {
    console.warn("Gemini API Key is missing. Skipping personalization.");
    return baseTemplate;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `
        Help me personalize this outreach message.
        Company: ${companyName}
        Contact: ${contactName || 'there'}
        Base Template: "${baseTemplate}"
        
        Rules:
        - Keep the tone friendly and professional.
        - Don't make it too long.
        - Only return the personalized message text, nothing else.
      `,
    });
    return response.text || baseTemplate;
  } catch (error) {
    console.error("AI personalization failed", error);
    return baseTemplate;
  }
}

/**
 * Use AI to detect which lead fields CSV columns should map to.
 * Returns a mapping of CSV column names to suggested LeadField values.
 * Only suggests mappings for columns that appear to contain relevant data.
 */
export async function detectColumnMappings(
  csvHeaders: string[],
  sampleRows: string[][]
): Promise<Record<string, LeadField | null>> {
  const ai = getAiClient();

  if (!ai) {
    console.warn("Gemini API Key is missing. AI column detection unavailable.");
    return {};
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `
        Analyze these CSV column headers and sample data to determine which lead database field each column should map to.

        Available target fields:
        ${VALID_LEAD_FIELDS.join(', ')}

        CSV Headers: ${JSON.stringify(csvHeaders)}

        Sample data (first 3 rows):
        ${sampleRows.slice(0, 3).map(row => JSON.stringify(row)).join('\n')}

        Return a JSON object where:
        - Keys are the CSV column headers (exactly as provided, case-sensitive)
        - Values are the suggested target field name from the list above, or null if no match

        Guidelines:
        - company_name: Business names, company names, titles
        - contact_name: Person names, owner names, contact person
        - email: Email addresses
        - phone: Phone numbers, mobile numbers
        - website_url: Website URLs, domains
        - instagram_url/facebook_url/linkedin_url/twitter_url/youtube_url/tiktok_url: Social media URLs
        - address: Full addresses, street addresses
        - location: City names, towns, boroughs
        - zip_code: ZIP/postal codes
        - country: Country names
        - niche/category: Business types, industries
        - google_rating: Numeric ratings (0-5)
        - google_review_count: Review counts
        - owner_title: Job titles
        - search_query: Search terms used to find the business

        Only return the JSON object, nothing else. Example:
        {"Business Name": "company_name", "Phone Number": "phone", "Random Column": null}
      `,
    });

    const text = response.text?.trim() || '{}';

    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("AI response did not contain valid JSON");
      return {};
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string | null>;

    // Validate that all suggested fields are valid LeadFields
    const validated: Record<string, LeadField | null> = {};
    for (const [header, field] of Object.entries(parsed)) {
      if (field === null) {
        validated[header] = null;
      } else if (VALID_LEAD_FIELDS.includes(field as LeadField)) {
        validated[header] = field as LeadField;
      } else {
        // Invalid field suggested, ignore it
        console.warn(`AI suggested invalid field "${field}" for column "${header}"`);
        validated[header] = null;
      }
    }

    return validated;
  } catch (error) {
    console.error("AI column detection failed", error);
    throw new Error("AI detection failed. Please map columns manually.");
  }
}
