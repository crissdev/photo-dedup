import fs from 'fs/promises';
import mime from 'mime-types';
import { type NextRequest, NextResponse } from 'next/server';
import path from 'path';

import { prisma } from '@/lib/server/db/prisma-client';
import { ALL_SUPPORTED_TYPES } from '@/lib/server/photos/photos.types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dirPath = searchParams.get('path');
  if (!dirPath) return NextResponse.json({ error: 'path required' }, { status: 400 });

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const result = await Promise.all(
      entries
        .filter((e) => !e.name.startsWith('.'))
        .map(async (entry) => {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            return {
              name: entry.name,
              path: fullPath,
              type: 'directory' as const,
              isMedia: false,
            };
          }
          const mimeType = mime.lookup(entry.name) || undefined;
          const isMedia = mimeType ? ALL_SUPPORTED_TYPES.includes(mimeType) : false;

          // Look up scan data for this file
          let hash: string | null = null;
          let duplicateGroupId: number | null = null;
          if (isMedia) {
            try {
              const scannedFile = await prisma.scannedFile.findUnique({
                where: { path: fullPath },
                select: { hash: true, duplicateGroupId: true },
              });
              hash = scannedFile?.hash ?? null;
              duplicateGroupId = scannedFile?.duplicateGroupId ?? null;
            } catch {}
          }

          let size: number | undefined;
          try {
            const stat = await fs.stat(fullPath);
            size = stat.size;
          } catch {}

          return {
            name: entry.name,
            path: fullPath,
            type: 'file' as const,
            size,
            mimeType,
            isMedia,
            hash,
            duplicateGroupId,
          };
        }),
    );

    // Sort: directories first, then files alphabetically
    result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
