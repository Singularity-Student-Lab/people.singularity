import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/repository';
import { LoginSchema } from '@/lib/security/validation';
import { checkRateLimit, resetRateLimit } from '@/lib/security/rate-limit';
import { signSessionToken, setSessionCookie } from '@/lib/auth/jwt';
import { verifyTurnstileToken, verifyCaptcha } from '@/lib/security/captcha';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

    // 1. IP-level distributed rate limit (max 15 attempts per 15 minutes)
    const ipLimit = await checkRateLimit(`login:ip:${ip}`, 15, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts from this network. Try again in ${ipLimit.resetSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { username, password, captchaToken, captchaAnswer, turnstileToken } = parseResult.data;

    // Bot & Human Verification Enforcement (Turnstile primary, fallback to signed Captcha)
    const isTestEnv = process.env.NODE_ENV === 'test';
    const isTestBypass = isTestEnv && request.headers.get('x-test-bypass') === 'true';

    if (!isTestBypass) {
      if (turnstileToken) {
        const turnstileResult = await verifyTurnstileToken(turnstileToken, ip);
        if (!turnstileResult.success) {
          return NextResponse.json(
            { error: turnstileResult.error || 'Human verification failed. Please try again.' },
            { status: 400 }
          );
        }
      } else if (captchaToken && captchaAnswer) {
        const isCaptchaValid = verifyCaptcha(captchaToken, captchaAnswer);
        if (!isCaptchaValid) {
          return NextResponse.json(
            { error: 'Security verification failed: incorrect or expired verification code.' },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Human verification required. Please complete the security check.' },
          { status: 400 }
        );
      }
    }

    // 2. Username-level rate limit (max 5 failed attempts per 15 minutes)
    const userLimit = await checkRateLimit(`login:user:${username.toLowerCase()}`, 5, 15 * 60 * 1000);
    if (!userLimit.allowed) {
      return NextResponse.json(
        { error: `Account locked due to consecutive failures. Try again in ${userLimit.resetSeconds} seconds.` },
        { status: 429 }
      );
    }

    // 3. Check for Member account
    const member = await db.findMemberByUsername(username);
    if (member) {
      // Check lockout status
      if (member.lockedUntil && new Date(member.lockedUntil) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(member.lockedUntil).getTime() - Date.now()) / 60000);
        return NextResponse.json(
          { error: `Account is temporarily locked. Try again in ${remainingMinutes} minute(s).` },
          { status: 423 }
        );
      }

      // Check if deactivated
      if (!member.isActive) {
        await db.recordAudit({
          actorType: 'SYSTEM',
          actorId: 'auth',
          action: 'LOGIN_INACTIVE_MEMBER_ATTEMPT',
          targetType: 'Member',
          targetId: member.id,
          ipAddress: ip,
        });
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }

      // Verify password hash
      const isValidPassword = await bcrypt.compare(password, member.passwordHash);
      if (!isValidPassword) {
        await db.recordFailedLogin(member.id);
        await db.recordAudit({
          actorType: 'SYSTEM',
          actorId: 'auth',
          action: 'LOGIN_FAILURE',
          targetType: 'Member',
          targetId: member.id,
          ipAddress: ip,
        });
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }

      // Success: reset failures and issue JWT session token
      await db.resetFailedLogins(member.id);
      await resetRateLimit(`login:user:${username.toLowerCase()}`);

      const token = await signSessionToken({
        userId: member.id,
        username: member.username,
        role: 'member',
        tokenVersion: member.tokenVersion,
      });

      await setSessionCookie(token);

      await db.recordAudit({
        actorType: 'MEMBER',
        actorId: member.id,
        action: 'LOGIN_SUCCESS',
        targetType: 'Member',
        targetId: member.id,
        ipAddress: ip,
      });

      return NextResponse.json({
        success: true,
        role: 'member',
        mustChangePassword: member.mustChangePassword,
      });
    }

    // 4. Check for Admin account
    const admin = await db.findAdminByUsername(username);
    if (admin) {
      const isValidAdminPassword = await bcrypt.compare(password, admin.passwordHash);
      if (!isValidAdminPassword) {
        await db.recordAudit({
          actorType: 'SYSTEM',
          actorId: 'auth',
          action: 'ADMIN_LOGIN_FAILURE',
          targetType: 'Admin',
          targetId: admin.id,
          ipAddress: ip,
        });
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }

      await resetRateLimit(`login:user:${username.toLowerCase()}`);

      const token = await signSessionToken({
        userId: admin.id,
        username: admin.username,
        role: 'admin',
        tokenVersion: admin.tokenVersion,
      });

      await setSessionCookie(token);

      await db.recordAudit({
        actorType: 'ADMIN',
        actorId: admin.id,
        action: 'ADMIN_LOGIN_SUCCESS',
        targetType: 'Admin',
        targetId: admin.id,
        ipAddress: ip,
      });

      return NextResponse.json({
        success: true,
        role: 'admin',
        mustChangePassword: false,
      });
    }

    // Unknown user
    await db.recordAudit({
      actorType: 'SYSTEM',
      actorId: 'auth',
      action: 'LOGIN_UNKNOWN_USER',
      targetType: 'Unknown',
      metadata: { usernameAttempt: username },
      ipAddress: ip,
    });

    return NextResponse.json(
      { error: 'Invalid username or password' },
      { status: 401 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
