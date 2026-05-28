import { useEffect, useState, type ReactNode } from 'react';

interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  message: string;
}

let nextId = 0;
let addToastFn: ((msg: Omit<ToastMessage, 'id'>) => void) | null = null;

export function showToast(type: 'success' | 'error', message: string) {
  addToastFn?.({ type, message });
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToastFn = (msg) => {
      const toast: ToastMessage = { ...msg, id: nextId++ };
      setToasts((prev) => [...prev, toast]);
      const duration = msg.type === 'success' ? 3000 : 5000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, duration);
    };
    return () => {
      addToastFn = null;
    };
  }, []);

  return (
    <>
      {toasts.map((toast, i) => (
        <Toast key={toast.id} index={i}>
          {toast.message}
        </Toast>
      ))}
    </>
  );
}

function Toast({ children, index }: { children: ReactNode; index: number }) {
  return (
    <div
      className="animate-slide-in-up text-sm px-4 py-3 rounded-xl border"
      style={{
        position: 'absolute',
        top: `${8 + index * 52}px`,
        left: '16px',
        right: '16px',
        zIndex: 10,
        background: 'var(--pc-bg-surface)',
        borderColor: 'var(--pc-border)',
        color: 'var(--pc-text-primary)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      {children}
    </div>
  );
}
