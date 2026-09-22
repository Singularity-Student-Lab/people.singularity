import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;

    // Strict validation: alphanumeric with dashes/underscores and standard extension
    if (!filename || !/^[a-zA-Z0-9_\-]+\.(png|jpg|jpeg|webp|pdf|svg)$/i.test(filename)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    let filePath = path.resolve(uploadsDir, filename);

    // Path traversal defense for primary uploads directory
    if (!filePath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      // Serverless fallback check in OS temp directory
      const tmpUploadsDir = path.resolve(os.tmpdir(), 'uploads');
      const tmpFilePath = path.resolve(tmpUploadsDir, filename);
      if (tmpFilePath.startsWith(tmpUploadsDir) && fs.existsSync(tmpFilePath)) {
        filePath = tmpFilePath;
      } else {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeType = MIME_MAP[ext] || 'application/octet-stream';
    const buffer = await fs.promises.readFile(filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('[Upload Handler] Error reading file:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
