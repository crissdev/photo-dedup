import { randomUUID } from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';

import { createScanJob, getScanJob } from '@/lib/server/photos/scan-jobs';
import { runScan } from '@/lib/server/photos/scanner.service';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { rootDir } = body;
  if (!rootDir || typeof rootDir !== 'string') {
    return NextResponse.json({ error: 'rootDir is required' }, { status: 400 });
  }

  const jobId = randomUUID();
  const job = createScanJob(jobId, rootDir);

  // Start scan in background (don't await)
  runScan(job).catch(() => {});

  return NextResponse.json({ jobId });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

  const job = getScanJob(jobId);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  job.abortController.abort();
  return NextResponse.json({ ok: true });
}
