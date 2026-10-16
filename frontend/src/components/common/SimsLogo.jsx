import React from 'react';

/**
 * Branded SIMS Logo:
 * Visual metaphor combining Academic Progression (Cap) and Industry Workflow (Brief/Network Node)
 */
export const SimsLogo = ({ size = 'md', showText = true, className = '', inverted = false }) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-base', subtext: 'text-[9px]' },
    md: { icon: 'w-9 h-9', text: 'text-lg', subtext: 'text-[10px]' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl', subtext: 'text-xs' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Geometric Workflow Mark */}
      <div className={`relative ${currentSize.icon} rounded-xl bg-gradient-to-br from-burgundy-700 via-burgundy-800 to-burgundy-950 flex items-center justify-center shadow-md shadow-black/20 shrink-0 border border-white/20`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5/6 h-5/6 text-white"
        >
          {/* Graduation Cap Peak & Diamond Base */}
          <path
            d="M12 3L2 8L12 13L22 8L12 3Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Workflow Node Connector */}
          <path
            d="M6 10.5V16C6 17.6569 8.68629 19 12 19C15.3137 19 18 17.6569 18 16V10.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right Stage Node (Industry Milestone in radiant Champagne Gold) */}
          <circle cx="20" cy="14" r="1.5" fill="#dfc798" />
          <path
            d="M20 9.5V13"
            stroke="#dfc798"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showText && (
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight ${inverted ? 'text-white' : 'text-stone-900 dark:text-white'} ${currentSize.text}`}>
              Intern<span className={inverted ? 'text-champagne-300' : 'text-burgundy-700 dark:text-champagne-400'}>Hub</span>
            </span>
          </div>
          <p className={`${inverted ? 'text-stone-300' : 'text-stone-500 dark:text-stone-400'} font-medium ${currentSize.subtext}`}>
            Internship Platform
          </p>
        </div>
      )}
    </div>
  );
};

export const InternHubLogo = SimsLogo;

export default SimsLogo;
