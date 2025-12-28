import os
import argparse
import json
from apify_client import ApifyClient
from dotenv import load_dotenv

# Load environment variables (used for CLI mode only)
dotenv_path = os.path.join(os.getcwd(), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    # Try loading from the directory of the script's parent (project root)
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))


def scrape_google_maps(search_query, limit, apify_token=None, location_bias=None):
    """
    Scrapes Google Maps using Apify's compass/crawler-google-places actor.

    Args:
        search_query: The search query string
        limit: Maximum number of results to scrape
        apify_token: Optional Apify API token. If not provided, uses APIFY_API_TOKEN env var.
        location_bias: Optional string to minimize 'too far' warnings (e.g. "Sydney, Australia")
    """
    # Use provided token or fall back to environment variable
    token = apify_token or os.getenv("APIFY_API_TOKEN")

    if not token:
        raise ValueError("Apify token not provided and APIFY_API_TOKEN not found in environment variables.")

    client = ApifyClient(token)

    # Prepare the Actor input
    run_input = {
        "searchStringsArray": [search_query],
        "maxCrawledPlacesPerSearch": limit,
        "language": "en",
        "maxImages": 0,
        "maxReviews": 0,
    }

    # If a specific location is provided, center the map there
    if location_bias:
        run_input["locationQuery"] = location_bias

    print(f"Starting Apify scraper for query: '{search_query}' (Location Bias: {location_bias}) with limit: {limit}...")
    
    # Run the Actor and wait for it to finish
    run = client.actor("compass/crawler-google-places").call(run_input=run_input)

    print(f"Apify run finished. Fetching results from dataset...")

    # Fetch results from the Actor's default dataset
    results = []
    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        # Extract only relevant fields
        business_data = {
            "name": item.get("title"),
            "address": item.get("address"),
            "phone": item.get("phoneUnformatted"),
            "website": item.get("website"),
            "rating": item.get("totalScore"),
            "reviews": item.get("reviewsCount"),
            "place_id": item.get("placeId"),
            "google_maps_url": item.get("url"),
            "category": item.get("categoryName"),
            "city": item.get("city"),
            "state": item.get("state"),
            "zip_code": item.get("postalCode"),
            "country": item.get("countryCode"),
            "location": item.get("location"), # lat/lng
        }
        results.append(business_data)

    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape Google Maps businesses.")
    parser.add_argument("--search", required=True, help="Search query (e.g., 'plumbers in Austin TX')")
    parser.add_argument("--limit", type=int, default=10, help="Max number of results to scrape")
    
    args = parser.parse_args()

    try:
        data = scrape_google_maps(args.search, args.limit)
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error: {e}")
