import requests

BASE_URL = "http://localhost:3000"
SAVE_RESEND_CREDENTIALS_PATH = "/functions/v1/save-resend-credentials"
TIMEOUT = 30

# Replace with a valid JWT token for authentication
AUTH_TOKEN = "your_valid_jwt_token_here"

def test_save_resend_api_key_encryption():
    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Content-Type": "application/json"
    }
    url = BASE_URL + SAVE_RESEND_CREDENTIALS_PATH

    # 1. Test successful saving with valid API key
    payload_success = {
        "apiKey": "valid_resend_api_key_example",
        "fromEmail": "user@example.com"
    }
    resp = requests.post(url, json=payload_success, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"
    assert "Credentials saved" in resp.text or resp.ok, f"Unexpected response text: {resp.text}"

    # 2. Test 400 error when API key is missing
    payload_missing_api_key = {
        "fromEmail": "user@example.com"
    }
    resp = requests.post(url, json=payload_missing_api_key, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 400, f"Expected 400 Bad Request, got {resp.status_code}"

    # 3. Test 401 error when Authorization header is missing or invalid
    headers_unauth = {
        "Content-Type": "application/json"
    }
    resp = requests.post(url, json=payload_success, headers=headers_unauth, timeout=TIMEOUT)
    assert resp.status_code == 401, f"Expected 401 Unauthorized for missing token, got {resp.status_code}"

    headers_invalid_token = {
        "Authorization": "Bearer invalid_token",
        "Content-Type": "application/json"
    }
    resp = requests.post(url, json=payload_success, headers=headers_invalid_token, timeout=TIMEOUT)
    assert resp.status_code == 401, f"Expected 401 Unauthorized for invalid token, got {resp.status_code}"


test_save_resend_api_key_encryption()