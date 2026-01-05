import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# NOTE: Replace 'YOUR_VALID_JWT' with a valid JWT token string for authorized requests.
AUTH_TOKEN = "YOUR_VALID_JWT"
HEADERS_AUTH = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}
HEADERS_NO_AUTH = {
    "Content-Type": "application/json"
}


def test_gmail_oauth_callback_token_exchange():
    endpoint = f"{BASE_URL}/functions/v1/gmail-oauth-callback"

    # Define a valid payload for a successful token exchange
    valid_payload = {
        "code": "valid_auth_code_example",
        "codeVerifier": "valid_code_verifier_example",
        "redirectUri": "https://example.com/oauth2callback"
    }

    # Payload with invalid authorization code to induce token exchange failure (400)
    invalid_token_payload = {
        "code": "invalid_auth_code",
        "codeVerifier": "valid_code_verifier_example",
        "redirectUri": "https://example.com/oauth2callback"
    }

    # 1. Test successful token exchange

    try:
        response = requests.post(
            endpoint,
            headers=HEADERS_AUTH,
            json=valid_payload,
            timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
        # Optionally check response content for success message or token data if known
    except Exception as e:
        assert False, f"Exception during valid token exchange test: {e}"

    # 2. Test token exchange failure (invalid authorization code), expect 400

    try:
        response = requests.post(
            endpoint,
            headers=HEADERS_AUTH,
            json=invalid_token_payload,
            timeout=TIMEOUT
        )
        assert response.status_code == 400, f"Expected 400 Bad Request on token exchange failure, got {response.status_code}"
    except Exception as e:
        assert False, f"Exception during invalid token exchange test: {e}"

    # 3. Test unauthorized request (missing or invalid JWT token), expect 401

    try:
        response = requests.post(
            endpoint,
            headers=HEADERS_NO_AUTH,
            json=valid_payload,
            timeout=TIMEOUT
        )
        assert response.status_code == 401, f"Expected 401 Unauthorized for missing token, got {response.status_code}"
    except Exception as e:
        assert False, f"Exception during unauthorized request test: {e}"


test_gmail_oauth_callback_token_exchange()
