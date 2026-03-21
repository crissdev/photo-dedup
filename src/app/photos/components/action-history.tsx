'use client';

import { useCallback, useEffect, useState } from 'react';

interface FileAction {
  id: number;
  type: string;
  sourcePath: string;
  targetPath: string | null;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  revertedAt: string | null;
}

interface ActionsResponse {
  actions: FileAction[];
  total: number;
  page: number;
  limit: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function ActionHistory() {
  const [data, setData] = useState<ActionsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<FileAction | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadActions = useCallback(async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/actions?page=${p}&limit=50`);
      if (!res.ok) throw new Error('Failed to load actions');
      const json: ActionsResponse = await res.json();
      setData(json);
      setPage(p);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActions(1);
  }, [loadActions]);

  const handleRestore = useCallback(
    async (action: FileAction) => {
      setRestoringId(action.id);
      setConfirmRestore(null);
      try {
        const res = await fetch('/api/photos/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionId: action.id }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Restore failed');
        }
        setToast({ type: 'success', message: `Restored "${action.fileName}" successfully.` });
        loadActions(page);
      } catch (err) {
        setToast({ type: 'error', message: String(err) });
      } finally {
        setRestoringId(null);
        setTimeout(() => setToast(null), 4000);
      }
    },
    [page, loadActions],
  );

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Action History</h1>
          <p className="text-muted-foreground mt-1 text-sm">Track and restore deleted files</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-muted-foreground text-sm">
              {data.total} total action{data.total !== 1 ? 's' : ''}
            </span>
          )}
          <a
            href="/photos"
            className="border-border hover:bg-muted rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Back to Explorer
          </a>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border-destructive/30 text-destructive mb-4 rounded-lg border p-3 text-sm">
          {error}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={[
            'fixed right-4 bottom-4 z-50 max-w-sm rounded-xl border p-4 text-sm font-medium shadow-xl',
            toast.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
              : 'bg-destructive/10 border-destructive/30 text-destructive',
          ].join(' ')}
        >
          {toast.message}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-muted-foreground flex h-32 items-center justify-center gap-2">
          <SpinnerIcon />
          <span className="text-sm">Loading…</span>
        </div>
      ) : data && data.actions.length === 0 ? (
        <div className="text-muted-foreground flex h-48 flex-col items-center justify-center gap-3">
          <svg className="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-sm font-medium">No actions yet</p>
          <p className="text-xs">Deleted files will appear here.</p>
        </div>
      ) : (
        <div className="border-border overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">
                  Date
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">
                  Action
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">
                  File Name
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">
                  Size
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">
                  Original Path
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">
                  Status
                </th>
                <th className="text-muted-foreground px-4 py-3 text-right text-xs font-semibold tracking-wide uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.actions.map((action, i) => (
                <tr
                  key={action.id}
                  className={[
                    'border-border border-b transition-colors last:border-0',
                    i % 2 === 0 ? 'bg-card' : 'bg-muted/20',
                    action.revertedAt ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  <td className="text-muted-foreground px-4 py-3 text-xs whitespace-nowrap">
                    {formatDate(action.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                        action.type === 'DELETE'
                          ? 'bg-destructive/15 text-destructive'
                          : 'bg-green-500/15 text-green-700 dark:text-green-400',
                      ].join(' ')}
                    >
                      {action.type}
                    </span>
                  </td>
                  <td className="max-w-[200px] px-4 py-3 font-medium">
                    <span className="block truncate" title={action.fileName}>
                      {action.fileName}
                    </span>
                  </td>
                  <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                    {action.fileSize ? formatBytes(action.fileSize) : '—'}
                  </td>
                  <td className="text-muted-foreground max-w-[280px] px-4 py-3">
                    <span className="block truncate font-mono text-xs" title={action.sourcePath}>
                      {action.sourcePath}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {action.revertedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Restored {formatDate(action.revertedAt)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {action.type === 'DELETE' && !action.revertedAt && (
                      <button
                        onClick={() => setConfirmRestore(action)}
                        disabled={restoringId === action.id}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {restoringId === action.id ? (
                          <>
                            <SpinnerIcon />
                            Restoring…
                          </>
                        ) : (
                          <>
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                              />
                            </svg>
                            Restore
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages} &middot; {data?.total} total
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadActions(page - 1)}
              disabled={page <= 1 || isLoading}
              className="border-border hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => loadActions(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="border-border hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Restore confirmation dialog */}
      {confirmRestore && (
        <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border-border w-full max-w-sm rounded-2xl border p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold">Restore File?</h2>
            <p className="text-muted-foreground mb-1 text-sm">
              Restore <span className="text-foreground font-medium">{confirmRestore.fileName}</span> to its original
              location?
            </p>
            <p className="text-muted-foreground mb-6 truncate font-mono text-xs" title={confirmRestore.sourcePath}>
              {confirmRestore.sourcePath}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRestore(null)}
                className="border-border hover:bg-muted flex-1 rounded-lg border py-2 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(confirmRestore)}
                className="bg-primary text-primary-foreground flex-1 rounded-lg py-2 text-sm font-medium transition-opacity hover:opacity-90"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
