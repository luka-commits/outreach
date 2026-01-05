import requests
import uuid

BASE_URL = "http://localhost:3000/functions/v1/scrape-callback"
TIMEOUT = 30

def test_scrape_callback_webhook_processing():
    # Create a new job_id and user_id for testing
    job_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())

    # Assume the valid secret for the webhook is known for testing
    valid_secret = "valid-webhook-secret"
    invalid_secret = "invalid-webhook-secret"

    # Prepare a sample payload for a successful callback
    success_payload = {
        "job_id": job_id,
        "user_id": user_id,
        "secret": valid_secret,
        "status": "success",
        "leads": [
            {"lead_id": str(uuid.uuid4()), "name": "Lead One", "email": "leadone@example.com"},
            {"lead_id": str(uuid.uuid4()), "name": "Lead Two", "email": "leadtwo@example.com"}
        ]
    }

    # Prepare a sample payload for an error status callback
    error_payload = {
        "job_id": job_id,
        "user_id": user_id,
        "secret": valid_secret,
        "status": "error",
        "error_message": "Scrape failed due to timeout"
    }

    # Prepare a payload with invalid secret
    invalid_secret_payload = {
        "job_id": job_id,
        "user_id": user_id,
        "secret": invalid_secret,
        "status": "success",
        "leads": []
    }

    # Prepare a payload with non-existent job ID
    not_found_payload = {
        "job_id": "00000000-0000-0000-0000-000000000000",  # unlikely valid job_id
        "user_id": user_id,
        "secret": valid_secret,
        "status": "success",
        "leads": []
    }

    headers = {
        "Content-Type": "application/json"
    }

    # 1. Test success with valid secret and leads
    resp = requests.post(BASE_URL, json=success_payload, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}, response: {resp.text}"

    # 2. Test error status with valid secret
    resp = requests.post(BASE_URL, json=error_payload, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Expected 200 for error status, got {resp.status_code}, response: {resp.text}"

    # 3. Test with invalid secret, expect 401
    resp = requests.post(BASE_URL, json=invalid_secret_payload, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 401, f"Expected 401 for invalid secret, got {resp.status_code}, response: {resp.text}"

    # 4. Test with non-existent job_id, expect 404
    resp = requests.post(BASE_URL, json=not_found_payload, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 404, f"Expected 404 for job not found, got {resp.status_code}, response: {resp.text}"

test_scrape_callback_webhook_processing()