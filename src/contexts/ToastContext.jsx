import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '../components/ui/Toast';
import { PageLoader } from '../components/ui/Loading';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');

  const showLoading = useCallback((message = 'Loading...') => {
    setLoadingMessage(message);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) => {
    hideLoading();
    addToast(message, 'success', duration);
  }, [addToast, hideLoading]);

  const error = useCallback((message, duration) => {
    hideLoading();
    addToast(message, 'error', duration);
  }, [addToast, hideLoading]);
  
  const info = useCallback((message, duration) => {
    hideLoading();
    addToast(message, 'info', duration);
  }, [addToast, hideLoading]);
  
  const warning = useCallback((message, duration) => {
    hideLoading();
    addToast(message, 'warning', duration);
  }, [addToast, hideLoading]);

  return (
    <ToastContext.Provider value={{ addToast, success, error, info, warning, showLoading, hideLoading }}>
      {children}
      
      {isLoading && <PageLoader message={loadingMessage} />}

      {toasts.length > 0 && (
        <div className="fixed inset-0 bg-surface-900/20 backdrop-blur-sm z-[9998] transition-opacity duration-300 pointer-events-none" />
      )}
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 pointer-events-none p-4">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
