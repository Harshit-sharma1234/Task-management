'use client';

import { useEffect, useRef } from 'react';
import { Portal } from './Portal';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Close on escape
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop with extreme blur and dark tint */}
        <div 
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-all duration-300 animate-in fade-in"
          onClick={onCancel}
        />
        
        {/* Modal Container */}
        <div 
          ref={modalRef}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        >
          {/* Top border accent for destructive actions */}
          {isDestructive && <div className="absolute top-0 inset-x-0 h-1 bg-red-500" />}

          <div className="px-6 pt-6 pb-2">
            <div className="flex items-start gap-4">
              {isDestructive ? (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-indigo-600" />
                </div>
              )}
              
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed font-medium">
                  {message}
                </p>
              </div>

              <button 
                onClick={onCancel}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all shrink-0"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 bg-slate-50/50 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
              }}
              className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-lg active:scale-95 ${
                isDestructive 
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-100' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
