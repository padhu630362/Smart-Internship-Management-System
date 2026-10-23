import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  subtitle,
  children,
  maxWidth,
  size = 'md',
  showClose = true,
}) => {
  const sizeMap = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  const resolvedMaxWidth = maxWidth || sizeMap[size] || 'max-w-lg';
  const resolvedDescription = description || subtitle;
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dialogClasses = [
    'relative w-full',
    resolvedMaxWidth,
    'transform flex flex-col max-h-[calc(100dvh-2rem)] rounded-2xl bg-white dark:bg-[#0d1424] text-left shadow-2xl transition-all border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 p-4 sm:p-6 overflow-hidden',
  ].filter(Boolean).join(' ');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Modal Dialog Positioning */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        <div
          role="dialog"
          aria-modal="true"
          className={dialogClasses}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div>
              {Boolean(title) && (
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h3>
              )}
              {Boolean(resolvedDescription) && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {resolvedDescription}
                </p>
              )}
            </div>

            {Boolean(showClose) && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="mt-4 overflow-y-auto pr-1 -mr-1 flex-1 min-h-0">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
