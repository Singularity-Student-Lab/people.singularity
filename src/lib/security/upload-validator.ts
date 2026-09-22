import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { put } from '@vercel/blob';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
  url?: string;
  filename?: string;
}

/**
 * Saves file to Vercel Blob storage (or local disk in development mode only).
 * Ephemeral /tmp storage is strictly prohibited to prevent data loss on serverless.
 */
async function saveUpload(
  pathname: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string; filename: string }> {
  // Support real connected blob token (filters out any dummy placeholder strings from .env.example)
  const isValidBlobToken = (t?: string) => Boolean(t && !t.includes('xxxxxxxx') && !t.includes('[YOUR_'));

  const findDynamicBlobToken = (): string | undefined => {
    for (const key of Object.keys(process.env)) {
      if (key.endsWith('_READ_WRITE_TOKEN') && isValidBlobToken(process.env[key])) {
        return process.env[key];
      }
    }
    return undefined;
  };

  const rawTokens = [
    process.env.MEDIA_BLOB_READ_WRITE_TOKEN,
    process.env.VERCEL_BLOB_READ_WRITE_TOKEN,
    process.env.BLOB_READ_WRITE_TOKEN,
  ];

  const blobToken = rawTokens.find(isValidBlobToken) || findDynamicBlobToken();

  if (blobToken) {
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType,
      token: blobToken,
    });
    return {
      url: blob.url,
      filename: pathname,
    };
  }

  // If in production without blob token, fail closed
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Blob storage read-write token is missing. Ephemeral file uploads are forbidden in production.'
    );
  }

  // Local development fallback: write to public/uploads
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const filePath = path.join(UPLOADS_DIR, pathname);
  await fs.promises.writeFile(filePath, buffer);

  return {
    url: `/uploads/${pathname}`,
    filename: pathname,
  };
}

/**
 * Validates and saves an uploaded avatar image.
 * Verifies magic bytes, MIME type, size <= 2MB, and assigns a cryptographic UUID filename.
 */
export async function processImageUpload(
  buffer: Buffer,
  declaredMimeType: string
): Promise<UploadValidationResult> {
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

  if (buffer.length > MAX_IMAGE_SIZE) {
    return { valid: false, error: 'Image exceeds maximum allowed size of 2MB' };
  }

  // Magic bytes inspection
  const isJpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const isWebp =
    buffer.length > 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';

  let extension = '';
  if (isJpeg && (declaredMimeType === 'image/jpeg' || declaredMimeType === 'image/jpg')) {
    extension = '.jpg';
  } else if (isPng && declaredMimeType === 'image/png') {
    extension = '.png';
  } else if (isWebp && declaredMimeType === 'image/webp') {
    extension = '.webp';
  } else {
    return {
      valid: false,
      error: 'Invalid image format. Only authentic JPEG, PNG, and WEBP files are permitted.',
    };
  }

  // Generate cryptographic UUID filename (path traversal immune)
  const safeFilename = `avatar-${crypto.randomUUID()}${extension}`;
  try {
    const saved = await saveUpload(safeFilename, buffer, declaredMimeType);
    return {
      valid: true,
      url: saved.url,
      filename: saved.filename,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save upload file';
    return {
      valid: false,
      error: message,
    };
  }
}

/**
 * Validates and saves an uploaded PDF resume.
 * Verifies PDF magic byte header (%PDF-), MIME application/pdf, size <= 5MB,
 * and assigns a cryptographic UUID filename.
 */
export async function processPdfResumeUpload(
  buffer: Buffer,
  declaredMimeType: string
): Promise<UploadValidationResult> {
  const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5MB

  if (buffer.length > MAX_PDF_SIZE) {
    return { valid: false, error: 'Resume exceeds maximum allowed size of 5MB' };
  }

  if (declaredMimeType !== 'application/pdf') {
    return { valid: false, error: 'Declared MIME type must be application/pdf' };
  }

  // Magic bytes check: PDF header must start with "%PDF-" (0x25 0x50 0x44 0x46 0x2D)
  const isPdf =
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d;

  if (!isPdf) {
    return {
      valid: false,
      error: 'Security verification failed: file is not an authentic PDF document.',
    };
  }

  const safeFilename = `resume-${crypto.randomUUID()}.pdf`;
  try {
    const saved = await saveUpload(safeFilename, buffer, 'application/pdf');
    return {
      valid: true,
      url: saved.url,
      filename: saved.filename,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save upload file';
    return {
      valid: false,
      error: message,
    };
  }
}
