import crypto from 'crypto';

/**
 * Returns the secret key for signing internal fallback CAPTCHA challenges.
 * Fails closed in production if CAPTCHA_SECRET or JWT_SECRET is missing or < 32 chars.
 */
function getCaptchaSecret(): string {
  const secret = process.env.CAPTCHA_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CAPTCHA_SECRET or JWT_SECRET must be defined in production. Fallback secrets are forbidden.'
      );
    }
    return 'dev-only-captcha-secret-key-at-least-32-chars-long!';
  }

  if (secret.length < 32) {
    throw new Error('CAPTCHA_SECRET must be at least 32 characters long.');
  }

  return secret;
}

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
  errorCodes?: string[];
}

/**
 * Verifies a Cloudflare Turnstile token using Cloudflare's siteverify endpoint.
 * In development mode, falls back to Cloudflare's official dummy test secret.
 */
export async function verifyTurnstileToken(
  token?: string | null,
  remoteIp?: string | null
): Promise<TurnstileVerificationResult> {
  if (!token) {
    return { success: false, error: 'Human verification required. Please complete the security check.' };
  }

  // Automated testing bypass ONLY when explicitly running in test environment
  if (process.env.NODE_ENV === 'test') {
    if (token === 'test-bypass-token' || token === 'test-token-passed') {
      return { success: true };
    }
  }

  // Cloudflare official always-passing secret key for local development / testing
  const secretKey =
    process.env.TURNSTILE_SECRET_KEY ||
    (process.env.NODE_ENV === 'production' ? '' : '1x0000000000000000000000000000000AA');

  if (!secretKey) {
    console.error('[SECURITY ERROR] TURNSTILE_SECRET_KEY is not defined in production.');
    return {
      success: false,
      error: 'Security challenge configuration error. Please contact administrator.',
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp && remoteIp !== '127.0.0.1' && remoteIp !== '::1') {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await res.json();
    if (data.success) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Security challenge verification failed. Please try again.',
      errorCodes: data['error-codes'],
    };
  } catch (err: unknown) {
    console.error('Turnstile verification error:', err);
    return {
      success: false,
      error: 'Unable to verify security challenge. Please try again.',
    };
  }
}

// Characters that avoid visual ambiguity (no 0/O, 1/I/l)
const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export interface CaptchaChallenge {
  token: string;
  svg: string;
}

/**
 * Generates a fallback visual captcha challenge with noise lines and cryptographic HMAC.
 */
export function generateCaptcha(): CaptchaChallenge {
  const secret = getCaptchaSecret();

  // Generate 5 random characters
  let text = '';
  for (let i = 0; i < 5; i++) {
    const idx = crypto.randomInt(0, CHARS.length);
    text += CHARS[idx];
  }

  const timestamp = Date.now();
  const payload = `${timestamp}:${text}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const token = Buffer.from(`${payload}:${signature}`).toString('base64');

  // Generate modern security badge SVG
  const width = 200;
  const height = 54;
  let charsSvg = '';
  const charWidth = (width - 36) / text.length;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = 20 + i * charWidth;
    const y = 35 + crypto.randomInt(-1, 2);
    const rotation = crypto.randomInt(-4, 5);

    charsSvg += `
      <g transform="rotate(${rotation}, ${x + 12}, ${y - 10})">
        <text
          x="${x}"
          y="${y}"
          font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          font-weight="700"
          font-size="22"
          fill="#18181b"
          letter-spacing="1"
        >${char}</text>
      </g>
    `;
  }

  const wave1 = `M 10 27 Q 55 16 100 27 T 190 27`;
  const wave2 = `M 10 27 Q 55 38 100 27 T 190 27`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="w-full h-full select-none">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#f5f5f4" />
        </linearGradient>
        <pattern id="dotGrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="0.75" fill="#d6d3d1" opacity="0.6" />
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" rx="10" ry="10" fill="url(#bgGrad)" stroke="#e7e5e4" stroke-width="1.5" />
      <rect width="${width}" height="${height}" rx="10" ry="10" fill="url(#dotGrid)" />
      <path d="${wave1}" stroke="#d6d3d1" stroke-width="1.2" fill="none" opacity="0.7" />
      <path d="${wave2}" stroke="#d6d3d1" stroke-width="1.2" fill="none" opacity="0.7" />
      <path d="M 6 12 L 6 6 L 12 6" stroke="#a8a29e" stroke-width="1.2" fill="none" opacity="0.5" />
      <path d="M 188 6 L 194 6 L 194 12" stroke="#a8a29e" stroke-width="1.2" fill="none" opacity="0.5" />
      <path d="M 6 42 L 6 48 L 12 48" stroke="#a8a29e" stroke-width="1.2" fill="none" opacity="0.5" />
      <path d="M 188 48 L 194 48 L 194 42" stroke="#a8a29e" stroke-width="1.2" fill="none" opacity="0.5" />
      ${charsSvg}
    </svg>
  `.trim();

  return { token, svg };
}

/**
 * Validates a solved fallback captcha token against the user's answer.
 * Enforces cryptographic signature and a 5-minute expiry window.
 */
export function verifyCaptcha(token?: string | null, answer?: string | null): boolean {
  if (!token || !answer) return false;

  // Automated testing bypass ONLY when explicitly running in test environment
  if (process.env.NODE_ENV === 'test') {
    if (token === 'test-bypass-token' || token === 'test-token-passed') {
      return true;
    }
  }

  try {
    const secret = getCaptchaSecret();
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;

    const [timestampStr, expectedAnswer, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // Check expiry (5 minutes = 300,000 ms)
    if (isNaN(timestamp) || Date.now() - timestamp > 5 * 60 * 1000) {
      return false;
    }

    // Verify HMAC
    const expectedPayload = `${timestampStr}:${expectedAnswer}`;
    const recomputedSignature = crypto
      .createHmac('sha256', secret)
      .update(expectedPayload)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(recomputedSignature))) {
      return false;
    }

    // Compare answer case-insensitively
    const cleanUserAnswer = answer.trim().toUpperCase();
    const cleanExpected = expectedAnswer.trim().toUpperCase();

    return cleanUserAnswer === cleanExpected;
  } catch {
    return false;
  }
}
