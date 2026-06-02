'use client';

import { createContext, useContext, useMemo, useState } from 'react';

type Toast = { id: number; message: string; tone?: 'success' | 'error' | 'info' };
const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useMemo(() => (message: string, tone: Toast['tone'] = 'info') => {
    const id = Date.now();
    setToasts(current => [...current, { id, message, tone }]);
    setTimeout(() => setToasts(current => current.filter(t => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map(toast => (
          <div key={toast.id} className="glass rounded-lg px-4 py-3 text-sm shadow-glass">
            <span className={toast.tone === 'error' ? 'text-roseGlow' : toast.tone === 'success' ? 'text-emeraldGlow' : 'text-cyanGlow'}>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
