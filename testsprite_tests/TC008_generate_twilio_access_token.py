import requests

BASE_URL = "http://localhost:3000"
TWILIO_TOKEN_PATH = "/functions/v1/twilio-token"
TIMEOUT = 30

# Substitute a valid JWT token with proper permissions for the test environment
VALID_JWT = "Bearer VALID_JWT_TOKEN_EXAMPLE"
INVALID_JWT = "Bearer INVALID_JWT_TOKEN_EXAMPLE"


def test_generate_twilio_access_token():
    headers_valid_auth = {
        "Authorization": VALID_JWT,
        "Accept": "application/json",
    }
    headers_invalid_auth = {
        "Authorization": INVALID_JWT,
        "Accept": "application/json",
    }
    headers_no_auth = {
        "Accept": "application/json",
    }

    url = BASE_URL + TWILIO_TOKEN_PATH

    # 1. Test valid authentication and configured Twilio credentials (expect 200)
    resp = requests.post(url, headers=headers_valid_auth, timeout=TIMEOUT)
    assert resp.status_code in (200, 400), f"Expected 200 or 400 but got {resp.status_code}"
    if resp.status_code == 200:
        # Validate response json structure
        try:
            data = resp.json()
        except Exception:
            assert False, "Response is not valid JSON"
        assert "token" in data and isinstance(data["token"], str) and data["token"], "Missing or invalid token in response"
        assert "identity" in data and isinstance(data["identity"], str) and data["identity"], "Missing or invalid identity in response"
        assert "expiresIn" in data and isinstance(data["expiresIn"], int) and data["expiresIn"] > 0, "Missing or invalid expiresIn"
    else:
        # 2. Twilio not configured, expect 400 and JSON with error info
        try:
            data = resp.json()
        except Exception:
            assert False, "400 response is not valid JSON"
        # Optional: Validate message or error field presence in 400 response
        assert resp.status_code == 400, "Expected 400 when Twilio not configured"

    # 3. Unauthorized request (no auth header) expect 401
    resp_unauth = requests.post(url, headers=headers_no_auth, timeout=TIMEOUT)
    assert resp_unauth.status_code == 401, f"Expected 401 for unauthorized request but got {resp_unauth.status_code}"

    # 4. Unauthorized request (invalid token) expect 401
    resp_invalid_auth = requests.post(url, headers=headers_invalid_auth, timeout=TIMEOUT)
    assert resp_invalid_auth.status_code == 401, f"Expected 401 for invalid token but got {resp_invalid_auth.status_code}"


test_generate_twilio_access_token()