import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedMember } from '@/lib/auth/session';
import { db } from '@/lib/db/repository';
import { ProjectSchema } from '@/lib/security/validation';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedMember();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parseResult = ProjectSchema.safeParse(body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message || 'Invalid project data',
          field: firstIssue?.path[0] || null,
          issues: parseResult.error.issues.map((i) => ({
            field: i.path[0] as string,
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const proj = await db.addProject(auth.member.id, {
      name: parseResult.data.name,
      thumbnailUrl: parseResult.data.thumbnailUrl || null,
      status: parseResult.data.status,
      description: parseResult.data.description,
      projectUrl: parseResult.data.projectUrl || null,
      techTags: parseResult.data.techTags,
      sortOrder: parseResult.data.sortOrder,
    });

    return NextResponse.json({ success: true, project: proj });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error adding project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthenticatedMember();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: 'Project ID required' }, { status: 400 });

    const parseResult = ProjectSchema.safeParse(rest);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message || 'Invalid project data',
          field: firstIssue?.path[0] || null,
          issues: parseResult.error.issues.map((i) => ({
            field: i.path[0] as string,
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const updated = await db.updateProject(id, auth.member.id, {
      name: parseResult.data.name,
      thumbnailUrl: parseResult.data.thumbnailUrl || null,
      status: parseResult.data.status,
      description: parseResult.data.description,
      projectUrl: parseResult.data.projectUrl || null,
      techTags: parseResult.data.techTags,
      sortOrder: parseResult.data.sortOrder,
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error updating project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedMember();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Project ID required' }, { status: 400 });

    await db.deleteProject(id, auth.member.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error deleting project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
