import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  as: Component = 'button',
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
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const variants = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm hover:shadow-burgundy focus:ring-brand-400 border border-transparent',
    gradient: 'gradient-brand text-white shadow-sm hover:shadow-burgundy focus:ring-brand-400 border border-transparent hover:brightness-105',
    burgundy: 'bg-burgundy-600 hover:bg-burgundy-700 text-white shadow-sm hover:shadow-burgundy focus:ring-burgundy-400 border border-transparent',
    champagne: 'bg-champagne-500 hover:bg-champagne-600 text-stone-900 font-bold shadow-sm hover:shadow-champagne focus:ring-champagne-400 border border-transparent',
    peach: 'bg-champagne-500 hover:bg-champagne-600 text-stone-900 font-bold shadow-sm hover:shadow-champagne focus:ring-champagne-400 border border-transparent',
    blush: 'bg-burgundy-600 hover:bg-burgundy-700 text-white shadow-sm hover:shadow-burgundy focus:ring-burgundy-400 border border-transparent',
    secondary: 'bg-champagne-50/90 hover:bg-champagne-100 text-stone-800 focus:ring-champagne-300 border border-champagne-200/80 dark:bg-warmdark-850 dark:hover:bg-warmdark-800 dark:text-stone-200 dark:border-warmdark-700',
    outline: 'bg-transparent hover:bg-champagne-50/80 text-stone-700 focus:ring-champagne-400 border border-champagne-300 dark:hover:bg-warmdark-850 dark:text-stone-200 dark:border-warmdark-700',
    ghost: 'bg-transparent hover:bg-champagne-50/70 text-stone-600 focus:ring-champagne-300 border border-transparent dark:hover:bg-warmdark-850 dark:text-stone-300',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500 border border-transparent',
    accent: 'bg-champagne-500 hover:bg-champagne-600 text-stone-900 font-bold shadow-sm hover:shadow-champagne focus:ring-champagne-400 border border-transparent',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <Component
      type={Component === 'button' ? type : undefined}
      disabled={Component === 'button' ? (disabled || isLoading) : undefined}
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
    </Component>
  );
};

export default Button;
