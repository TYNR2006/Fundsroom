import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error';
type Toast = { id: number; kind: ToastKind; message: string };
type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const add = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts(current => [...current, { id, kind, message }]);
    window.setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  const value = {
    success: (message: string) => add('success', message),
    error: (message: string) => add('error', message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map(toast => (
          <div className={`toast ${toast.kind}`} key={toast.id} role={toast.kind === 'error' ? 'alert' : 'status'}>
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
