import crypto from 'crypto';
import fs from 'fs/promises';
import mime from 'mime-types';
import path from 'path';

import { prisma } from '@/lib/server/db/prisma-client';

import { ALL_SUPPORTED_TYPES, isImageMimeType } from './photos.types';
import { publishScanEvent, type ScanJob } from './scan-jobs';

async function collectFiles(dir: string, signal: AbortSignal): Promise<string[]> {
  const results: string[] = [];
  async function walk(currentDir: string) {
    if (signal.aborted) return;
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (signal.aborted) return;
      const fullPath = path.join(currentDir, entry.name);
      // Skip hidden directories and the trash folder
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const mimeType = mime.lookup(entry.name);
        if (mimeType && ALL_SUPPORTED_TYPES.includes(mimeType)) {
          results.push(fullPath);
        }
      }
    }
  }
  await walk(dir);
  return results;
}

async function hashFile(filePath: string): Promise<string> {
  const hash = crypto.createHash('md5');
  const fileHandle = await fs.open(filePath, 'r');
  try {
    const CHUNK_SIZE = 64 * 1024; // 64KB chunks
    const buffer = Buffer.alloc(CHUNK_SIZE);
    let bytesRead: number;
    do {
      const result = await fileHandle.read(buffer, 0, CHUNK_SIZE);
      bytesRead = result.bytesRead;
      if (bytesRead > 0) {
        hash.update(buffer.subarray(0, bytesRead));
      }
    } while (bytesRead === CHUNK_SIZE);
  } finally {
    await fileHandle.close();
  }
  return hash.digest('hex');
}

async function getImageDimensions(
  filePath: string,
  mimeType: string,
): Promise<{ width: number | null; height: number | null }> {
  if (!isImageMimeType(mimeType)) return { width: null, height: null };
  try {
    const sharp = (await import('sharp')).default;
    const metadata = await sharp(filePath).metadata();
    return { width: metadata.width ?? null, height: metadata.height ?? null };
  } catch {
    return { width: null, height: null };
  }
}

export async function runScan(job: ScanJob): Promise<void> {
  const { rootDir, abortController } = job;
  const { signal } = abortController;

  try {
    // First pass: collect all files
    publishScanEvent(job, {
      type: 'progress',
      total: 0,
      processed: 0,
      currentFile: 'Collecting files...',
      duplicatesFound: 0,
    });

    const files = await collectFiles(rootDir, signal);
    if (signal.aborted) {
      publishScanEvent(job, {
        type: 'cancelled',
        total: files.length,
        processed: 0,
        currentFile: '',
        duplicatesFound: 0,
      });
      return;
    }

    // Clear existing scan data for this directory
    await prisma.scannedFile.deleteMany({
      where: { path: { startsWith: rootDir } },
    });
    await prisma.duplicateGroup.deleteMany({
      where: { files: { none: {} } },
    });

    const total = files.length;
    let processed = 0;

    // Hash tracking for duplicate detection
    const hashMap = new Map<string, number[]>(); // hash -> array of db ids

    // Second pass: hash and store files
    for (const filePath of files) {
      if (signal.aborted) {
        publishScanEvent(job, { type: 'cancelled', total, processed, currentFile: filePath, duplicatesFound: 0 });
        return;
      }

      try {
        const stat = await fs.stat(filePath);
        const mimeType = mime.lookup(filePath) || 'application/octet-stream';
        const hash = await hashFile(filePath);
        const { width, height } = await getImageDimensions(filePath, mimeType);

        const scannedFile = await prisma.scannedFile.upsert({
          where: { path: filePath },
          create: {
            path: filePath,
            name: path.basename(filePath),
            size: stat.size,
            mimeType,
            hash,
            width,
            height,
          },
          update: {
            name: path.basename(filePath),
            size: stat.size,
            mimeType,
            hash,
            width,
            height,
            duplicateGroupId: null,
          },
        });

        const existing = hashMap.get(hash) ?? [];
        existing.push(scannedFile.id);
        hashMap.set(hash, existing);

        processed++;
        publishScanEvent(job, {
          type: 'progress',
          total,
          processed,
          currentFile: path.basename(filePath),
          duplicatesFound: [...hashMap.values()].filter((ids) => ids.length > 1).length,
        });
      } catch {
        processed++;
      }
    }

    // Third pass: create duplicate groups
    let duplicatesFound = 0;
    for (const [hash, ids] of hashMap) {
      if (ids.length < 2) continue;
      duplicatesFound++;

      const group = await prisma.duplicateGroup.upsert({
        where: { hash },
        create: { hash },
        update: {},
      });

      await prisma.scannedFile.updateMany({
        where: { id: { in: ids } },
        data: { duplicateGroupId: group.id },
      });
    }

    // Clean up empty groups
    await prisma.duplicateGroup.deleteMany({ where: { files: { none: {} } } });

    publishScanEvent(job, {
      type: 'complete',
      total,
      processed,
      currentFile: '',
      duplicatesFound,
    });
  } catch (err) {
    publishScanEvent(job, {
      type: 'error',
      total: 0,
      processed: 0,
      currentFile: '',
      duplicatesFound: 0,
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
