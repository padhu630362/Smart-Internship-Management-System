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
  const containerClasses = [
    'mb-5 pb-4 sm:mb-8 sm:pb-6 border-b border-slate-200/80 dark:border-slate-800/80',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {Boolean(breadcrumbs && breadcrumbs.length > 0) && (
        <div className="mb-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h1>
            {Boolean(badge) && <div>{badge}</div>}
          </div>
          {Boolean(description) && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {Boolean(actions) && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
