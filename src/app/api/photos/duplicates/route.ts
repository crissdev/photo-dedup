import { NextResponse } from 'next/server';

import { prisma } from '@/lib/server/db/prisma-client';

export async function GET() {
  const groups = await prisma.duplicateGroup.findMany({
    include: {
      files: {
        orderBy: { path: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    groups.map((g) => ({
      id: g.id,
      hash: g.hash,
      createdAt: g.createdAt,
      files: g.files.map((f) => ({
        id: f.id,
        path: f.path,
        name: f.name,
        size: Number(f.size),
        mimeType: f.mimeType,
        hash: f.hash,
        width: f.width,
        height: f.height,
        duplicateGroupId: f.duplicateGroupId,
        createdAt: f.createdAt,
      })),
    })),
  );
}
