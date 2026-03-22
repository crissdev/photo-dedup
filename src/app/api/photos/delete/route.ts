import { type NextRequest, NextResponse } from 'next/server';

import { softDeleteFile } from '@/lib/server/photos/file-ops.service';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { paths, rootDir, trashDir } = body as { paths: string[]; rootDir: string; trashDir?: string };

  if (!Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: 'paths array required' }, { status: 400 });
  }
  if (!rootDir) {
    return NextResponse.json({ error: 'rootDir required' }, { status: 400 });
  }

  const results: Array<{ path: string; ok: boolean; error?: string }> = [];

  for (const filePath of paths) {
    try {
      await softDeleteFile(filePath, rootDir, trashDir || undefined);
      results.push({ path: filePath, ok: true });
    } catch (err) {
      results.push({ path: filePath, ok: false, error: String(err) });
    }
  }

  return NextResponse.json({ results });
}
