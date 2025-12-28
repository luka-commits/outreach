import os
import argparse
import sys
import hashlib
import json
import gspread
import csv
import queue
import httpx
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

# Ensure execution dir is in path
sys.path.append(os.getcwd())
try:
    from execution.scrape_google_maps import scrape_google_maps
    from execution.extract_website_contacts import extract_contacts
except ImportError:
    # Try relative imports if running as module
    sys.path.append(os.path.join(os.getcwd(), 'execution'))
    from scrape_google_maps import scrape_google_maps
    from extract_website_contacts import extract_contacts

load_dotenv()


# Common generic email prefixes that don't contain name info
GENERIC_EMAIL_PREFIXES = {
    'info', 'contact', 'hello', 'admin', 'sales', 'support', 'help',
    'office', 'team', 'billing', 'marketing', 'service', 'general',
    'enquiries', 'enquiry', 'mail', 'email', 'web', 'noreply', 'no-reply'
}

def infer_name_from_email(email):
    """
    Tries to extract a probable name from an email address.
    Returns None if the email is generic or name cannot be inferred.

    Examples:
        john.smith@company.com -> John Smith
        jsmith@company.com -> Jsmith (single word, less reliable)
        info@company.com -> None (generic)
    """
    if not email:
        return None

    try:
        local_part = email.split('@')[0].lower()

        # Skip generic prefixes
        if local_part in GENERIC_EMAIL_PREFIXES:
            return None

        # Split by common delimiters: dot, underscore, hyphen
        parts = re.split(r'[._-]', local_part)

        # Filter to only alphabetic parts (remove numbers, etc.)
        valid_parts = [p for p in parts if p.isalpha() and len(p) > 1]

        if not valid_parts:
            return None

        # Title case each part and join
        name = " ".join([p.title() for p in valid_parts])
        return name
    except Exception:
        return None


class ProgressReporter:
    """Updates Supabase with job progress at each stage."""

    def __init__(self, job_id: str, supabase_url: str, supabase_key: str):
        self.job_id = job_id
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.enabled = bool(supabase_url and supabase_key and job_id)

    def update(self, stage: str, progress: int = 0, message: str = None, leads_found: int = None):
        """Update job progress in Supabase."""
        if not self.enabled:
            print(f"[Progress] {stage}: {progress}% - {message}")
            return

        try:
            payload = {
                "stage": stage,
                "progress": progress,
            }
            if message:
                payload["stage_message"] = message
            if leads_found is not None:
                payload["leads_found"] = leads_found

            url = f"{self.supabase_url}/rest/v1/scrape_jobs?id=eq.{self.job_id}"
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            }

            with httpx.Client() as client:
                response = client.patch(url, json=payload, headers=headers, timeout=10)
                if response.status_code in (200, 204):
                    print(f"[Progress Updated] {stage}: {progress}% - {message}")
                else:
                    print(f"[Progress Update Failed] {response.status_code}: {response.text}")

        except Exception as e:
            print(f"[Progress Update Error] {e}")


def get_lead_id(name, address):
    """Generate MD5 hash of name|address for deduplication."""
    raw = f"{name}|{address}"
    return hashlib.md5(raw.encode()).hexdigest()

def setup_sheet(sheet_url):
    """Authenticate and return Google Sheet worksheet object."""
    try:
        if not os.path.exists('credentials.json'):
            print("Warning: credentials.json not found. Google Sheets disabled.")
            return None
        
        gc = gspread.service_account(filename='credentials.json')
        
        if sheet_url:
            sh = gc.open_by_url(sheet_url)
            worksheet = sh.get_worksheet(0)
        else:
            # Create new sheet
            sh = gc.create(f"GMaps Leads {datetime.now().strftime('%Y-%m-%d %H:%M')}")
            sh.share(os.getenv("GOOGLE_SHEET_SHARE_EMAIL", ""), perm_type='user', role='writer')
            worksheet = sh.get_worksheet(0)
            
            # Init headers - Outreach Focused
            headers = [
                "business_name", "category", "rating", "review_count",
                "owner_name", "owner_title", "emails", "phone",
                "website", "linkedin", "facebook", "instagram", "facebook_pixel", "google_pixel",
                "executive_summary", "city", "state", "lead_id"
            ]
            worksheet.append_row(headers)
            
        return worksheet
    except Exception as e:
        print(f"Error setting up Google Sheet: {e}")
        return None

def process_lead(lead, query, anthropic_key=None):
    """Enrich a single lead (thread-safe worker)."""
    lead_id = get_lead_id(lead.get('name'), lead.get('address'))
    
    enriched = {
        "lead_id": lead_id,
        "business_name": lead.get('name'),
        "category": lead.get('category'),
        "rating": lead.get('rating'),
        "review_count": lead.get('reviews'), # Mapped from scraper 'reviews'
        "address": lead.get('address'),
        "city": lead.get('city'),
        "state": lead.get('state'),
        "phone": lead.get('phone'),
        "website": lead.get('website'),
        "search_query": query, 
    }
    
    if lead.get('website'):
        try:
             print(f"Enriching {lead.get('name')}...")
             # Call our extraction tool
             data = extract_contacts(lead['website'], lead['name'], anthropic_key=anthropic_key)
             
             # Flatten data
             enriched['emails'] = ", ".join(data.get('emails') or [])
             
             social = data.get('social_media') or {}
             enriched['facebook'] = social.get('facebook')
             enriched['linkedin'] = social.get('linkedin')
             enriched['instagram'] = social.get('instagram')
             
             # Pixel Logic
             enriched['facebook_pixel'] = data.get('facebook_pixel', False)
             enriched['google_pixel'] = data.get('google_pixel', False)

             # New: Executive Summary
             enriched['executive_summary'] = data.get('executive_summary', '')

             owner = data.get('owner_info') or {}
             enriched['owner_name'] = owner.get('name')
             enriched['owner_title'] = owner.get('title')

             # Fallback: Try to infer owner name from email if not found
             if not enriched['owner_name']:
                 # Try owner email first, then general emails
                 owner_email = owner.get('email')
                 if owner_email:
                     enriched['owner_name'] = infer_name_from_email(owner_email)
                 elif enriched.get('emails'):
                     # Try first email in the list
                     first_email = enriched['emails'].split(',')[0].strip()
                     enriched['owner_name'] = infer_name_from_email(first_email)

        except Exception as e:
             print(f"Enrichment error for {lead.get('name')}: {e}")
    
    return enriched

def save_to_csv(leads, filename=None):
    if not leads:
        return
        
    if not filename:
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M')
        filename = f"gmaps_outreach_{timestamp}.csv"
    
    # Outreach Headers
    headers = [
        "business_name", "category", "rating", "review_count",
        "owner_name", "owner_title", "emails", "phone",
        "website", "linkedin", "facebook", "instagram", "facebook_pixel", "google_pixel",
        "executive_summary", "city", "state", "lead_id"
    ]
    
    file_exists = os.path.isfile(filename)
    
    try:
        with open(filename, 'a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers, extrasaction='ignore') # Ignore extra internal fields
            if not file_exists:
                writer.writeheader()
            
            for lead in leads:
                writer.writerow(lead)
        
        print(f"Successfully saved {len(leads)} leads to {filename}")
        return filename
    except Exception as e:
        print(f"Error saving to CSV: {e}")
        return None

def save_to_json(leads, filename=None):
    if not leads:
        return
        
    if not filename:
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M')
        filename = f"gmaps_outreach_{timestamp}.json"
        
    try:
        # Load existing (for batching) or start new
        data = []
        if os.path.exists(filename):
            try:
                with open(filename, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except json.JSONDecodeError:
                data = [] # Corrupt
        
        data.extend(leads)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            
        print(f"Successfully saved {len(leads)} leads to {filename} (Total: {len(data)})")
        return filename
    except Exception as e:
        print(f"Error saving to JSON: {e}")
        return None

def run_gmaps_pipeline(niche, location, limit=10, increase_radius=False, sheet_url=None, force_csv=False, force_json=False, apify_token=None, anthropic_key=None, job_id=None, supabase_url=None, supabase_key=None):
    """
    Programmatic entry point for the pipeline.
    """
    # Initialize progress reporter
    progress = ProgressReporter(job_id, supabase_url, supabase_key)

    # 1. Scrape GMaps (Step 1)
    query_1 = f"{niche} in {location}"
    progress.update("scraping", 0, f"Searching Google Maps for '{niche}' in {location}...")
    print(f"Layer 1: Scraping Google Maps for '{query_1}'...")
    # Pass 'location' as bias to prevent US-centric "too far" errors
    raw_leads = scrape_google_maps(query_1, limit, apify_token=apify_token, location_bias=location)
    
    # Report initial scrape results
    progress.update("scraping", 50, f"Found {len(raw_leads)} businesses...", leads_found=len(raw_leads))

    # Radius Expansion Logic
    if increase_radius and len(raw_leads) < limit:
        print(f"Found only {len(raw_leads)} leads. Expanding radius...")
        progress.update("scraping", 60, f"Expanding search radius...")
        query_2 = f"{niche} near {location}"
        print(f"Layer 1 (Expansion): Scraping for '{query_2}'...")

        # Ask for up to limit again to ensure we get enough candidates
        raw_leads_2 = scrape_google_maps(query_2, limit, apify_token=apify_token, location_bias=location)

        # Merge and Dedupe Raw Leads
        seen_ids = set()
        for l in raw_leads:
            seen_ids.add(get_lead_id(l['name'], l['address']))

        new_added = 0
        for l in raw_leads_2:
            lid = get_lead_id(l['name'], l['address'])
            if lid not in seen_ids:
                raw_leads.append(l)
                seen_ids.add(lid)
                new_added += 1

        print(f"Expansion added {new_added} unique leads.")
        progress.update("scraping", 90, f"Found {len(raw_leads)} total businesses", leads_found=len(raw_leads))

    print(f"Total raw leads to enrich: {len(raw_leads)}")
    progress.update("scraping", 100, f"Scraping complete. Found {len(raw_leads)} businesses.", leads_found=len(raw_leads))
    # Slice to limit just in case
    raw_leads = raw_leads[:limit]
    
    # Load existing IDs upfront for pre-enrichment deduplication
    existing_ids = set()
    worksheet = None
    use_sheet = False
    
    # Determine output mode
    use_sheet = (sheet_url is not None) and (not force_csv) and (not force_json)

    if use_sheet:
        worksheet = setup_sheet(sheet_url)
        if worksheet:
             try:
                 existing_records = worksheet.get_all_records()
                 existing_ids = set(str(row.get('lead_id')) for row in existing_records)
                 print(f"Loaded {len(existing_ids)} existing leads from Sheet for deduplication.")
             except Exception as e:
                 print(f"Warning: Could not load existing records: {e}")
        else:
            use_sheet = False

    # Dedupe raw leads against existing Sheet IDs *before* processing
    # AND Filter by State/Location if possible
    unique_raw_leads = []
    
    # Simple state matching from location string
    target_state = None
    if "," in location:
        # e.g. "New York, NY" -> "NY"
        parts = location.split(",")
        potential_state = parts[-1].strip().upper()
        if len(potential_state) == 2:
            target_state = potential_state
            print(f"Filtering results for state: {target_state}")
    
    skipped_location = 0
    for lead in raw_leads:
        # Location Check
        if target_state:
            lead_state = lead.get('state', '')
            # Handle empty state or mismatch
            if lead_state and lead_state != target_state and lead_state != "New York": # Allow full name too logic
                address_str = str(lead.get('address', '')).upper()
                state_str = str(lead.get('state', '')).upper()
                
                if target_state not in state_str and target_state not in address_str:
                     skipped_location += 1
                     continue

        lid = get_lead_id(lead['name'], lead['address'])
        if lid not in existing_ids:
            unique_raw_leads.append(lead)
    
    print(f"Leads to process: {len(unique_raw_leads)} (Skipped {len(raw_leads) - len(unique_raw_leads) - skipped_location} existing, {skipped_location} wrong location)")

    # 2. Enrich (Parallel with Batch Saving)
    progress.update("enriching", 0, f"Enriching {len(unique_raw_leads)} leads with contact data...")
    print("Layer 2: Enriching with website data (Max Workers: 8)...")
    enriched_leads = []
    total_to_enrich = len(unique_raw_leads)
    
    # Prepare saver helper
    def save_batch(batch_leads):
        if not batch_leads: return
        
        if force_json:
            save_to_json(batch_leads)
            print(f"  Saved batch of {len(batch_leads)} leads to JSON.")
        
        elif use_sheet and worksheet:
            try:
                new_rows = []
                # Headers definition - Outreach Focused
                headers = [
                    "business_name", "category", "rating", "review_count",
                    "owner_name", "owner_title", "emails", "phone",
                    "website", "linkedin", "facebook", "instagram", "facebook_pixel", "google_pixel",
                    "executive_summary", "city", "state", "lead_id"
                ]
                for l in batch_leads:
                    # Double check ID again just in case (though we checked raw)
                    if str(l['lead_id']) not in existing_ids:
                        row = [l.get(h, "") for h in headers]
                        new_rows.append(row)
                        existing_ids.add(str(l['lead_id'])) # Add to local set to prevent dups in same run
                
                if new_rows:
                    worksheet.append_rows(new_rows)
                    print(f"  Saved batch of {len(new_rows)} leads to Sheet.")
            except Exception as e:
                print(f"  Error saving batch to sheet: {e}")
                # Fallbacks
                if force_json:
                    save_to_json(batch_leads)
                else:
                    save_to_csv(batch_leads)
        else:
            save_to_csv(batch_leads)
            print(f"  Saved batch of {len(batch_leads)} leads to CSV.")

    batch_buffer = []
    BATCH_SIZE = 10
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        # Submit all tasks
        futures = {executor.submit(process_lead, lead, query_1, anthropic_key): lead for lead in unique_raw_leads}

        for i, future in enumerate(as_completed(futures)):
            try:
                result = future.result()
                enriched_leads.append(result)
                batch_buffer.append(result)

                # Update progress
                enriched_count = len(enriched_leads)
                pct = int((enriched_count / total_to_enrich) * 100) if total_to_enrich > 0 else 100
                if enriched_count % 5 == 0 or enriched_count == total_to_enrich:
                    progress.update("enriching", pct, f"Enriched {enriched_count}/{total_to_enrich} leads...")

                # Batch Save
                if len(batch_buffer) >= BATCH_SIZE:
                    save_batch(batch_buffer)
                    batch_buffer = []

            except Exception as e:
                print(f"Worker exception: {e}")
                
    # Save remaining
    if batch_buffer:
        save_batch(batch_buffer)

    # Final progress update
    progress.update("finalizing", 100, f"Enrichment complete! {len(enriched_leads)} leads ready.")
    print("Pipeline Complete.")

    return enriched_leads

def main():
    parser = argparse.ArgumentParser(description="Google Maps Lead Gen Pipeline")
    parser.add_argument("--niche", help="Target niche (e.g. plumbers)")
    parser.add_argument("--location", help="Target location (e.g. Austin TX)")
    parser.add_argument("--increase-radius", action="store_true", help="Allow broader search if results < limit")
    
    # Legacy/Simple mode
    parser.add_argument("--search", help="Full search query (overrides niche/location)")
    
    parser.add_argument("--limit", type=int, default=10, help="Max results")
    parser.add_argument("--sheet-url", help="Google Sheet URL to append to")
    parser.add_argument("--csv", action="store_true", help="Force save to CSV")
    parser.add_argument("--json", action="store_true", help="Force save to JSON")
    
    args = parser.parse_args()
    
    if args.search and not args.niche:
        # Legacy mode support
        run_gmaps_pipeline(args.search, "", args.limit, False, args.sheet_url, args.csv, args.json)
    elif args.niche and args.location:
        run_gmaps_pipeline(args.niche, args.location, args.limit, args.increase_radius, args.sheet_url, args.csv, args.json)
    else:
        print("Error: Must provide --search OR (--niche and --location)")

if __name__ == "__main__":
    main()
