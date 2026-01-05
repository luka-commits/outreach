import requests

BASE_URL = "http://localhost:3000"
ENDPOINT = "/functions/v1/save-twilio-credentials"
URL = BASE_URL + ENDPOINT
TIMEOUT = 30

# Replace this with a valid JWT token for authorization
AUTH_TOKEN = "YOUR_VALID_JWT_TOKEN_HERE"
AUTH_HEADER = {"Authorization": f"Bearer {AUTH_TOKEN}"}

def test_save_twilio_credentials_encryption():
    headers = {
        **AUTH_HEADER,
        "Content-Type": "application/json"
    }

    valid_payload = {
        "accountSid": "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "authToken": "your_auth_token_value",
        "twimlAppSid": "APXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "phoneNumber": "+12345678901"
    }

    # 1. Test successful saving of credentials (200)
    response = requests.post(URL, json=valid_payload, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"

    # 2. Test missing fields returns 400
    incomplete_payloads = [
        {},  # All fields missing
        {"accountSid": valid_payload["accountSid"]},  # Missing others
        {"authToken": valid_payload["authToken"]},  # Missing others
        {"twimlAppSid": valid_payload["twimlAppSid"]},  # Missing others
        {"phoneNumber": valid_payload["phoneNumber"]},  # Missing others
        # combinations missing one field
        {
            "accountSid": valid_payload["accountSid"],
            "authToken": valid_payload["authToken"],
            "twimlAppSid": valid_payload["twimlAppSid"]
            # Missing phoneNumber
        },
    ]
    for payload in incomplete_payloads:
        resp = requests.post(URL, json=payload, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 400, (
            f"Expected 400 Bad Request for payload {payload}, got {resp.status_code}, response: {resp.text}"
        )

    # 3. Test unauthorized access (401) - no auth header
    response_unauth = requests.post(URL, json=valid_payload, headers={"Content-Type": "application/json"}, timeout=TIMEOUT)
    assert response_unauth.status_code == 401, f"Expected 401 Unauthorized, got {response_unauth.status_code}"

test_save_twilio_credentials_encryption()
