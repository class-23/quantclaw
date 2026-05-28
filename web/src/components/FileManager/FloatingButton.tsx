import type { MouseEventHandler } from 'react';

interface Props {
  isOpen: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
}

export default function FloatingButton({ isOpen, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? '关闭文件管理' : '打开文件管理'}
      aria-expanded={isOpen}
      className="fixed flex items-center justify-center border-0 cursor-pointer transition-all duration-300"
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'var(--pc-accent)',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        boxShadow: isOpen
          ? '0 8px 24px rgba(34,211,238,0.3)'
          : '0 4px 12px rgba(34,211,238,0.15)',
        transform: isOpen ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(34,211,238,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = isOpen ? 'scale(1.05)' : 'scale(1)';
        e.currentTarget.style.boxShadow = isOpen
          ? '0 8px 24px rgba(34,211,238,0.3)'
          : '0 4px 12px rgba(34,211,238,0.15)';
      }}
    >
      <span
        style={{
          color: '#ffffff',
          fontSize: '22px',
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: 'var(--pc-font-ui)',
        }}
      >
        Q
      </span>
    </button>
  );
}
