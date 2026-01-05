import requests

BASE_URL = "http://localhost:3000"
RECORDING_READY_PATH = "/functions/v1/recording-ready"
TIMEOUT = 30

def test_recording_ready_webhook_processing():
    # Valid webhook data with a hypothetical valid signature header
    valid_payload = {
        "CallSid": "CA1234567890abcdef1234567890abcdef",
        "RecordingUrl": "https://api.twilio.com/2010-04-01/Accounts/AC123/Recordings/RE1234567890abcdef",
        "RecordingSid": "RE1234567890abcdef1234567890abcdef",
        "RecordingDuration": "120",
        "RecordingStatus": "completed"
    }
    # Headers with a valid X-Twilio-Signature - in real test, this should be computed correctly
    valid_headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Twilio-Signature": "VALID_SIGNATURE"
    }

    # Send valid request
    response_valid = requests.post(
        f"{BASE_URL}{RECORDING_READY_PATH}",
        data=valid_payload,
        headers=valid_headers,
        timeout=TIMEOUT
    )
    assert response_valid.status_code == 200, f"Expected 200 OK for valid signature, got {response_valid.status_code}"

    # Invalid signature test: same payload but invalid signature header
    invalid_headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Twilio-Signature": "INVALID_SIGNATURE"
    }

    response_invalid = requests.post(
        f"{BASE_URL}{RECORDING_READY_PATH}",
        data=valid_payload,
        headers=invalid_headers,
        timeout=TIMEOUT
    )
    assert response_invalid.status_code == 403, f"Expected 403 Forbidden for invalid signature, got {response_invalid.status_code}"

test_recording_ready_webhook_processing()