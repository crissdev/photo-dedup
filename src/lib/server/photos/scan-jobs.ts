import type { ScanProgressEvent } from './photos.types';

export interface ScanJob {
  id: string;
  status: 'running' | 'completed' | 'cancelled' | 'error';
  rootDir: string;
  progress: ScanProgressEvent;
  events: ScanProgressEvent[];
  subscribers: Set<(event: ScanProgressEvent) => void>;
  abortController: AbortController;
  startedAt: Date;
}

// Module-level Map to track active and recently completed scan jobs
const scanJobs = new Map<string, ScanJob>();

export function createScanJob(id: string, rootDir: string): ScanJob {
  const job: ScanJob = {
    id,
    status: 'running',
    rootDir,
    progress: { type: 'progress', total: 0, processed: 0, currentFile: '', duplicatesFound: 0 },
    events: [],
    subscribers: new Set(),
    abortController: new AbortController(),
    startedAt: new Date(),
  };
  scanJobs.set(id, job);
  return job;
}

export function getScanJob(id: string): ScanJob | undefined {
  return scanJobs.get(id);
}

export function publishScanEvent(job: ScanJob, event: ScanProgressEvent): void {
  job.events.push(event);
  job.progress = event;
  if (event.type !== 'progress') {
    job.status = event.type === 'complete' ? 'completed' : event.type === 'cancelled' ? 'cancelled' : 'error';
  }
  for (const subscriber of job.subscribers) {
    try {
      subscriber(event);
    } catch {}
  }
}
