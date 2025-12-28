import os
import argparse
import json
import httpx
import html2text
import re
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor
from anthropic import Anthropic
from dotenv import load_dotenv

# Load environment variables (used for CLI mode only)
dotenv_path = os.path.join(os.getcwd(), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

CONTACT_PATHS = [
    "/contact", "/about", "/team", "/contact-us", "/about-us", 
    "/our-team", "/staff", "/people", "/meet-the-team", "/leadership", 
    "/management", "/founders", "/who-we-are", "/company", "/meet-us", 
    "/our-story", "/the-team", "/employees", "/directory", "/locations", "/offices"
]

def fetch_page(client, url, timeout=15):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        response = client.get(url, timeout=timeout, follow_redirects=True, headers=headers)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return ""

def html_to_markdown(html_content):
    h = html2text.HTML2Text()
    h.ignore_links = False
    h.ignore_images = True
    return h.handle(html_content)

def search_duckduckgo(query):
    # Fallback to DuckDuckGo HTML version if pure API is not used
    # Note: Implementing a robust free DDG search is complex. 
    # For now, we'll try a simple request to html.duckduckgo.com
    try:
        url = "https://html.duckduckgo.com/html/"
        data = {'q': query}
        headers = {'User-Agent': 'Mozilla/5.0'}
        with httpx.Client() as client:
            resp = client.post(url, data=data, headers=headers)
            if resp.status_code == 200:
                return html_to_markdown(resp.text)
    except Exception:
        pass
    return ""

def extract_contacts(url, business_name, anthropic_key=None):
    """
    Orchestrates the contact extraction process.

    Args:
        url: The website URL to extract contacts from
        business_name: The name of the business
        anthropic_key: Optional Anthropic API key. If not provided, uses ANTHROPIC_API_KEY env var.
    """
    # Use provided key or fall back to environment variable
    api_key = anthropic_key or os.getenv("ANTHROPIC_API_KEY")

    if not api_key:
        raise ValueError("Anthropic key not provided and ANTHROPIC_API_KEY not found in environment variables.")

    client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, verify=False)
    markdown_content = ""
    
    print(f"Fetching main page: {url}")
    main_html = fetch_page(client, url)
    if not main_html:
        print(f"Failed to fetch {url}")
        return {}

    markdown_content += f"# Main Page ({url})\n\n{html_to_markdown(main_html)}\n\n"

    # Detect Facebook Pixel
    has_fb_pixel = False
    if main_html:
        # Look for standard FB Pixel init code or fbevents.js
        if "fbevents.js" in main_html or "fbq('init'" in main_html:
            has_fb_pixel = True
            print("  [+] Facebook Pixel detected!")

    # Detect Google Pixel (Ads/Analytics)
    has_google_pixel = False
    if main_html:
        # Look for gtag.js, Google Tag Manager, or Analytics/Ads IDs
        if "googletagmanager.com/gtag/js" in main_html or "gtag(" in main_html or "UA-" in main_html or "G-" in main_html or "AW-" in main_html:
            has_google_pixel = True
            print("  [+] Google Pixel/Ads detected!")

    # Find potential contact pages linked from main page or guess them
    # Simple strategy: try the known paths
    found_pages = []
    
    def check_path(path):
        full_url = urljoin(url, path)
        print(f"Checking {full_url}...")
        html = fetch_page(client, full_url)
        if html and len(html) > 500: # fast check for 404/empty pages that return 200
             return f"# Page {path}\n\n{html_to_markdown(html)}\n\n"
        return ""

    with ThreadPoolExecutor(max_workers=3) as executor:
        results = executor.map(check_path, CONTACT_PATHS[:5]) # limit to first 5 likely ones for speed
        for res in results:
             markdown_content += res

    # Search DuckDuckGo for owner
    print(f"Searching DuckDuckGo for owner info...")
    ddg_content = search_duckduckgo(f"{business_name} owner email contact")
    markdown_content += f"# DuckDuckGo Search Results\n\n{ddg_content}\n\n"

    # Truncate to avoids token limits
    if len(markdown_content) > 50000:
        markdown_content = markdown_content[:50000] + "\n...[TRUNCATED]"

    # Send to Claude
    print("Sending content to Claude for extraction...")
    anthropic = Anthropic(api_key=api_key)
    
    prompt = f"""
    You are an expert data extractor. Extract contact information for the business "{business_name}" from the following website and search content.
    
    Return a VALID JSON object with this exact structure:
    {{
      "executive_summary": "A concise 3-sentence summary of what the business does, their specialty, and who they serve.",
      "emails": ["list of strings"],
      "phone_numbers": ["list of strings"],
      "addresses": ["list of strings"],
      "social_media": {{
        "facebook": "url or null",
        "twitter": "url or null",
        "linkedin": "url or null",
        "instagram": "url or null",
        "youtube": "url or null",
        "tiktok": "url or null"
      }},
      "owner_info": {{
        "name": "string or null",
        "title": "string or null",
        "email": "string or null",
        "phone": "string or null",
        "linkedin": "string or null"
      }},
      "team_members": [{{"name": "string", "title": "string", "email": "string", "phone": "string", "linkedin": "string"}}],
      "business_hours": "string or null",
      "additional_contacts": ["list of strings"]
    }}

    If a field is not found, use null or empty list. Do not invent information.
    Only return the JSON object, no other text.

    CONTENT:
    {markdown_content}
    """

    message = anthropic.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=1500,
        temperature=0,
        system="Extract structured JSON from the provided text.",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    
    content_text = message.content[0].text
    
    # Simple cleanup to ensure JSON parsing
    try:
        content_text = message.content[0].text.strip()
        # Extract JSON using regex or finding braces
        start_index = content_text.find('{')
        end_index = content_text.rfind('}')
        
        if start_index != -1 and end_index != -1:
            json_str = content_text[start_index:end_index+1]
            data = json.loads(json_str)
            # Inject heuristic data
            data['facebook_pixel'] = has_fb_pixel
            data['google_pixel'] = has_google_pixel
            return data
        else:
            print("No JSON object found in response.")
            return {'facebook_pixel': has_fb_pixel, 'google_pixel': has_google_pixel}
    except json.JSONDecodeError as e:
        print("Failed to parse JSON from Claude response.")
        print(content_text)
        return {'facebook_pixel': has_fb_pixel, 'google_pixel': has_google_pixel}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract contacts from website.")
    parser.add_argument("--url", required=True, help="Website URL")
    parser.add_argument("--name", required=True, help="Business Name")
    
    args = parser.parse_args()

    try:
        data = extract_contacts(args.url, args.name)
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error: {e}")
