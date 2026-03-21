import { type NextRequest, NextResponse } from 'next/server';

import type { ScanProgressEvent } from '@/lib/server/photos/photos.types';
import { getScanJob } from '@/lib/server/photos/scan-jobs';

function formatSSE(event: ScanProgressEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = getScanJob(jobId);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send all existing events
      for (const event of job.events) {
        controller.enqueue(encoder.encode(formatSSE(event)));
      }

      // If already done, close immediately
      if (job.status !== 'running') {
        controller.close();
        return;
      }

      const subscriber = (event: ScanProgressEvent) => {
        try {
          controller.enqueue(encoder.encode(formatSSE(event)));
          if (event.type !== 'progress') {
            controller.close();
          }
        } catch {}
      };

      job.subscribers.add(subscriber);

      req.signal.addEventListener('abort', () => {
        job.subscribers.delete(subscriber);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
