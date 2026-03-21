import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/server/db/prisma-client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);
  const skip = (page - 1) * limit;

  const [actions, total] = await Promise.all([
    prisma.fileAction.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.fileAction.count(),
  ]);

  return NextResponse.json({
    actions: actions.map((a) => ({
      id: a.id,
      type: a.type,
      sourcePath: a.sourcePath,
      targetPath: a.targetPath,
      fileName: a.fileName,
      fileSize: a.fileSize ? Number(a.fileSize) : null,
      mimeType: a.mimeType,
      createdAt: a.createdAt,
      revertedAt: a.revertedAt,
    })),
    total,
    page,
    limit,
  });
}
