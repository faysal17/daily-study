"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(
    null,
  );
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setState({ ...opts, open: true });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setState((s) => (s ? { ...s, open: false } : s));
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (state?.open && !d.open) d.showModal();
    else if (!state?.open && d.open) d.close();
  }, [state?.open]);

  const destructive = state?.destructive ?? true;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        className="confirm-dialog"
        onCancel={(e) => {
          e.preventDefault();
          settle(false);
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) settle(false);
        }}
      >
        {state && (
          <div className="confirm-body">
            <h2 className="text-base font-semibold">{state.title}</h2>
            {state.message && (
              <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
                {state.message}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => settle(false)}
                className="btn btn-secondary btn-sm"
              >
                {state.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => settle(true)}
                className={
                  "btn btn-sm " +
                  (destructive ? "btn-danger" : "btn-primary")
                }
              >
                {state.confirmLabel ?? (destructive ? "Delete" : "Confirm")}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}
