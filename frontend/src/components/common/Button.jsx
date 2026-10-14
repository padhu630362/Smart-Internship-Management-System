import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  icon: Icon,
  iconPosition = 'left',
  type = 'button',
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm focus:ring-brand-500 border border-transparent dark:bg-brand-600 dark:hover:bg-brand-500',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-400 border border-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700',
    outline: 'bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-400 border border-slate-300 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 focus:ring-slate-300 border border-transparent dark:hover:bg-slate-800 dark:text-slate-300',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500 border border-transparent',
    accent: 'bg-accent-600 hover:bg-accent-700 text-white shadow-sm focus:ring-accent-500 border border-transparent',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" />}
        </>
      )}
    </button>
  );
};

export default Button;
