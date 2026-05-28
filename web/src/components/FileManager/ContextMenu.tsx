import { useEffect, type MouseEvent } from 'react';

interface ContextMenuItem {
  label: string;
  danger?: boolean;
  action: () => void;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  useEffect(() => {
    const close = () => onClose();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', keydown);
    };
  }, [onClose]);

  const handleClick = (e: MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    onClose();
  };

  return (
    <div
      className="fixed z-[9997] animate-fade-in-scale rounded-xl border py-1 shadow-2xl"
      style={{
        left: x,
        top: y,
        background: 'var(--pc-bg-elevated)',
        borderColor: 'var(--pc-border)',
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={(e) => handleClick(e, item.action)}
          className="block w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer border-0"
          style={{
            color: item.danger ? '#f87171' : 'var(--pc-text-primary)',
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--pc-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
