import type { Lead } from '../types';

/**
 * Replaces all {fieldName} placeholders in a template with actual lead values.
 * Supports all standard Lead fields plus custom field values.
 */
export function substituteTemplateVariables(
  template: string,
  lead: Lead,
  customFieldValues?: Record<string, string>
): string {
  let result = template;

  // Map of all standard Lead fields that can be used as variables
  const fieldMap: Record<string, string | number | undefined> = {
    // Contact
    companyName: lead.companyName,
    contactName: lead.contactName || 'there',
    email: lead.email,
    phone: lead.phone,
    ownerTitle: lead.ownerTitle,

    // Location
    location: lead.location,
    address: lead.address,
    zipCode: lead.zipCode,
    country: lead.country,

    // Business
    niche: lead.niche,
    category: lead.category,
    googleRating: lead.googleRating,
    googleReviewCount: lead.googleReviewCount,
    executiveSummary: lead.executiveSummary,

    // Social
    websiteUrl: lead.websiteUrl,
    instagramUrl: lead.instagramUrl,
    facebookUrl: lead.facebookUrl,
    linkedinUrl: lead.linkedinUrl,
    twitterUrl: lead.twitterUrl,
    youtubeUrl: lead.youtubeUrl,
    tiktokUrl: lead.tiktokUrl,
  };

  // Replace standard fields
  for (const [key, value] of Object.entries(fieldMap)) {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(placeholder, value?.toString() || '');
  }

  // Replace custom fields
  if (customFieldValues) {
    for (const [key, value] of Object.entries(customFieldValues)) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(placeholder, value || '');
    }
  }

  return result;
}
