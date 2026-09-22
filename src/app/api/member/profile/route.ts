import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedMember } from '@/lib/auth/session';
import { db } from '@/lib/db/repository';
import { MemberProfileSchema } from '@/lib/security/validation';

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthenticatedMember();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = MemberProfileSchema.safeParse(body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message || 'Validation failed',
          field: firstIssue?.path[0] || null,
          issues: parseResult.error.issues.map((i) => ({
            field: i.path[0] as string,
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Strict server-side scoping: user ID is read from session, never client input
    const updated = await db.updateMemberProfile(auth.member.id, {
      fullName: data.fullName,
      title: data.title,
      bio: data.bio,
      bioHighlights: data.bioHighlights,
      bookCallUrl: data.bookCallUrl || null,
      email: data.email || null,
      github: data.github || null,
      twitter: data.twitter || null,
      linkedin: data.linkedin || null,
      discord: data.discord || null,
      resumeUrl: data.resumeUrl || auth.member.resumeUrl || null,
      profileImageUrl: data.profileImageUrl || auth.member.profileImageUrl || null,
      githubUsername: data.githubUsername || null,
      closingQuote: data.closingQuote || null,
      quoteAuthor: data.quoteAuthor || null,
    });

    await db.recordAudit({
      actorType: 'MEMBER',
      actorId: auth.member.id,
      action: 'PROFILE_UPDATED',
      targetType: 'Member',
      targetId: auth.member.id,
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
