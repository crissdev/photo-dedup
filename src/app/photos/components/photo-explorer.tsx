'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { DirectoryEntry, DuplicateGroupInfo, ScanProgressEvent } from '@/lib/server/photos/photos.types';
import { isImageMimeType, isVideoMimeType } from '@/lib/server/photos/photos.types';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function thumbnailUrl(filePath: string, size = 200): string {
  return `/api/photos/thumbnail?path=${encodeURIComponent(filePath)}&size=${size}`;
}

function mediaUrl(filePath: string): string {
  return `/api/photos/media?path=${encodeURIComponent(filePath)}`;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function FileCard({
  entry,
  isSelected,
  isKeep,
  selectable,
  onSelect,
  onClick,
}: {
  entry: DirectoryEntry;
  isSelected: boolean;
  isKeep?: boolean;
  selectable: boolean;
  onSelect?: (path: string, selected: boolean) => void;
  onClick?: (entry: DirectoryEntry) => void;
}) {
  const isDuplicate = entry.duplicateGroupId != null;
  const isImage = entry.mimeType ? isImageMimeType(entry.mimeType) : false;
  const isVideo = entry.mimeType ? isVideoMimeType(entry.mimeType) : false;

  return (
    <div
      className={[
        'group relative cursor-pointer overflow-hidden rounded-lg border transition-all',
        isSelected
          ? 'border-destructive ring-destructive/30 bg-destructive/5 ring-2'
          : isKeep
            ? 'border-green-500 bg-green-500/5 ring-2 ring-green-500/30'
            : isDuplicate
              ? 'border-yellow-400/60 bg-yellow-400/5'
              : 'border-border hover:border-primary/40',
      ].join(' ')}
      onClick={() => onClick?.(entry)}
    >
      {/* Thumbnail area */}
      <div className="bg-muted relative flex aspect-square w-full items-center justify-center overflow-hidden">
        {isImage ? (
          <img src={thumbnailUrl(entry.path)} alt={entry.name} className="h-full w-full object-cover" loading="lazy" />
        ) : isVideo ? (
          <div className="text-muted-foreground flex flex-col items-center gap-1">
            <VideoIcon />
            <span className="text-xs">Video</span>
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-1">
            <FileIcon />
          </div>
        )}

        {/* Duplicate badge */}
        {isDuplicate && !isKeep && !isSelected && (
          <span className="absolute top-1 right-1 rounded-full bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            DUP
          </span>
        )}
        {isKeep && (
          <span className="absolute top-1 right-1 rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            KEEP
          </span>
        )}
        {isSelected && (
          <span className="bg-destructive absolute top-1 right-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white">
            DEL
          </span>
        )}

        {/* Selectable checkbox overlay */}
        {selectable && (
          <div
            className="absolute top-1 left-1"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(entry.path, !isSelected);
            }}
          >
            <div
              className={[
                'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                isSelected
                  ? 'bg-destructive border-destructive text-white'
                  : 'bg-background/80 border-muted-foreground/60 hover:border-primary',
              ].join(' ')}
            >
              {isSelected && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>

      {/* File info */}
      <div className="p-2">
        <p className="truncate text-xs font-medium" title={entry.name}>
          {entry.name}
        </p>
        {entry.size != null && <p className="text-muted-foreground text-[11px]">{formatBytes(entry.size)}</p>}
      </div>
    </div>
  );
}

function DuplicateGroupCard({
  group,
  selectedForDeletion,
  onSelect,
  onPreview,
  rootDir,
}: {
  group: DuplicateGroupInfo;
  selectedForDeletion: Set<string>;
  onSelect: (path: string, selected: boolean) => void;
  onPreview: (entry: DirectoryEntry) => void;
  rootDir: string;
}) {
  const files = group.files;
  // The "keep" candidate is the first file (by path, already sorted asc)
  const keepPath = files.find((f) => !selectedForDeletion.has(f.path))?.path ?? files[0]?.path;

  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Group #{group.id}</span>
          <span className="text-muted-foreground text-xs">
            {files.length} files &middot; hash: {group.hash.slice(0, 12)}…
          </span>
        </div>
        <button
          className="text-muted-foreground hover:text-destructive text-xs transition-colors"
          onClick={() => {
            // Select all but the first for deletion
            files.slice(1).forEach((f) => onSelect(f.path, true));
          }}
        >
          Select duplicates
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {files.map((file) => {
          const entry: DirectoryEntry = {
            name: file.name,
            path: file.path,
            type: 'file',
            size: file.size,
            mimeType: file.mimeType,
            isMedia: true,
            hash: file.hash,
            duplicateGroupId: file.duplicateGroupId,
          };
          const isSelected = selectedForDeletion.has(file.path);
          const isKeep = file.path === keepPath && !isSelected;
          return (
            <FileCard
              key={file.path}
              entry={entry}
              isSelected={isSelected}
              isKeep={isKeep}
              selectable={true}
              onSelect={onSelect}
              onClick={onPreview}
            />
          );
        })}
      </div>

      {/* Path list */}
      <div className="mt-3 space-y-1">
        {files.map((file) => (
          <div key={file.path} className="text-muted-foreground flex items-center gap-2 text-xs">
            <span
              className={[
                'h-2 w-2 flex-shrink-0 rounded-full',
                selectedForDeletion.has(file.path)
                  ? 'bg-destructive'
                  : file.path === keepPath
                    ? 'bg-green-500'
                    : 'bg-muted-foreground/40',
              ].join(' ')}
            />
            <span className="truncate font-mono" title={file.path}>
              {file.path.replace(rootDir, '').replace(/^\//, '')}
            </span>
            <span className="flex-shrink-0">{formatBytes(file.size)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FolderTree({
  rootDir,
  currentDir,
  onNavigate,
}: {
  rootDir: string;
  currentDir: string;
  onNavigate: (path: string) => void;
}) {
  if (!rootDir) return null;

  // Build breadcrumb parts from currentDir relative to rootDir
  const relative = currentDir.startsWith(rootDir) ? currentDir.slice(rootDir.length) : '';
  const parts = relative.split('/').filter(Boolean);

  return (
    <div className="space-y-1 p-3">
      <button
        onClick={() => onNavigate(rootDir)}
        className={[
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
          currentDir === rootDir ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-foreground',
        ].join(' ')}
      >
        <FolderIcon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate font-medium">{rootDir.split('/').pop() || rootDir}</span>
      </button>

      {parts.map((part, i) => {
        const pathUpToHere = rootDir + '/' + parts.slice(0, i + 1).join('/');
        const isActive = pathUpToHere === currentDir;
        return (
          <button
            key={pathUpToHere}
            onClick={() => onNavigate(pathUpToHere)}
            style={{ paddingLeft: `${(i + 1) * 12 + 8}px` }}
            className={[
              'flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm transition-colors',
              isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-foreground',
            ].join(' ')}
          >
            <FolderIcon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{part}</span>
          </button>
        );
      })}
    </div>
  );
}

function ScanProgressOverlay({ progress, onCancel }: { progress: ScanProgressEvent; onCancel: () => void }) {
  const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
  const isDone = progress.type !== 'progress';

  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-card border-border mx-4 w-full max-w-md rounded-2xl border p-8 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold">
          {progress.type === 'complete'
            ? 'Scan Complete'
            : progress.type === 'cancelled'
              ? 'Scan Cancelled'
              : progress.type === 'error'
                ? 'Scan Error'
                : 'Scanning Files…'}
        </h2>

        {progress.type === 'progress' && (
          <p className="text-muted-foreground mb-4 truncate text-sm" title={progress.currentFile}>
            {progress.currentFile || 'Starting…'}
          </p>
        )}

        {progress.type === 'complete' && (
          <p className="text-muted-foreground mb-4 text-sm">
            Found {progress.duplicatesFound} duplicate group{progress.duplicatesFound !== 1 ? 's' : ''} in{' '}
            {progress.total} files.
          </p>
        )}

        {progress.type === 'error' && <p className="text-destructive mb-4 text-sm">{progress.message}</p>}

        {progress.type === 'cancelled' && <p className="text-muted-foreground mb-4 text-sm">Scan was cancelled.</p>}

        {/* Progress bar */}
        <div className="bg-muted mb-3 h-2 overflow-hidden rounded-full">
          <div
            className={[
              'h-full rounded-full transition-all duration-300',
              progress.type === 'complete'
                ? 'bg-green-500'
                : progress.type === 'error'
                  ? 'bg-destructive'
                  : progress.type === 'cancelled'
                    ? 'bg-muted-foreground'
                    : 'bg-primary',
            ].join(' ')}
            style={{ width: isDone ? '100%' : `${pct}%` }}
          />
        </div>

        <div className="text-muted-foreground mb-6 flex items-center justify-between text-xs">
          <span>
            {progress.processed} / {progress.total > 0 ? progress.total : '?'} files
          </span>
          {progress.duplicatesFound > 0 && <span>{progress.duplicatesFound} duplicate groups found</span>}
          {progress.type === 'progress' && progress.total > 0 && <span>{pct}%</span>}
        </div>

        {isDone ? (
          <button
            onClick={onCancel}
            className="bg-primary text-primary-foreground w-full rounded-lg py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Done
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="border-border hover:bg-muted w-full rounded-lg border py-2 text-sm font-medium transition-colors"
          >
            Cancel Scan
          </button>
        )}
      </div>
    </div>
  );
}

function FilePreviewModal({ entry, onClose }: { entry: DirectoryEntry; onClose: () => void }) {
  const isImage = entry.mimeType ? isImageMimeType(entry.mimeType) : false;
  const isVideo = entry.mimeType ? isVideoMimeType(entry.mimeType) : false;

  return (
    <div
      className="bg-background/90 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border-border flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b p-4">
          <div>
            <p className="truncate font-semibold" title={entry.name}>
              {entry.name}
            </p>
            <p className="text-muted-foreground truncate text-xs" title={entry.path}>
              {entry.path}
            </p>
          </div>
          <button onClick={onClose} className="hover:bg-muted ml-4 rounded-lg p-2 transition-colors">
            <CloseIcon />
          </button>
        </div>

        {/* Media */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/5 dark:bg-black/30">
          {isImage ? (
            <img
              src={thumbnailUrl(entry.path, 800)}
              alt={entry.name}
              className="max-h-[60vh] max-w-full object-contain"
            />
          ) : isVideo ? (
            <video src={mediaUrl(entry.path)} controls className="max-h-[60vh] max-w-full" />
          ) : (
            <div className="text-muted-foreground flex flex-col items-center gap-3 p-8">
              <FileIcon />
              <span className="text-sm">Preview not available</span>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="border-border flex flex-wrap gap-4 border-t p-4 text-sm">
          {entry.size != null && (
            <div>
              <span className="text-muted-foreground">Size: </span>
              <span>{formatBytes(entry.size)}</span>
            </div>
          )}
          {entry.mimeType && (
            <div>
              <span className="text-muted-foreground">Type: </span>
              <span>{entry.mimeType}</span>
            </div>
          )}
          {entry.hash && (
            <div>
              <span className="text-muted-foreground">Hash: </span>
              <span className="font-mono text-xs">{entry.hash}</span>
            </div>
          )}
          {entry.duplicateGroupId && (
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                Duplicate group #{entry.duplicateGroupId}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteProgressOverlay({ progress }: { progress: { done: number; total: number } }) {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-card border-border mx-4 w-full max-w-sm rounded-2xl border p-8 text-center shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Deleting Files…</h2>
        <div className="bg-muted mb-3 h-2 overflow-hidden rounded-full">
          <div
            className="bg-destructive h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-muted-foreground text-sm">
          {progress.done} / {progress.total} files
        </p>
      </div>
    </div>
  );
}

// ─── icons ────────────────────────────────────────────────────────────────────

function FolderIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ─── directory picker modal ───────────────────────────────────────────────────

function DirectoryPickerModal({ onSelect, onClose }: { onSelect: (path: string) => void; onClose: () => void }) {
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState<{ name: string; path: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/files?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error('Cannot read directory');
      const data: { name: string; path: string; type: string }[] = await res.json();
      setCurrentPath(path);
      setEntries(data.filter((e) => e.type === 'directory'));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load home directory on mount
  useEffect(() => {
    fetch('/api/photos/home')
      .then((r) => r.json())
      .then(({ home }: { home: string }) => navigate(home))
      .catch(() => navigate('/'));
  }, [navigate]);

  // Build breadcrumb parts from current path
  const parts = currentPath.split('/').filter(Boolean);

  const navigateUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    navigate(parent);
  };

  return (
    <div
      className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border-border flex h-[480px] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Select a folder</h2>
          <button onClick={onClose} className="hover:bg-muted rounded-lg p-1.5 transition-colors">
            <CloseIcon />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="border-border bg-muted/40 flex items-center gap-1 overflow-x-auto border-b px-3 py-2 text-xs">
          <button onClick={() => navigate('/')} className="hover:text-primary flex-shrink-0 transition-colors">
            /
          </button>
          {parts.map((part, i) => {
            const pathUpTo = '/' + parts.slice(0, i + 1).join('/');
            return (
              <span key={pathUpTo} className="flex items-center gap-1">
                <span className="text-muted-foreground">/</span>
                <button
                  onClick={() => navigate(pathUpTo)}
                  className={[
                    'flex-shrink-0 transition-colors',
                    i === parts.length - 1 ? 'font-semibold' : 'hover:text-primary',
                  ].join(' ')}
                >
                  {part}
                </button>
              </span>
            );
          })}
        </div>

        {/* Directory list */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
              <SpinnerIcon />
              Loading…
            </div>
          ) : error ? (
            <div className="text-destructive flex h-full items-center justify-center p-4 text-sm">{error}</div>
          ) : (
            <div className="p-2">
              {currentPath !== '/' && (
                <button
                  onClick={navigateUp}
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
                >
                  <span className="text-muted-foreground">↑</span>
                  <span className="text-muted-foreground italic">Parent folder</span>
                </button>
              )}
              {entries.length === 0 && (
                <p className="text-muted-foreground px-3 py-6 text-center text-sm">No subfolders</p>
              )}
              {entries.map((entry) => (
                <button
                  key={entry.path}
                  onClick={() => navigate(entry.path)}
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
                >
                  <FolderIcon className="text-primary h-4 w-4 flex-shrink-0" />
                  <span className="min-w-0 truncate text-left">{entry.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-between border-t px-4 py-3">
          <p className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs" title={currentPath}>
            {currentPath || '…'}
          </p>
          <button
            onClick={() => {
              onSelect(currentPath);
              onClose();
            }}
            disabled={!currentPath}
            className="bg-primary text-primary-foreground ml-4 flex-shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Select this folder
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function PhotoExplorer() {
  const [rootDir, setRootDir] = useState('');
  const [rootDirInput, setRootDirInput] = useState('');
  const [currentDir, setCurrentDir] = useState('');
  const [files, setFiles] = useState<DirectoryEntry[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroupInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'files' | 'duplicates'>('files');
  const [scanJobId, setScanJobId] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgressEvent | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DirectoryEntry | null>(null);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<{ done: number; total: number } | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanOverlay, setShowScanOverlay] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDirPicker, setShowDirPicker] = useState(false);

  const sseRef = useRef<EventSource | null>(null);

  // Load files for a directory
  const loadFiles = useCallback(async (dir: string) => {
    setIsLoadingFiles(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/files?path=${encodeURIComponent(dir)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load files');
      }
      const data: DirectoryEntry[] = await res.json();
      setFiles(data);
      setCurrentDir(dir);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  // Load duplicate groups
  const loadDuplicates = useCallback(async () => {
    try {
      const res = await fetch('/api/photos/duplicates');
      if (!res.ok) return;
      const data: DuplicateGroupInfo[] = await res.json();
      setDuplicates(data);
    } catch {}
  }, []);

  // Navigate to a directory
  const navigateTo = useCallback(
    (dir: string) => {
      setSelectedForDeletion(new Set());
      loadFiles(dir);
    },
    [loadFiles],
  );

  // Handle directory entry click
  const handleFileClick = useCallback(
    (entry: DirectoryEntry) => {
      if (entry.type === 'directory') {
        navigateTo(entry.path);
      } else if (entry.isMedia) {
        setSelectedFile(entry);
      }
    },
    [navigateTo],
  );

  // Start scan
  const startScan = useCallback(async () => {
    if (!rootDir) return;
    setError(null);
    setIsScanning(true);
    setShowScanOverlay(true);
    setScanProgress({ type: 'progress', total: 0, processed: 0, currentFile: 'Starting…', duplicatesFound: 0 });

    try {
      const res = await fetch('/api/photos/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootDir }),
      });
      if (!res.ok) throw new Error('Failed to start scan');
      const { jobId } = await res.json();
      setScanJobId(jobId);

      // Connect to SSE
      if (sseRef.current) sseRef.current.close();
      const sse = new EventSource(`/api/photos/scan/${jobId}/progress`);
      sseRef.current = sse;

      sse.onmessage = (e) => {
        const event: ScanProgressEvent = JSON.parse(e.data);
        setScanProgress(event);
        if (event.type !== 'progress') {
          sse.close();
          sseRef.current = null;
          setIsScanning(false);
          setScanJobId(null);
          // Refresh data
          loadFiles(currentDir || rootDir);
          loadDuplicates();
        }
      };

      sse.onerror = () => {
        sse.close();
        sseRef.current = null;
        setIsScanning(false);
        setScanJobId(null);
      };
    } catch (err) {
      setError(String(err));
      setIsScanning(false);
      setShowScanOverlay(false);
    }
  }, [rootDir, currentDir, loadFiles, loadDuplicates]);

  // Cancel scan
  const cancelScan = useCallback(async () => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    if (scanJobId) {
      await fetch(`/api/photos/scan?jobId=${scanJobId}`, { method: 'DELETE' });
      setScanJobId(null);
    }
    setIsScanning(false);
    if (scanProgress?.type !== 'complete' && scanProgress?.type !== 'error') {
      setShowScanOverlay(false);
      setScanProgress(null);
    }
  }, [scanJobId, scanProgress]);

  // Handle scan overlay dismiss (after completion)
  const dismissScanOverlay = useCallback(() => {
    setShowScanOverlay(false);
    setScanProgress(null);
    if (scanProgress?.type === 'complete') {
      setActiveTab('duplicates');
    }
  }, [scanProgress]);

  // Set root directory
  const handleSetRootDir = useCallback(
    (dir?: string) => {
      const resolved = (dir ?? rootDirInput).trim();
      if (!resolved) return;
      setRootDirInput(resolved);
      setRootDir(resolved);
      setCurrentDir(resolved);
      setSelectedForDeletion(new Set());
      loadFiles(resolved);
      loadDuplicates();
    },
    [rootDirInput, loadFiles, loadDuplicates],
  );

  // Handle tab change
  const handleTabChange = useCallback(
    (tab: 'files' | 'duplicates') => {
      setActiveTab(tab);
      if (tab === 'duplicates') loadDuplicates();
    },
    [loadDuplicates],
  );

  // Toggle selection
  const toggleSelection = useCallback((path: string, selected: boolean) => {
    setSelectedForDeletion((prev) => {
      const next = new Set(prev);
      if (selected) next.add(path);
      else next.delete(path);
      return next;
    });
  }, []);

  // Delete selected files
  const deleteSelected = useCallback(async () => {
    if (selectedForDeletion.size === 0 || !rootDir) return;
    const paths = [...selectedForDeletion];
    setIsDeleting(true);
    setDeleteProgress({ done: 0, total: paths.length });
    setConfirmDelete(false);

    // Process one at a time for progress tracking
    let done = 0;
    for (const filePath of paths) {
      await fetch('/api/photos/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [filePath], rootDir }),
      });
      done++;
      setDeleteProgress({ done, total: paths.length });
    }

    setIsDeleting(false);
    setDeleteProgress(null);
    setSelectedForDeletion(new Set());

    // Refresh
    loadFiles(currentDir || rootDir);
    loadDuplicates();
  }, [selectedForDeletion, rootDir, currentDir, loadFiles, loadDuplicates]);

  // Refresh current view
  const refresh = useCallback(() => {
    if (currentDir) loadFiles(currentDir);
    if (activeTab === 'duplicates') loadDuplicates();
  }, [currentDir, activeTab, loadFiles, loadDuplicates]);

  const dirEntries = files.filter((f) => f.type === 'directory');
  const fileEntries = files.filter((f) => f.type === 'file');
  const mediaFiles = fileEntries.filter((f) => f.isMedia);
  const nonMediaFiles = fileEntries.filter((f) => !f.isMedia);
  const duplicateCount = duplicates.length;
  const totalDuplicateFiles = duplicates.reduce((acc, g) => acc + g.files.length - 1, 0);

  return (
    <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="border-border bg-card flex flex-shrink-0 items-center gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FolderIcon className="text-primary h-6 w-6 flex-shrink-0" />
          <h1 className="text-base font-semibold whitespace-nowrap">Photo Deduplicator</h1>
        </div>

        {/* Directory input */}
        <div className="flex max-w-xl flex-1 items-center gap-2">
          <input
            type="text"
            value={rootDirInput}
            onChange={(e) => setRootDirInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetRootDir()}
            placeholder="/path/to/photos"
            className="border-input bg-background focus:ring-ring min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
          />
          <button
            onClick={() => setShowDirPicker(true)}
            className="border-input hover:bg-accent flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors"
            title="Browse filesystem"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
              />
            </svg>
            Browse
          </button>
          <button
            onClick={() => handleSetRootDir()}
            disabled={!rootDirInput.trim()}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors disabled:opacity-50"
          >
            Open
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {rootDir && (
            <>
              <button
                onClick={startScan}
                disabled={isScanning}
                className="bg-primary text-primary-foreground flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <SpinnerIcon />
                    Scanning…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    Scan
                  </>
                )}
              </button>
              <button onClick={refresh} className="hover:bg-muted rounded-lg p-1.5 transition-colors" title="Refresh">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </>
          )}
          <a
            href="/photos/history"
            className="border-border hover:bg-muted rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
          >
            History
          </a>
        </div>
      </header>

      {!rootDir ? (
        /* Empty state */
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-sm px-4 text-center">
            <div className="text-muted-foreground mb-4">
              <svg className="mx-auto h-16 w-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold">Open a Photo Directory</h2>
            <p className="text-muted-foreground text-sm">
              Enter the path to a folder containing your photos above, then click Open to browse and scan for
              duplicates.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="border-border bg-card w-56 flex-shrink-0 overflow-y-auto border-r">
            <FolderTree rootDir={rootDir} currentDir={currentDir} onNavigate={navigateTo} />

            {/* Sub-directories listing */}
            {dirEntries.length > 0 && (
              <div className="space-y-0.5 px-3 pb-3">
                <p className="text-muted-foreground px-2 py-1 text-[11px] font-semibold tracking-wide uppercase">
                  Subdirectories
                </p>
                {dirEntries.map((dir) => (
                  <button
                    key={dir.path}
                    onClick={() => navigateTo(dir.path)}
                    className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors"
                  >
                    <FolderIcon className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{dir.name}</span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* Main content */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {/* Tabs + toolbar */}
            <div className="border-border bg-card flex flex-shrink-0 items-center gap-4 border-b px-4">
              <div className="flex items-center gap-1 py-2">
                <button
                  onClick={() => handleTabChange('files')}
                  className={[
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    activeTab === 'files'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  All Files
                  {fileEntries.length > 0 && <span className="ml-1.5 text-xs opacity-70">({fileEntries.length})</span>}
                </button>
                <button
                  onClick={() => handleTabChange('duplicates')}
                  className={[
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    activeTab === 'duplicates'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  Duplicates
                  {duplicateCount > 0 && (
                    <span
                      className={[
                        'ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-bold',
                        activeTab === 'duplicates'
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
                      ].join(' ')}
                    >
                      {duplicateCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex-1" />

              {/* Selection actions */}
              {selectedForDeletion.size > 0 && (
                <div className="flex items-center gap-2 py-2">
                  <span className="text-muted-foreground text-sm">{selectedForDeletion.size} selected</span>
                  <button
                    onClick={() => setSelectedForDeletion(new Set())}
                    className="hover:bg-muted rounded-md px-2 py-1 text-xs transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={isDeleting}
                    className="bg-destructive flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete {selectedForDeletion.size}
                  </button>
                </div>
              )}

              {/* Path breadcrumb */}
              <div className="text-muted-foreground max-w-xs truncate py-2 text-xs" title={currentDir}>
                {currentDir.replace(rootDir, '') || '/'}
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="bg-destructive/10 border-destructive/30 text-destructive mx-4 mt-4 flex items-center justify-between rounded-lg border p-3 text-sm">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-2 hover:opacity-70">
                  <CloseIcon />
                </button>
              </div>
            )}

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'files' && (
                <div>
                  {isLoadingFiles ? (
                    <div className="text-muted-foreground flex h-32 items-center justify-center gap-2">
                      <SpinnerIcon />
                      <span className="text-sm">Loading…</span>
                    </div>
                  ) : (
                    <>
                      {/* Media files grid */}
                      {mediaFiles.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                          {mediaFiles.map((entry) => (
                            <FileCard
                              key={entry.path}
                              entry={entry}
                              isSelected={selectedForDeletion.has(entry.path)}
                              selectable={true}
                              onSelect={toggleSelection}
                              onClick={handleFileClick}
                            />
                          ))}
                        </div>
                      ) : (
                        fileEntries.length === 0 &&
                        dirEntries.length === 0 && (
                          <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
                            No files in this directory
                          </div>
                        )
                      )}

                      {/* Non-media files */}
                      {nonMediaFiles.length > 0 && (
                        <div className="mt-6">
                          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                            Other files ({nonMediaFiles.length})
                          </p>
                          <div className="space-y-1">
                            {nonMediaFiles.map((entry) => (
                              <div
                                key={entry.path}
                                className="hover:bg-muted flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                              >
                                <FileIcon />
                                <span className="flex-1 truncate">{entry.name}</span>
                                {entry.size != null && (
                                  <span className="text-muted-foreground flex-shrink-0 text-xs">
                                    {formatBytes(entry.size)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'duplicates' && (
                <div>
                  {duplicates.length === 0 ? (
                    <div className="text-muted-foreground flex h-48 flex-col items-center justify-center gap-3">
                      <svg className="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm font-medium">No duplicates found</p>
                      <p className="max-w-xs text-center text-xs">
                        Run a scan first to detect duplicate files in your photo library.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* Summary bar */}
                      <div className="mb-4 flex items-center justify-between rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                        <div className="text-sm">
                          <span className="font-semibold">
                            {duplicateCount} duplicate group{duplicateCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            ({totalDuplicateFiles} extra file{totalDuplicateFiles !== 1 ? 's' : ''} can be removed)
                          </span>
                        </div>
                        {selectedForDeletion.size === 0 && (
                          <button
                            onClick={() => {
                              // Auto-select all but first in each group
                              const toDelete = duplicates.flatMap((g) => g.files.slice(1).map((f) => f.path));
                              setSelectedForDeletion(new Set(toDelete));
                            }}
                            className="rounded-lg bg-yellow-500/20 px-3 py-1.5 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-500/30 dark:text-yellow-400"
                          >
                            Auto-select duplicates
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        {duplicates.map((group) => (
                          <DuplicateGroupCard
                            key={group.id}
                            group={group}
                            selectedForDeletion={selectedForDeletion}
                            onSelect={toggleSelection}
                            onPreview={setSelectedFile}
                            rootDir={rootDir}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* Overlays */}
      {showScanOverlay && scanProgress && (
        <ScanProgressOverlay
          progress={scanProgress}
          onCancel={scanProgress.type === 'progress' ? cancelScan : dismissScanOverlay}
        />
      )}

      {selectedFile && <FilePreviewModal entry={selectedFile} onClose={() => setSelectedFile(null)} />}
      {showDirPicker && (
        <DirectoryPickerModal onSelect={(path) => handleSetRootDir(path)} onClose={() => setShowDirPicker(false)} />
      )}

      {isDeleting && deleteProgress && <DeleteProgressOverlay progress={deleteProgress} />}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border-border mx-4 w-full max-w-sm rounded-2xl border p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold">Confirm Deletion</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Move {selectedForDeletion.size} file{selectedForDeletion.size !== 1 ? 's' : ''} to trash? They can be
              restored from the History page.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="border-border hover:bg-muted flex-1 rounded-lg border py-2 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteSelected}
                className="bg-destructive flex-1 rounded-lg py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Delete {selectedForDeletion.size} file{selectedForDeletion.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
