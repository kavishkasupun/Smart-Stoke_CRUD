import React from 'react';
import { AlertTriangle, CheckCircle, Info, Trash2 } from 'lucide-react';

const icons = {
  warning: <AlertTriangle className="w-12 h-12 text-warning-500" />,
  danger: <Trash2 className="w-12 h-12 text-danger-500" />,
  success: <CheckCircle className="w-12 h-12 text-success-500" />,
  info: <Info className="w-12 h-12 text-primary-500" />
};

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface-900/40 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={() => !isLoading && onCancel()}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 overflow-hidden animate-scale-in">
        <div className="flex flex-col items-center text-center">
          <div className={`flex items-center justify-center w-20 h-20 rounded-full mb-4 bg-${type === 'danger' ? 'danger' : type}-50`}>
            {icons[type]}
          </div>
          
          <h2 className="text-xl font-bold text-surface-900 mb-2">{title}</h2>
          <p className="text-surface-500 mb-8">{message}</p>
          
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg font-medium text-surface-700 bg-surface-100 hover:bg-surface-200 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50
                ${type === 'danger' ? 'bg-danger-600 hover:bg-danger-700' : 'bg-primary-600 hover:bg-primary-700'}
              `}
            >
              {isLoading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
