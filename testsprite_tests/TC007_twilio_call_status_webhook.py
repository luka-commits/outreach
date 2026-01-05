import requests

BASE_URL = "http://localhost:3000"
CALL_STATUS_ENDPOINT = "/functions/v1/call-status"
TIMEOUT = 30

def test_twilio_call_status_webhook():
    # Valid webhook payload simulating call status update
    valid_payload = {
        "CallSid": "CA1234567890abcdef1234567890abcdef",
        "CallStatus": "completed",
        "CallDuration": "30"
    }

    # For testing valid signature: we send headers simulating a valid Twilio signature validation
    # Typically, Twilio sends X-Twilio-Signature header to validate the request.
    # We simulate a valid signature with a placeholder 'ValidSignature'
    valid_headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Twilio-Signature": "ValidSignature"
    }

    # For testing invalid signature, use an invalid signature value
    invalid_headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Twilio-Signature": "InvalidSignature"
    }

    # Convert the valid_payload dictionary to form-encoded string for the request
    from urllib.parse import urlencode
    data_encoded = urlencode(valid_payload)

    # Test valid signature request expects 200 OK
    resp_valid = requests.post(
        f"{BASE_URL}{CALL_STATUS_ENDPOINT}",
        data=data_encoded,
        headers=valid_headers,
        timeout=TIMEOUT
    )
    assert resp_valid.status_code == 200, f"Expected 200 for valid signature, got {resp_valid.status_code}"

    # Test invalid signature request expects 403 Forbidden
    resp_invalid = requests.post(
        f"{BASE_URL}{CALL_STATUS_ENDPOINT}",
        data=data_encoded,
        headers=invalid_headers,
        timeout=TIMEOUT
    )
    assert resp_invalid.status_code == 403, f"Expected 403 for invalid signature, got {resp_invalid.status_code}"

test_twilio_call_status_webhook()