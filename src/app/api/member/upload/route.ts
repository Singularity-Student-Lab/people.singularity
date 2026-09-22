import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedMember } from '@/lib/auth/session';
import { processImageUpload, processPdfResumeUpload } from '@/lib/security/upload-validator';
import { db } from '@/lib/db/repository';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedMember();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadType = formData.get('type') as 'avatar' | 'resume' | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (uploadType === 'avatar') {
      const result = await processImageUpload(buffer, file.type);
      if (!result.valid || !result.url) {
        return NextResponse.json({ error: result.error || 'Failed to process image' }, { status: 400 });
      }

      // Update member avatar in database
      await db.updateMemberProfile(auth.member.id, {
        profileImageUrl: result.url,
      });

      await db.recordAudit({
        actorType: 'MEMBER',
        actorId: auth.member.id,
        action: 'AVATAR_UPLOADED',
        targetType: 'Member',
        targetId: auth.member.id,
        metadata: { filename: result.filename },
      });

      return NextResponse.json({ success: true, url: result.url });
    } else if (uploadType === 'resume') {
      const result = await processPdfResumeUpload(buffer, file.type);
      if (!result.valid || !result.url) {
        return NextResponse.json({ error: result.error || 'Failed to process PDF resume' }, { status: 400 });
      }

      // Update member resume in database
      await db.updateMemberProfile(auth.member.id, {
        resumeUrl: result.url,
      });

      await db.recordAudit({
        actorType: 'MEMBER',
        actorId: auth.member.id,
        action: 'RESUME_UPLOADED',
        targetType: 'Member',
        targetId: auth.member.id,
        metadata: { filename: result.filename },
      });

      return NextResponse.json({ success: true, url: result.url });
    } else {
      return NextResponse.json({ error: 'Invalid upload type specified' }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
