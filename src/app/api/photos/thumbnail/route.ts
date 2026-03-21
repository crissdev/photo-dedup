import fs from 'fs/promises';
import { type NextRequest, NextResponse } from 'next/server';

import { isImageMimeType } from '@/lib/server/photos/photos.types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('path');
  const size = Math.min(parseInt(searchParams.get('size') ?? '300', 10), 800);

  if (!filePath) return new NextResponse('path required', { status: 400 });

  try {
    const mime = await import('mime-types');
    const mimeType = mime.lookup(filePath) || '';
    if (!isImageMimeType(mimeType)) {
      return new NextResponse('Not an image', { status: 400 });
    }

    // Check file exists
    await fs.access(filePath);

    const sharp = (await import('sharp')).default;
    const thumbnail = await sharp(filePath)
      .resize(size, size, { fit: 'cover', withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();

    return new NextResponse(new Uint8Array(thumbnail), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return new NextResponse(String(err), { status: 500 });
  }
}
