import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const d = dialog.current!;
    d.showModal();
    const fn = (e: Event) => {
      e.preventDefault();
      close.current();
    };
    d.addEventListener('cancel', fn);
    return () => {
      d.removeEventListener('cancel', fn);
      d.close();
    };
  }, []);
  return (
    <dialog ref={dialog} className="modal" aria-labelledby="modal-title">
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Fechar diálogo"
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
