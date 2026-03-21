import { type NextRequest, NextResponse } from 'next/server';

import { restoreFile } from '@/lib/server/photos/file-ops.service';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { actionId } = body as { actionId: number };

  if (typeof actionId !== 'number') {
    return NextResponse.json({ error: 'actionId required' }, { status: 400 });
  }

  try {
    await restoreFile(actionId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
