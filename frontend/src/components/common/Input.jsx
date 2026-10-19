import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const Input = forwardRef(({
  label,
  helperText,
  error,
  icon: Icon,
  type = 'text',
  className = '',
  id,
  required = false,
  disabled = false,
  showPasswordToggle = true,
  rightElement,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const isPassword = type === 'password';
  const effectiveType = isPassword && showPassword ? 'text' : type;
  const canTogglePassword = isPassword && showPasswordToggle;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-2xs">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          disabled={disabled}
          className={`w-full rounded-lg text-sm bg-white dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${
            Icon ? 'pl-9' : 'pl-3.5'
          } ${
            canTogglePassword || rightElement ? 'pr-10' : 'pr-3.5'
          } py-2 ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-300 dark:border-slate-700 focus:border-brand-500'
          } ${className}`}
          {...props}
        />

        {canTogglePassword && !rightElement && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}

        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-500 font-medium leading-none mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-none mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
