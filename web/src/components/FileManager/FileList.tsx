import { useState, useEffect, useCallback, type MouseEvent } from 'react';
import { Folder, File, ChevronLeft, ChevronRight } from 'lucide-react';
import type { BrowseEntry } from '../../lib/api';
import { browseShared } from '../../lib/api';
import { showToast } from './Toast';

interface Props {
  onNavigate: (path: string) => void;
  onFileClick: (name: string) => void;
  onContextMenu: (e: MouseEvent, entry: BrowseEntry) => void;
  refreshKey: number;
}

function formatSize(bytes?: number): string {
  if (bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileList({ onNavigate, onFileClick, onContextMenu, refreshKey }: Props) {
  const [entries, setEntries] = useState<BrowseEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDir = useCallback(async (path: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await browseShared(path);
      setEntries(res.entries);
      setCurrentPath(res.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      showToast('error', '加载目录失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDir('');
  }, [loadDir, refreshKey]);

  const handleFolderClick = (name: string) => {
    const newPath = currentPath ? `${currentPath}/${name}` : name;
    loadDir(newPath);
    onNavigate(newPath);
  };

  const handleBreadcrumbClick = (index: number) => {
    const parts = currentPath.split('/');
    const newPath = parts.slice(0, index).join('/');
    loadDir(newPath);
    onNavigate(newPath);
  };

  const goUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    const newPath = parts.join('/');
    loadDir(newPath);
    onNavigate(newPath);
  };

  const breadcrumbs = currentPath ? currentPath.split('/') : [];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 面包屑 */}
      <div
        className="flex items-center gap-1 px-4 py-2 text-xs shrink-0 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--pc-separator)' }}
      >
        <button
          onClick={goUp}
          className="flex items-center justify-center h-6 w-6 rounded-lg transition-colors shrink-0"
          style={{ color: 'var(--pc-text-muted)', background: 'transparent', border: 'none', cursor: currentPath ? 'pointer' : 'default' }}
          onMouseEnter={(e) => { if (currentPath) e.currentTarget.style.background = 'var(--pc-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          disabled={!currentPath}
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => { loadDir(''); onNavigate(''); }}
          className="px-1.5 py-0.5 rounded-md transition-colors whitespace-nowrap"
          style={{
            color: breadcrumbs.length === 0 ? 'var(--pc-accent-light)' : 'var(--pc-text-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '11px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--pc-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          root
        </button>
        {breadcrumbs.map((seg, i) => (
          <div key={i} className="flex items-center gap-1">
            <ChevronRight size={10} style={{ color: 'var(--pc-text-faint)' }} />
            <button
              onClick={() => handleBreadcrumbClick(i + 1)}
              className="px-1.5 py-0.5 rounded-md transition-colors whitespace-nowrap text-[11px]"
              style={{
                color: i === breadcrumbs.length - 1 ? 'var(--pc-accent-light)' : 'var(--pc-text-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--pc-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {seg}
            </button>
          </div>
        ))}
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-6 w-6 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--pc-border)', borderTopColor: 'var(--pc-accent)' }}
            />
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm" style={{ color: 'var(--color-status-error)' }}>{error}</p>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm" style={{ color: 'var(--pc-text-muted)' }}>此目录为空</p>
          </div>
        )}

        {!loading && entries.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors select-none"
            style={{ borderBottom: '1px solid var(--pc-separator)' }}
            onClick={() => {
              if (entry.kind === 'dir') {
                handleFolderClick(entry.name);
              } else {
                onFileClick(entry.name);
              }
            }}
            onContextMenu={(e) => onContextMenu(e, entry)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--pc-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {entry.kind === 'dir' ? (
              <Folder size={16} style={{ color: 'var(--pc-accent-light)', flexShrink: 0 }} />
            ) : (
              <File size={16} style={{ color: 'var(--pc-text-muted)', flexShrink: 0 }} />
            )}
            <span
              className="text-sm truncate flex-1"
              style={{
                color: 'var(--pc-text-primary)',
                fontFamily: 'var(--pc-font-ui)',
              }}
            >
              {entry.name}
            </span>
            {entry.size !== undefined && (
              <span
                className="text-xs shrink-0"
                style={{ color: 'var(--pc-text-muted)', fontFamily: 'var(--pc-font-mono)' }}
              >
                {formatSize(entry.size)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
