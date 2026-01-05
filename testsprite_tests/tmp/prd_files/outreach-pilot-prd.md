# Outbound Pilot - Product Requirements Document

## Overview

**Outbound Pilot** is a sales outreach application for agencies, freelancers, and sales teams. Users manage leads, run multi-step sequences, and execute outreach across channels (email, DMs, calls, walk-ins).

**Scale target:** Hundreds of users, thousands of leads each, connected Gmail/Twilio accounts.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, TanStack Query
- **Backend:** Supabase Edge Functions (Deno)
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Supabase Auth (JWT)
- **Integrations:** Gmail OAuth, Twilio, Stripe, Resend, Anthropic AI, Apify

## API Endpoints (Supabase Edge Functions)

### 1. cancel-job
**Endpoint:** `POST /functions/v1/cancel-job`
**Authentication:** Bearer token (JWT)
**Description:** Cancels a running scrape job. Requires authenticated user who owns the job.

**Request Body:**
```json
{
  "job_id": "uuid"
}
```

**Responses:**
- 200: Job cancelled successfully
- 401: Unauthorized
- 404: Job not found or permission denied

---

### 2. scrape-callback
**Endpoint:** `POST /functions/v1/scrape-callback`
**Authentication:** Webhook secret
**Description:** Webhook endpoint that receives scraped leads from Modal pipeline. Validates webhook secret, processes leads, and updates job status.

**Request Body:**
```json
{
  "job_id": "string",
  "user_id": "string",
  "secret": "string",
  "status": "success | error",
  "error_message": "string (optional)",
  "leads": []
}
```

**Responses:**
- 200: Callback processed
- 401: Invalid webhook secret
- 404: Job not found

---

### 3. gmail-oauth-callback
**Endpoint:** `POST /functions/v1/gmail-oauth-callback`
**Authentication:** Bearer token (JWT)
**Description:** Handles Gmail OAuth callback. Exchanges authorization code for tokens and stores encrypted credentials.

**Request Body:**
```json
{
  "code": "string",
  "codeVerifier": "string",
  "redirectUri": "string"
}
```

**Responses:**
- 200: Gmail connected successfully
- 400: Token exchange failed
- 401: Unauthorized

---

### 4. verify-twilio
**Endpoint:** `POST /functions/v1/verify-twilio`
**Authentication:** Bearer token (JWT)
**Description:** Verifies Twilio credentials, TwiML app, and phone number in a multi-step flow.

**Request Body:**
```json
{
  "accountSid": "string",
  "authToken": "string",
  "twimlAppSid": "string (optional)",
  "phoneNumber": "string (optional)",
  "step": "credentials | twiml_app | phone_number"
}
```

**Responses:**
- 200: Verification successful
- 400: Verification failed
- 401: Unauthorized

---

### 5. save-twilio-credentials
**Endpoint:** `POST /functions/v1/save-twilio-credentials`
**Authentication:** Bearer token (JWT)
**Description:** Saves Twilio credentials with encryption to user profile.

**Request Body:**
```json
{
  "accountSid": "string",
  "authToken": "string",
  "twimlAppSid": "string",
  "phoneNumber": "string"
}
```

**Responses:**
- 200: Credentials saved
- 400: Missing credentials
- 401: Unauthorized

---

### 6. save-resend-credentials
**Endpoint:** `POST /functions/v1/save-resend-credentials`
**Authentication:** Bearer token (JWT)
**Description:** Saves Resend API key with encryption to user profile.

**Request Body:**
```json
{
  "apiKey": "string",
  "fromEmail": "string (optional)"
}
```

**Responses:**
- 200: Credentials saved
- 400: Missing API key
- 401: Unauthorized

---

### 7. call-status
**Endpoint:** `POST /functions/v1/call-status`
**Authentication:** Twilio webhook signature
**Description:** Twilio webhook that receives call status updates. Validates Twilio signature and updates call records.

**Request Body (form-data):**
- CallSid: string
- CallStatus: string
- CallDuration: string

**Responses:**
- 200: Status updated
- 403: Invalid signature

---

### 8. twilio-token
**Endpoint:** `POST /functions/v1/twilio-token`
**Authentication:** Bearer token (JWT)
**Description:** Generates Twilio access token for browser-based calling.

**Responses:**
- 200: Token generated (returns token, identity, expiresIn)
- 400: Twilio not configured
- 401: Unauthorized

---

### 9. twilio-voice
**Endpoint:** `POST /functions/v1/twilio-voice`
**Authentication:** Twilio webhook signature
**Description:** Twilio webhook that returns TwiML for outbound calls. Validates signature and initiates call with recording.

**Request Body (form-data):**
- AccountSid: string
- CallSid: string
- Caller: string
- To: string
- callRecordId: string

**Responses:**
- 200: TwiML response (XML)
- 403: Invalid signature

---

### 10. recording-ready
**Endpoint:** `POST /functions/v1/recording-ready`
**Authentication:** Twilio webhook signature
**Description:** Twilio webhook that receives recording completion callbacks. Updates call record with recording URL.

**Request Body (form-data):**
- CallSid: string
- RecordingUrl: string
- RecordingSid: string
- RecordingDuration: string
- RecordingStatus: string

**Responses:**
- 200: Recording processed
- 403: Invalid signature

---

### 11. send-email
**Endpoint:** `POST /functions/v1/send-email`
**Authentication:** Bearer token (JWT)
**Description:** Sends email to a lead via Gmail or Resend. Handles token refresh for Gmail. Rate limited to 50/minute.

**Request Body:**
```json
{
  "leadId": "uuid",
  "subject": "string",
  "bodyHtml": "string"
}
```

**Responses:**
- 200: Email sent
- 400: Missing fields or lead has no email
- 401: Unauthorized or token expired
- 404: Lead not found
- 429: Rate limit exceeded

---

### 12. start-scrape
**Endpoint:** `POST /functions/v1/start-scrape`
**Authentication:** Bearer token (JWT)
**Description:** Starts a lead scraping job via Modal pipeline. Validates API keys and rate limits.

**Request Body:**
```json
{
  "job_id": "uuid",
  "niche": "string",
  "location": "string",
  "limit": 50,
  "increase_radius": true
}
```

**Responses:**
- 200: Scraping started
- 400: API keys not configured or missing fields
- 401: Unauthorized
- 404: Job not found
- 429: Rate limit exceeded

---

### 13. stripe-webhook
**Endpoint:** `POST /functions/v1/stripe-webhook`
**Authentication:** Stripe webhook signature
**Description:** Handles Stripe subscription events (checkout, updates, cancellation, payment failures).

**Responses:**
- 200: Webhook received
- 401: Invalid signature

---

### 14. scrape-url
**Endpoint:** `POST /functions/v1/scrape-url`
**Authentication:** Bearer token (JWT)
**Description:** Extracts business information from a company website URL using AI. Rate limited to 20/minute, with monthly limits for free users (20/month).

**Request Body:**
```json
{
  "url": "string"
}
```

**Responses:**
- 200: Data extracted (returns companyName, contactName, email, phone, etc.)
- 400: Invalid URL
- 401: Unauthorized
- 429: Rate limit or monthly limit exceeded

## Security Requirements

1. All authenticated endpoints require valid JWT in Authorization header
2. User isolation: All queries must filter by user_id
3. Webhook endpoints validate signatures (Twilio, Stripe)
4. Sensitive credentials stored encrypted
5. Rate limiting on email and scraping endpoints
6. CORS configured for allowed origins
