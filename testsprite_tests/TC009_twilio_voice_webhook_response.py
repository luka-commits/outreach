import requests

BASE_URL = "http://localhost:3000/functions/v1/twilio-voice"

def test_twilio_voice_webhook_response():
    # Example valid payload simulating Twilio voice webhook POST data
    valid_payload = {
        "AccountSid": "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "CallSid": "CAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "Caller": "+15551112222",
        "To": "+15553334444",
        "callRecordId": "record123"
    }
    # Example Twilio signature header value (normally computed)
    valid_signature = "ValidSignatureExample"

    headers_valid = {
        "X-Twilio-Signature": valid_signature,
        "Content-Type": "application/x-www-form-urlencoded"
    }

    # POST request with valid signature - expect 200 with TwiML response (XML)
    try:
        response = requests.post(
            BASE_URL,
            data=valid_payload,
            headers=headers_valid,
            timeout=30
        )
    except requests.RequestException as e:
        raise AssertionError(f"Request with valid signature failed: {e}")

    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
    # Check response content type for TwiML (XML)
    content_type = response.headers.get("Content-Type", "")
    assert "xml" in content_type.lower(), f"Expected XML content type, got {content_type}"
    assert response.text.strip().startswith("<?xml"), "Response does not seem to be valid TwiML XML."

    # Now test with invalid signature - expect 403 Forbidden
    invalid_signature = "InvalidSignatureExample"
    headers_invalid = {
        "X-Twilio-Signature": invalid_signature,
        "Content-Type": "application/x-www-form-urlencoded"
    }

    try:
        response_invalid = requests.post(
            BASE_URL,
            data=valid_payload,
            headers=headers_invalid,
            timeout=30
        )
    except requests.RequestException as e:
        raise AssertionError(f"Request with invalid signature failed: {e}")

    assert response_invalid.status_code == 403, f"Expected 403 Forbidden on invalid signature, got {response_invalid.status_code}"

test_twilio_voice_webhook_response()