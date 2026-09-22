import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedMember } from '@/lib/auth/session';
import { db } from '@/lib/db/repository';
import { ExperienceSchema } from '@/lib/security/validation';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedMember();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parseResult = ExperienceSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid experience data' }, { status: 400 });
    }

    const exp = await db.addExperience(auth.member.id, {
      title: parseResult.data.title,
      org: parseResult.data.org,
      location: parseResult.data.location,
      startDate: parseResult.data.startDate,
      endDate: parseResult.data.endDate || null,
      description: parseResult.data.description,
      sortOrder: parseResult.data.sortOrder,
    });

    return NextResponse.json({ success: true, experience: exp });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error adding experience';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthenticatedMember();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: 'Experience ID required' }, { status: 400 });

    const parseResult = ExperienceSchema.safeParse(rest);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid experience data' }, { status: 400 });
    }

    const updated = await db.updateExperience(id, auth.member.id, {
      title: parseResult.data.title,
      org: parseResult.data.org,
      location: parseResult.data.location,
      startDate: parseResult.data.startDate,
      endDate: parseResult.data.endDate || null,
      description: parseResult.data.description,
      sortOrder: parseResult.data.sortOrder,
    });

    return NextResponse.json({ success: true, experience: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error updating experience';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedMember();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Experience ID required' }, { status: 400 });

    await db.deleteExperience(id, auth.member.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error deleting experience';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
