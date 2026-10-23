import React from 'react';

export const Card = ({ children, className = '', hoverable = false, ...props }) => {
  const cardClasses = [
    'surface-card',
    hoverable ? 'surface-hover' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }) => {
  const headerClasses = [
    'p-3.5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={headerClasses} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className = '', as: Component = 'h3', ...props }) => {
  const titleClasses = [
    'text-lg font-bold tracking-tight text-slate-900 dark:text-white',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component className={titleClasses} {...props}>
      {children}
    </Component>
  );
};

export const CardDescription = ({ children, className = '', ...props }) => {
  const descClasses = [
    'text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed',
    className,
  ].filter(Boolean).join(' ');

  return (
    <p className={descClasses} {...props}>
      {children}
    </p>
  );
};

export const CardContent = ({ children, className = '', ...props }) => {
  const contentClasses = [
    'p-3.5 sm:p-6',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={contentClasses} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className = '', ...props }) => {
  const footerClasses = [
    'p-3 sm:p-6 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80 rounded-b-xl flex flex-wrap items-center justify-between gap-2',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={footerClasses} {...props}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;
