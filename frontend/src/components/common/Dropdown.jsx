import React, { useState, useRef, useEffect } from 'react';

export const Dropdown = ({
  trigger,
  children,
  align = 'right',
  width = 'w-56',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignments = {
    left: 'left-0 origin-top-left',
    right: 'right-0 origin-top-right',
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`absolute ${alignments[align]} mt-2 ${width} rounded-xl bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-slate-800 shadow-xl z-50 py-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-150`}
        >
          <div onClick={() => setIsOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
};

export const DropdownItem = ({
  children,
  icon: Icon,
  onClick,
  disabled = false,
  danger = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center gap-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        danger
          ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70'
      } ${className}`}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0 text-slate-400" />}
      <span className="truncate">{children}</span>
    </button>
  );
};

export const DropdownDivider = () => {
  return <div className="my-1 border-t border-slate-100 dark:border-slate-800" />;
};

export default { Dropdown, DropdownItem, DropdownDivider };
