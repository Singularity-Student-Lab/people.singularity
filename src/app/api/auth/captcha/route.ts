import { NextRequest, NextResponse } from 'next/server';
import { generateCaptcha, verifyCaptcha } from '@/lib/security/captcha';

export async function GET() {
  const challenge = generateCaptcha();
  return NextResponse.json(challenge);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, answer } = body;

    const isValid = verifyCaptcha(token, answer);
    if (!isValid) {
      return NextResponse.json(
        { valid: false, error: 'Incorrect or expired verification code. Please try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false, error: 'Verification error' }, { status: 400 });
  }
}
