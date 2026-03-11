import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type: options.type || 'info', // success, error, warning, info
      duration: options.duration ?? 3000,
    };
    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, options) => addToast(message, options), [addToast]);
  toast.success = (message, options) => addToast(message, { ...options, type: 'success' });
  toast.error = (message, options) => addToast(message, { ...options, type: 'error' });
  toast.warning = (message, options) => addToast(message, { ...options, type: 'warning' });
  toast.info = (message, options) => addToast(message, { ...options, type: 'info' });

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container" role="alert" aria-live="polite">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, 300); // animation duration
      return () => clearTimeout(timer);
    }
  }, [isExiting, toast.id, onRemove]);

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div
      className={`toast-item toast-${toast.type} ${isExiting ? 'toast-exit' : ''}`}
      onClick={() => setIsExiting(true)}
    >
      <span className="toast-icon">{icons[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-close"
        onClick={(e) => {
          e.stopPropagation();
          setIsExiting(true);
        }}
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  );
}
