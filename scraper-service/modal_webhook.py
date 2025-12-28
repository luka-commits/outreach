"""
Modal Webhook for GMaps Lead Generation Pipeline

This webhook receives requests from the Supabase start-scrape edge function
and executes the lead scraping pipeline in the background on Modal's infrastructure.
"""

import modal
import json
import os

# Create Modal app
app = modal.App("gmaps-lead-pipeline")

# Create image with required dependencies and local code
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "httpx",
        "anthropic",
        "apify-client",
        "html2text",
        "gspread",
        "python-dotenv",
        "fastapi",
    )
    .add_local_dir("./execution", remote_path="/root/execution")
)


@app.function(
    image=image,
    timeout=900,  # 15 minute timeout for long scrapes
)
def run_pipeline(
    job_id: str,
    user_id: str,
    niche: str,
    location: str,
    limit: int,
    increase_radius: bool,
    apify_token: str,
    anthropic_key: str,
    callback_url: str,
    callback_secret: str,
    supabase_url: str,
    supabase_key: str,
):
    """
    Executes the GMaps lead pipeline and sends results to callback.
    """
    import sys
    import httpx
    sys.path.insert(0, "/root")

    # Import the pipeline runner
    from execution.gmaps_lead_pipeline import run_gmaps_pipeline

    result = {
        "job_id": job_id,
        "user_id": user_id,
        "secret": callback_secret,
        "status": "success",
        "leads": [],
        "error": None,
    }

    try:
        print(f"Starting pipeline for job {job_id}")
        print(f"Niche: {niche}, Location: {location}, Limit: {limit}")

        # Run the pipeline
        enriched_leads = run_gmaps_pipeline(
            niche=niche,
            location=location,
            limit=limit,
            increase_radius=increase_radius,
            apify_token=apify_token,
            anthropic_key=anthropic_key,
            job_id=job_id,
            supabase_url=supabase_url,
            supabase_key=supabase_key,
            force_json=True,  # Always use JSON format for callback
        )

        result["leads"] = enriched_leads
        result["leads_count"] = len(enriched_leads)
        print(f"Pipeline complete. Found {len(enriched_leads)} leads.")

    except Exception as e:
        print(f"Pipeline error: {e}")
        result["status"] = "error"
        result["error"] = str(e)

    # Send callback to Supabase
    try:
        print(f"Sending callback to {callback_url}")
        with httpx.Client(timeout=30) as client:
            response = client.post(
                callback_url,
                json=result,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {callback_secret}",
                },
            )
            print(f"Callback response: {response.status_code}")
            if response.status_code != 200:
                print(f"Callback error: {response.text}")
    except Exception as e:
        print(f"Callback failed: {e}")

    return result


@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def webhook(data: dict):
    """
    HTTP webhook endpoint that receives scrape requests from Supabase.
    Spawns the pipeline as a background task and returns immediately.
    """
    print(f"Webhook received: job_id={data.get('job_id')}")

    # Validate required fields
    required_fields = [
        "job_id", "user_id", "niche", "location",
        "apify_token", "anthropic_key", "callback_url", "callback_secret",
        "supabase_url", "supabase_key"
    ]

    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        return {"status": "error", "message": f"Missing required fields: {missing}"}

    try:
        # Spawn the pipeline as a background task
        run_pipeline.spawn(
            job_id=data["job_id"],
            user_id=data["user_id"],
            niche=data["niche"],
            location=data["location"],
            limit=data.get("limit", 50),
            increase_radius=data.get("increase_radius", True),
            apify_token=data["apify_token"],
            anthropic_key=data["anthropic_key"],
            callback_url=data["callback_url"],
            callback_secret=data["callback_secret"],
            supabase_url=data["supabase_url"],
            supabase_key=data["supabase_key"],
        )

        return {
            "status": "accepted",
            "job_id": data["job_id"],
            "message": "Pipeline started in background",
        }

    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}
