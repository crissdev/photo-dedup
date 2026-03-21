import fs from 'fs/promises';
import path from 'path';

import { prisma } from '@/lib/server/db/prisma-client';

export const TRASH_DIR_NAME = '.photo-undup-trash';

export async function softDeleteFile(filePath: string, rootDir: string): Promise<void> {
  const trashDir = path.join(rootDir, TRASH_DIR_NAME);
  await fs.mkdir(trashDir, { recursive: true });

  // Create a unique subdirectory per delete action using timestamp
  const timestamp = Date.now();
  const uniqueDir = path.join(trashDir, String(timestamp));
  await fs.mkdir(uniqueDir, { recursive: true });

  const fileName = path.basename(filePath);
  const targetPath = path.join(uniqueDir, fileName);

  await fs.rename(filePath, targetPath);

  // Get file stats for record
  let fileSize: bigint | null = null;
  let mimeType: string | null = null;
  try {
    const stat = await fs.stat(targetPath);
    fileSize = BigInt(stat.size);
    const mime = await import('mime-types');
    mimeType = mime.lookup(fileName) || null;
  } catch {}

  await prisma.fileAction.create({
    data: {
      type: 'DELETE',
      sourcePath: filePath,
      targetPath,
      fileName,
      fileSize,
      mimeType,
    },
  });

  // Remove from scanned files
  try {
    await prisma.scannedFile.delete({ where: { path: filePath } });
  } catch {}
}

export async function restoreFile(actionId: number): Promise<void> {
  const action = await prisma.fileAction.findUnique({ where: { id: actionId } });
  if (!action) throw new Error('Action not found');
  if (action.revertedAt) throw new Error('Action already reverted');
  if (action.type !== 'DELETE') throw new Error('Only DELETE actions can be restored');
  if (!action.targetPath) throw new Error('No target path found');

  // Ensure the source directory exists
  const sourceDir = path.dirname(action.sourcePath);
  await fs.mkdir(sourceDir, { recursive: true });

  await fs.rename(action.targetPath, action.sourcePath);

  await prisma.fileAction.update({
    where: { id: actionId },
    data: { revertedAt: new Date() },
  });
}
