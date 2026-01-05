import requests
import uuid

BASE_URL = "http://localhost:3000"
CANCEL_JOB_ENDPOINT = f"{BASE_URL}/functions/v1/cancel-job"
START_SCRAPE_ENDPOINT = f"{BASE_URL}/functions/v1/start-scrape"
DELETE_JOB_ENDPOINT = f"{BASE_URL}/functions/v1/delete-job"  # assumed endpoint for cleanup; if unavailable, simulate deletion

TIMEOUT = 30

# Assume we have a valid JWT token for authentication of the job owner and an invalid token for unauthorized access test
VALID_JWT_TOKEN = "Bearer VALID_TEST_USER_JWT_TOKEN"
INVALID_JWT_TOKEN = "Bearer INVALID_OR_NO_PERMISSION_JWT_TOKEN"


def create_scrape_job():
    # Create a new scrape job with a unique UUID (simulate creation if no direct API)
    job_id = str(uuid.uuid4())
    niche = "marketing"
    location = "San Francisco"
    headers = {
        "Authorization": VALID_JWT_TOKEN,
        "Content-Type": "application/json",
    }
    payload = {
        "job_id": job_id,
        "niche": niche,
        "location": location,
    }
    resp = requests.post(START_SCRAPE_ENDPOINT, json=payload, headers=headers, timeout=TIMEOUT)
    if resp.status_code != 200:
        raise Exception(f"Failed to create scrape job, status: {resp.status_code}, body: {resp.text}")
    return job_id


def delete_scrape_job(job_id):
    # No direct delete endpoint documented in PRD. Assuming cancellation or no-op here.
    # If delete endpoint existed, code would go here.
    pass


def test_cancel_scrape_job():
    job_id = None
    try:
        # Step 1: Create a scrape job to cancel
        job_id = create_scrape_job()

        # Prepare the cancel payload
        payload = {"job_id": job_id}

        # Headers for valid authenticated request
        headers_valid = {
            "Authorization": VALID_JWT_TOKEN,
            "Content-Type": "application/json",
        }
        # Headers for invalid authorization request
        headers_invalid = {
            "Authorization": INVALID_JWT_TOKEN,
            "Content-Type": "application/json",
        }

        # 1) Test successful cancellation with valid auth and ownership
        resp = requests.post(CANCEL_JOB_ENDPOINT, json=payload, headers=headers_valid, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}, body: {resp.text}"

        # 2) Test unauthorized cancellation attempt with invalid token
        resp_unauthorized = requests.post(CANCEL_JOB_ENDPOINT, json=payload, headers=headers_invalid, timeout=TIMEOUT)
        assert resp_unauthorized.status_code == 401, f"Expected 401 Unauthorized, got {resp_unauthorized.status_code}, body: {resp_unauthorized.text}"

        # 3) Test cancellation with non-existent job ID or no permission (simulate with random UUID)
        fake_job_id = str(uuid.uuid4())
        payload_fake = {"job_id": fake_job_id}
        resp_not_found = requests.post(CANCEL_JOB_ENDPOINT, json=payload_fake, headers=headers_valid, timeout=TIMEOUT)
        assert resp_not_found.status_code == 404, f"Expected 404 Not Found, got {resp_not_found.status_code}, body: {resp_not_found.text}"

    finally:
        if job_id:
            delete_scrape_job(job_id)


test_cancel_scrape_job()