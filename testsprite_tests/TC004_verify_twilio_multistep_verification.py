import requests

BASE_URL = "http://localhost:3000"
VERIFY_TWILIO_ENDPOINT = "/functions/v1/verify-twilio"
TIMEOUT = 30

# Example valid authentication token (replace with real token for actual use)
AUTH_TOKEN = "valid_jwt_token_example"

def test_verify_twilio_multistep_verification():
    headers_auth = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Content-Type": "application/json"
    }
    headers_no_auth = {
        "Content-Type": "application/json"
    }

    # Define test inputs for each step with valid and invalid data
    test_steps = [
        {
            "step": "credentials",
            "valid_payload": {
                "accountSid": "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                "authToken": "valid_auth_token",
                "step": "credentials"
            },
            "invalid_payload": {
                "accountSid": "invalid_sid",
                "authToken": "invalid_token",
                "step": "credentials"
            }
        },
        {
            "step": "twiml_app",
            "valid_payload": {
                "accountSid": "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                "authToken": "valid_auth_token",
                "twimlAppSid": "APXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                "step": "twiml_app"
            },
            "invalid_payload": {
                "accountSid": "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                "authToken": "valid_auth_token",
                "twimlAppSid": "invalid_twiml_app_sid",
                "step": "twiml_app"
            }
        },
        {
            "step": "phone_number",
            "valid_payload": {
                "accountSid": "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                "authToken": "valid_auth_token",
                "phoneNumber": "+12345678900",
                "step": "phone_number"
            },
            "invalid_payload": {
                "accountSid": "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                "authToken": "valid_auth_token",
                "phoneNumber": "invalid_phone",
                "step": "phone_number"
            }
        }
    ]

    # Test unauthorized access (no auth token) results in 401 or 404 for each valid payload
    for step_test in test_steps:
        resp = requests.post(
            BASE_URL + VERIFY_TWILIO_ENDPOINT,
            json=step_test["valid_payload"],
            headers=headers_no_auth,
            timeout=TIMEOUT
        )
        assert resp.status_code in (401, 404), f"Expected 401 or 404 for unauthorized access on step {step_test['step']}, got {resp.status_code}"

    # Test valid payloads return 200
    for step_test in test_steps:
        resp = requests.post(
            BASE_URL + VERIFY_TWILIO_ENDPOINT,
            json=step_test["valid_payload"],
            headers=headers_auth,
            timeout=TIMEOUT
        )
        assert resp.status_code == 200, f"Expected 200 for valid input on step {step_test['step']}, got {resp.status_code}"

    # Test invalid payloads return 400
    for step_test in test_steps:
        resp = requests.post(
            BASE_URL + VERIFY_TWILIO_ENDPOINT,
            json=step_test["invalid_payload"],
            headers=headers_auth,
            timeout=TIMEOUT
        )
        assert resp.status_code == 400, f"Expected 400 for invalid input on step {step_test['step']}, got {resp.status_code}"


test_verify_twilio_multistep_verification()
