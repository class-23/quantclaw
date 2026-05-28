import { useState, useCallback, useRef, useEffect, type MouseEvent, type DragEvent } from 'react';
import { X, Upload, FolderPlus, FilePlus } from 'lucide-react';
import type { BrowseEntry } from '../../lib/api';
import { mkdirShared, rmdirShared } from '../../lib/api';
import { showToast, ToastContainer } from './Toast';
import FileList from './FileList';
import ContextMenu from './ContextMenu';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  onClose: () => void;
}

export default function FileManagerPanel({ onClose }: Props) {
  const [currentPath, setCurrentPath] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    entry: BrowseEntry;
  } | null>(null);

  // New folder/file dialog
  const [showNewDialog, setShowNewDialog] = useState<'folder' | 'file' | null>(null);
  const [newName, setNewName] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<BrowseEntry | null>(null);

  // Rename inline
  const [renameTarget, setRenameTarget] = useState<BrowseEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // Preview
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const refresh = () => setRefreshKey((k) => k + 1);

  const getFullPath = (name: string) =>
    currentPath ? `${currentPath}/${name}` : name;

  const handleContextMenu = (e: MouseEvent, entry: BrowseEntry) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, entry });
  };

  const handleNewFolder = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      const fullPath = getFullPath(trimmed);
      await mkdirShared(fullPath);
      showToast('success', `文件夹 "${trimmed}" 创建成功`);
      setShowNewDialog(null);
      setNewName('');
      refresh();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '创建失败');
    }
  };

  const handleNewFile = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      const fullPath = getFullPath(trimmed);
      const token = localStorage.getItem('zeroclaw-token');
      const response = await fetch(`/api/browse/mkfile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ path: fullPath }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
      showToast('success', `文件 "${trimmed}" 创建成功`);
      setShowNewDialog(null);
      setNewName('');
      refresh();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '创建失败');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const fullPath = getFullPath(deleteTarget.name);
      await rmdirShared(fullPath);
      showToast('success', `"${deleteTarget.name}" 已删除`);
      setDeleteTarget(null);
      refresh();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '删除失败');
      setDeleteTarget(null);
    }
  };

  const startRename = (entry: BrowseEntry) => {
    setRenameTarget(entry);
    setRenameValue(entry.name);
    setTimeout(() => renameInputRef.current?.focus(), 50);
    setTimeout(() => renameInputRef.current?.select(), 100);
  };

  const confirmRename = async () => {
    if (!renameTarget || !renameValue.trim() || renameValue.trim() === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    try {
      const from = getFullPath(renameTarget.name);
      const to = getFullPath(renameValue.trim());
      const token = localStorage.getItem('zeroclaw-token');
      const response = await fetch('/api/browse/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ from, to }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
      showToast('success', '重命名成功');
      setRenameTarget(null);
      refresh();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '重命名失败');
      setRenameTarget(null);
    }
  };

  const handleFileUpload = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      setUploadProgress(0);
      const fileArr = Array.from(files);
      for (let i = 0; i < fileArr.length; i++) {
        const file = fileArr[i];
        try {
          const formData = new FormData();
          formData.append('file', file);
          if (currentPath) formData.append('path', currentPath);
          const token = localStorage.getItem('zeroclaw-token');
          const response = await fetch('/api/browse/upload', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          });
          if (!response.ok) {
            const err = await response.text();
            throw new Error(err);
          }
          setUploadProgress(((i + 1) / fileArr.length) * 100);
        } catch (e) {
          showToast('error', `上传 "${file.name}" 失败: ${e instanceof Error ? e.message : '未知错误'}`);
        }
      }
      showToast('success', '上传完成');
      setUploading(false);
      setUploadProgress(0);
      refresh();
    },
    [currentPath],
  );

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handlePreview = async (name: string) => {
    const fullPath = getFullPath(name);
    setPreviewFile(name);
    setPreviewLoading(true);
    setPreviewContent('');
    try {
      const token = localStorage.getItem('zeroclaw-token');
      const response = await fetch(
        `/api/browse/read?path=${encodeURIComponent(fullPath)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
      const data = await response.json();
      if (data.is_text) {
        setPreviewContent(data.content);
      } else {
        setPreviewContent('[二进制文件，无法预览]');
      }
    } catch (e) {
      setPreviewContent(`读取失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const isTextFile = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const textExts = [
      'txt', 'md', 'json', 'toml', 'yaml', 'yml', 'rs', 'ts', 'tsx', 'js',
      'jsx', 'css', 'html', 'xml', 'py', 'rb', 'go', 'java', 'c', 'cpp',
      'h', 'hpp', 'sh', 'bash', 'log', 'env', 'gitignore', 'lock',
    ];
    return ext ? textExts.includes(ext) : false;
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (renameTarget) {
          setRenameTarget(null);
        } else if (deleteTarget) {
          setDeleteTarget(null);
        } else if (showNewDialog) {
          setShowNewDialog(null);
          setNewName('');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, renameTarget, deleteTarget, showNewDialog]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="文件管理"
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      />

      <div
        className="absolute animate-slide-in-up flex flex-col overflow-hidden rounded-3xl border shadow-2xl"
        style={{
          width: '480px',
          maxWidth: '95vw',
          height: '600px',
          maxHeight: '85vh',
          bottom: '88px',
          right: '24px',
          background: 'var(--pc-bg-base)',
          borderColor: isDragOver ? 'var(--pc-accent)' : 'var(--pc-border)',
        }}
        onClick={(e) => e.stopPropagation()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <ToastContainer />

        {/* Title bar */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
          style={{ borderColor: 'var(--pc-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--pc-text-primary)' }}>
            文件管理
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ color: 'var(--pc-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--pc-text-primary)';
              e.currentTarget.style.background = 'var(--pc-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--pc-text-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div
          className="flex items-center gap-1.5 px-4 py-2 shrink-0"
          style={{ borderBottom: '1px solid var(--pc-separator)' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileUpload(e.target.files);
              }
              e.target.value = '';
            }}
          />
          <button
            className="btn-secondary text-xs px-2.5 py-1.5 inline-flex items-center gap-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={12} />
            上传
          </button>
          <button
            className="btn-secondary text-xs px-2.5 py-1.5 inline-flex items-center gap-1"
            onClick={() => { setShowNewDialog('folder'); setNewName(''); }}
          >
            <FolderPlus size={12} />
            新建文件夹
          </button>
          <button
            className="btn-secondary text-xs px-2.5 py-1.5 inline-flex items-center gap-1"
            onClick={() => { setShowNewDialog('file'); setNewName(''); }}
          >
            <FilePlus size={12} />
            新建文件
          </button>
          {uploading && (
            <div className="flex-1 mx-2">
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--pc-bg-input)' }}
              >
                <div
                  className="h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${uploadProgress}%`,
                    background: 'var(--pc-accent)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* File list */}
        <FileList
          onNavigate={setCurrentPath}
          onFileClick={(name) => {
            if (isTextFile(name)) {
              handlePreview(name);
            } else {
              showToast('error', '二进制文件无法预览');
            }
          }}
          onContextMenu={handleContextMenu}
          refreshKey={refreshKey}
        />

        {/* Preview panel */}
        {previewFile && (
          <div
            className="border-t shrink-0"
            style={{ borderColor: 'var(--pc-border)' }}
          >
            <div
              className="flex items-center justify-between px-4 py-2"
              style={{ borderBottom: '1px solid var(--pc-separator)' }}
            >
              <span
                className="text-xs font-medium truncate"
                style={{ color: 'var(--pc-text-secondary)' }}
              >
                预览: {previewFile}
              </span>
              <button
                onClick={() => { setPreviewFile(null); setPreviewContent(''); }}
                className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--pc-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--pc-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={12} />
              </button>
            </div>
            <div
              className="overflow-auto p-4"
              style={{
                maxHeight: '180px',
                background: 'var(--pc-bg-code)',
                fontFamily: 'var(--pc-font-mono)',
                fontSize: 'var(--pc-font-size-mono)',
                color: 'var(--pc-text-primary)',
              }}
            >
              {previewLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div
                    className="h-4 w-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'var(--pc-border)', borderTopColor: 'var(--pc-accent)' }}
                  />
                </div>
              ) : (
                <pre
                  className="text-xs whitespace-pre-wrap break-all m-0"
                  style={{ fontFamily: 'var(--pc-font-mono)' }}
                >
                  {previewContent}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            { label: '重命名', action: () => startRename(contextMenu.entry) },
            {
              label: '删除',
              danger: true,
              action: () => setDeleteTarget(contextMenu.entry),
            },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Rename inline */}
      {renameTarget && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center"
          onClick={() => setRenameTarget(null)}
        >
          <div
            className="w-full max-w-xs mx-4 rounded-2xl border p-4 shadow-2xl animate-fade-in"
            style={{ background: 'var(--pc-bg-surface)', borderColor: 'var(--pc-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs mb-3" style={{ color: 'var(--pc-text-secondary)' }}>
              重命名 "{renameTarget.name}"
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); confirmRename(); }}
              className="flex gap-2"
            >
              <input
                ref={renameInputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="input-electric flex-1 px-3 py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setRenameTarget(null);
                }}
              />
              <button type="submit" className="btn-electric text-sm px-3 py-2">
                确认
              </button>
            </form>
          </div>
        </div>
      )}

      {/* New folder/file dialog */}
      {showNewDialog && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center"
          onClick={() => { setShowNewDialog(null); setNewName(''); }}
        >
          <div
            className="w-full max-w-xs mx-4 rounded-2xl border p-4 shadow-2xl animate-fade-in"
            style={{ background: 'var(--pc-bg-surface)', borderColor: 'var(--pc-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs mb-3" style={{ color: 'var(--pc-text-secondary)' }}>
              {showNewDialog === 'folder' ? '新建文件夹' : '新建文件'}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                showNewDialog === 'folder' ? handleNewFolder() : handleNewFile();
              }}
              className="flex gap-2"
            >
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="输入名称"
                className="input-electric flex-1 px-3 py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setShowNewDialog(null); setNewName(''); }
                }}
              />
              <button type="submit" className="btn-electric text-sm px-3 py-2">
                确认
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="确认删除"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="确认删除"
          danger
        >
          确定要删除 "{deleteTarget.name}" 吗？此操作不可撤销。
        </ConfirmDialog>
      )}
    </div>
  );
}
