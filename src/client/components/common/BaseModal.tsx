import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badgeText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnEsc?: boolean;
  closeOnOverlayClick?: boolean;
}

const sizeClasses: Record<NonNullable<BaseModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  badgeText,
  size = 'lg',
  children,
  footer,
  closeOnEsc = true,
  closeOnOverlayClick = true,
}) => {
  const { theme } = useTheme();
  const isCyber = theme === 'cyber';

  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-200 animate-fadeIn"
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${sizeClasses[size]} rounded-3xl bg-card-theme border border-theme shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado Fijo */}
        <div className="p-5 border-b border-theme flex items-start justify-between gap-3 bg-theme-subtle/50 shrink-0">
          <div className="flex items-start gap-3">
            {icon && (
              <div
                className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                  isCyber
                    ? 'bg-volt/10 text-volt border border-volt/20'
                    : 'bg-sport-orange/10 text-sport-orange border border-sport-orange/20'
                }`}
              >
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-extrabold text-lg sm:text-xl text-main-theme tracking-tight">
                  {title}
                </h3>
                {badgeText && (
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      isCyber
                        ? 'bg-volt/10 text-volt border-volt/30'
                        : 'bg-sport-orange/10 text-sport-orange border-sport-orange/30'
                    }`}
                  >
                    {badgeText}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-muted-theme mt-0.5 font-medium leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-2 rounded-xl text-muted-theme hover:text-main-theme hover:bg-theme-subtle transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con Scroll Interno Aislado */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 no-scrollbar flex-1">
          {children}
        </div>

        {/* Pie de Modal Fijo (si se proporciona) */}
        {footer && (
          <div className="p-4 border-t border-theme bg-theme-subtle/40 flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
