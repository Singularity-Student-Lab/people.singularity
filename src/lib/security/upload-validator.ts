import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
  url?: string;
  filename?: string;
}

async function saveUploadFile(safeFilename: string, buffer: Buffer): Promise<void> {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const filePath = path.join(UPLOADS_DIR, safeFilename);
    await fs.promises.writeFile(filePath, buffer);
  } catch {
    // If running in a read-only serverless filesystem (e.g., Vercel Lambda), fallback to writable OS temp directory
    const tmpUploadsDir = path.join(os.tmpdir(), 'uploads');
    if (!fs.existsSync(tmpUploadsDir)) {
      fs.mkdirSync(tmpUploadsDir, { recursive: true });
    }
    const tmpFilePath = path.join(tmpUploadsDir, safeFilename);
    await fs.promises.writeFile(tmpFilePath, buffer);
  }
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
  await saveUploadFile(safeFilename, buffer);

  return {
    valid: true,
    url: `/uploads/${safeFilename}`,
    filename: safeFilename,
  };
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
  await saveUploadFile(safeFilename, buffer);

  return {
    valid: true,
    url: `/uploads/${safeFilename}`,
    filename: safeFilename,
  };
}
