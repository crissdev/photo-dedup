export interface ScannedFileInfo {
  id: number;
  path: string;
  name: string;
  size: number;
  mimeType: string;
  hash: string | null;
  width: number | null;
  height: number | null;
  duplicateGroupId: number | null;
  createdAt: Date;
}

export interface DuplicateGroupInfo {
  id: number;
  hash: string;
  files: ScannedFileInfo[];
  createdAt: Date;
}

export interface FileActionInfo {
  id: number;
  type: 'DELETE' | 'RESTORE';
  sourcePath: string;
  targetPath: string | null;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: Date;
  revertedAt: Date | null;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  mimeType?: string;
  isMedia: boolean;
  hash?: string | null;
  duplicateGroupId?: number | null;
}

export interface ScanProgressEvent {
  type: 'progress' | 'complete' | 'error' | 'cancelled';
  total: number;
  processed: number;
  currentFile: string;
  duplicatesFound: number;
  message?: string;
}

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/bmp',
  'image/avif',
];

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/mpeg',
  'video/3gpp',
  'video/x-ms-wmv',
];

export const ALL_SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES];

export function isImageMimeType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType);
}

export function isVideoMimeType(mimeType: string): boolean {
  return SUPPORTED_VIDEO_TYPES.includes(mimeType);
}
