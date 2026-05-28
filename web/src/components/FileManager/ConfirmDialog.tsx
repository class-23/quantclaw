import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
  children: React.ReactNode;
}

export default function ConfirmDialog({
  title,
  onConfirm,
  onCancel,
  confirmLabel = '确认',
  danger = false,
  children,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      />
      <div
        className="relative w-full max-w-sm mx-4 rounded-3xl border shadow-2xl animate-fade-in"
        style={{ background: 'var(--pc-bg-base)', borderColor: 'var(--pc-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--pc-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--pc-text-primary)' }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
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

        <div className="px-6 py-5">
          <div className="text-sm" style={{ color: 'var(--pc-text-secondary)' }}>
            {children}
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: 'var(--pc-border)' }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary text-sm px-4 py-2"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={danger ? 'btn-danger text-sm px-4 py-2' : 'btn-electric text-sm px-4 py-2'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
