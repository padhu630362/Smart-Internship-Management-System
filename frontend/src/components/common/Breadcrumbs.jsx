import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs = ({ items = [], showHome = true, className = '' }) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {showHome && (
          <li>
            <Link
              to="/"
              className="flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="sr-only">Home</span>
            </Link>
          </li>
        )}

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <React.Fragment key={idx}>
              <li className="text-slate-300 dark:text-slate-600">
                <ChevronRight className="w-3 h-3" />
              </li>
              <li>
                {isLast || !item.to ? (
                  <span className="font-semibold text-slate-800 dark:text-slate-200" aria-current={isLast ? 'page' : undefined}>
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.to}
                    className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
