import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  extraContent?: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Excluir',
  cancelText = 'Cancelar',
  variant = 'danger',
  extraContent,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-100 text-rose-600',
          btnConfirm: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 text-amber-600',
          btnConfirm: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-blue-100 text-blue-600',
          btnConfirm: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${styles.iconBg}`}>
            {variant === 'danger' ? (
              <Trash2 className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1 pr-4">
            <h3 className="text-base font-bold text-slate-900">
              {title}
            </h3>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {extraContent && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            {extraContent}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.btnConfirm}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
