/**
 * Twilio Webhook Signature Validation
 * Validates that incoming requests are genuinely from Twilio
 */

/**
 * Validate Twilio webhook signature using HMAC-SHA1
 * @param req - The incoming request
 * @param authToken - The Twilio auth token for the account
 * @param url - The webhook URL configured in Twilio
 * @param formData - The form data from the request
 * @returns true if signature is valid
 */
export async function validateTwilioSignature(
  req: Request,
  authToken: string,
  url: string,
  formData: FormData
): Promise<boolean> {
  const signature = req.headers.get('X-Twilio-Signature');
  if (!signature) {
    return false;
  }

  // For webhook validation, construct signature base string: URL + sorted POST params
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  // Sort params by key
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // HMAC-SHA1 signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(authToken);
  const signatureData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, signatureData);
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  return signature === expectedSignature;
}
