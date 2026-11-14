'use client';

// HOJA INFERIOR (bottom sheet) sobre el Dialog de Radix: role="dialog", foco atrapado,
// cierre con Escape y con el botón X, título enlazado por aria-labelledby. Aparece desde abajo
// en 300 ms. Se usa para formularios, confirmaciones y detalles.

import type { ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { Btn } from './ui';

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Zona fija al pie (fuera del scroll): para el botón principal, que nunca debe quedar tapado. */
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="app-shell fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--text-primary)_45%,transparent)] duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:duration-150" />
        <Dialog.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          className="app-shell fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-[var(--surface)] shadow-[var(--shadow-2)] outline-none duration-200 ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom motion-reduce:slide-in-from-bottom-0 motion-reduce:slide-out-to-bottom-0"
        >
          <div className="flex items-start justify-between gap-4 px-4 pt-4">
            <div className="min-w-0 pt-2">
              <Dialog.Title className="t-title text-balance text-[var(--text-primary)]">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="t-body mt-1 text-[var(--text-secondary)]">{description}</Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Cerrar"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] [touch-action:manipulation]"
            >
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div
            className={`overflow-y-auto overscroll-contain px-4 pt-4 ${
              footer ? 'pb-4' : 'pb-[max(24px,env(safe-area-inset-bottom))]'
            }`}
          >
            {children}
          </div>
          {footer && (
            <div className="border-t border-[color-mix(in_oklab,var(--text-tertiary)_16%,transparent)] px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Confirmación propia para acciones que no se pueden deshacer (nunca window.confirm). */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  text,
  confirmLabel,
  cancelLabel = 'Mejor no',
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={text}>
      <div className="flex flex-col gap-3">
        <Btn
          variant="danger"
          size="lg"
          full
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </Btn>
        <Btn variant="ghost" size="lg" full onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Btn>
      </div>
    </Sheet>
  );
}
