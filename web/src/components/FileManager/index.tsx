import { useState } from 'react';
import FloatingButton from './FloatingButton';
import FileManagerPanel from './FileManagerPanel';

export default function FileManager() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <FloatingButton isOpen={isOpen} onClick={() => setIsOpen((v) => !v)} />
      {isOpen && <FileManagerPanel onClose={() => setIsOpen(false)} />}
    </>
  );
}
