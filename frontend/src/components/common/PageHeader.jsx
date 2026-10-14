import React from 'react';
import Breadcrumbs from './Breadcrumbs';

export const PageHeader = ({
  title,
  description,
  badge,
  breadcrumbs = [],
  actions,
  className = '',
}) => {
  return (
    <div className={`mb-8 pb-6 border-b border-slate-200/80 dark:border-slate-800/80 ${className}`}>
      {breadcrumbs.length > 0 && (
        <div className="mb-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
