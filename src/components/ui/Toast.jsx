import React, { useEffect, useState } from 'react';
import { Check, X as XIcon, AlertTriangle, Info } from 'lucide-react';

const config = {
  success: {
    icon: <Check className="w-8 h-8 text-white animate-check-pop" strokeWidth={4} />,
    glowClass: 'shadow-[0_4px_30px_rgba(74,222,128,0.5)]',
    bgClass: 'bg-[#4ade80]',
    title: 'Success'
  },
  error: {
    icon: <XIcon className="w-8 h-8 text-white animate-check-pop" strokeWidth={4} />,
    glowClass: 'shadow-[0_4px_30px_rgba(248,113,113,0.5)]',
    bgClass: 'bg-[#f87171]',
    title: 'Error'
  },
  warning: {
    icon: <AlertTriangle className="w-8 h-8 text-white animate-check-pop" strokeWidth={4} />,
    glowClass: 'shadow-[0_4px_30px_rgba(251,191,36,0.5)]',
    bgClass: 'bg-[#fbbf24]',
    title: 'Warning'
  },
  info: {
    icon: <Info className="w-8 h-8 text-white animate-check-pop" strokeWidth={4} />,
    glowClass: 'shadow-[0_4px_30px_rgba(96,165,250,0.5)]',
    bgClass: 'bg-[#60a5fa]',
    title: 'Notice'
  }
};

export const Toast = ({ id, message, type = 'success', onClose, duration = 3000 }) => {
  const [isClosing, setIsClosing] = useState(false);
  const currentConfig = config[type] || config.success;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, onClose]);

  return (
    <div
      className={`
        flex flex-col items-center justify-center p-8 bg-white
        shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-[24px] pointer-events-auto w-full max-w-[320px]
        transition-all duration-300 transform
        ${isClosing ? 'opacity-0 scale-90' : 'opacity-100 scale-100 animate-toast-pop'}
      `}
    >
      <div 
        className={`flex items-center justify-center w-16 h-16 rounded-full mb-5 animate-circle-pop ${currentConfig.bgClass} ${currentConfig.glowClass}`}
      >
        {currentConfig.icon}
      </div>
      
      <h2 className="text-[22px] font-bold text-surface-900 mb-2">
        {currentConfig.title}
      </h2>
      
      <p className="text-center text-surface-500 text-[15px] font-medium px-2 leading-snug">
        {message}
      </p>
    </div>
  );
};
