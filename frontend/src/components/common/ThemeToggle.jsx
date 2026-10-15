import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Sparkles, Check, ChevronDown } from 'lucide-react';
import { useTheme, THEMES } from '../../context/ThemeContext';

export const ThemeToggle = ({ className = '' }) => {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeOptions = [
    {
      id: THEMES.BURGUNDY,
      name: 'Royal Burgundy',
      subtitle: 'Velvet Wine & Gold',
      swatch: 'bg-gradient-to-r from-[#4d1a27] to-[#be934c]',
      icon: (
        <span className="w-4 h-4 rounded-full bg-[#742236] border border-[#dfc798] flex items-center justify-center text-[10px]">
          🍷
        </span>
      ),
    },
    {
      id: THEMES.SAPPHIRE,
      name: 'Midnight Sapphire',
      subtitle: 'Executive Navy & Cyan',
      swatch: 'bg-gradient-to-r from-[#0f274a] to-[#38bdf8]',
      icon: (
        <span className="w-4 h-4 rounded-full bg-[#1e3a8a] border border-[#38bdf8] flex items-center justify-center text-[10px]">
          💎
        </span>
      ),
    },
    {
      id: THEMES.LIGHT,
      name: 'Champagne Ivory',
      subtitle: 'Clean Editorial Light',
      swatch: 'bg-gradient-to-r from-[#fcfaf4] to-[#ede0c2]',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
    },
  ];

  const currentOption = themeOptions.find((t) => t.id === theme) || themeOptions[0];

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Theme Trigger Button */}
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1.5 p-2 rounded-xl border border-champagne-300/80 dark:border-stone-700 bg-white/90 dark:bg-warmdark-850 hover:border-burgundy-600 dark:hover:border-champagne-400 hover:bg-champagne-50/80 dark:hover:bg-warmdark-800 transition-all duration-200 shadow-2xs group focus:outline-none select-none"
        aria-label={`Current theme: ${currentOption.name}. Click to change theme`}
        title={`Current theme: ${currentOption.name}. Click to change theme`}
      >
        <div className="flex items-center justify-center">
          {currentOption.icon}
        </div>
        <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-transform duration-200" />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-champagne-300 dark:border-burgundy-900/80 bg-white/98 dark:bg-[#150d11]/98 backdrop-blur-xl shadow-xl shadow-burgundy-950/20 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-champagne-400 border-b border-champagne-200/60 dark:border-warmdark-800">
            Select Platform Theme
          </div>

          {themeOptions.map((opt) => {
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setTheme(opt.id);
                  setDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all text-xs font-semibold ${
                  isSelected
                    ? 'bg-champagne-100/90 dark:bg-burgundy-950/80 text-burgundy-950 dark:text-champagne-200 border border-champagne-300 dark:border-burgundy-800 shadow-xs'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-champagne-50/80 dark:hover:bg-warmdark-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-lg ${opt.swatch} border border-black/10 dark:border-white/10 flex items-center justify-center shrink-0 shadow-2xs`}>
                    {opt.icon}
                  </div>
                  <div>
                    <div className="font-bold">{opt.name}</div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 font-normal">
                      {opt.subtitle}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-burgundy-700 dark:text-champagne-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
