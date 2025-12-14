import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ConfirmDialog, ToastType } from './Toast';

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ConfirmData {
  id: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showConfirm: (message: string, onConfirm: () => void, confirmText?: string, cancelText?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [confirm, setConfirm] = useState<ConfirmData | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const showConfirm = useCallback(
    (message: string, onConfirm: () => void, confirmText?: string, cancelText?: string) => {
      const id = Math.random().toString(36).substring(7);
      setConfirm({ id, message, onConfirm, confirmText, cancelText });
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirm) {
      confirm.onConfirm();
      setConfirm(null);
    }
  }, [confirm]);

  const handleCancel = useCallback(() => {
    setConfirm(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}
      
      {/* Render Toasts */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      {/* Render Confirm Dialog */}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          confirmText={confirm.confirmText}
          cancelText={confirm.cancelText}
        />
      )}
    </ToastContext.Provider>
  );
}

