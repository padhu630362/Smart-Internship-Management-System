import React from 'react';

export const Card = ({ children, className = '', hoverable = false, ...props }) => {
  return (
    <div
      className={`surface-card ${hoverable ? 'surface-hover' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className = '', as: Component = 'h3', ...props }) => {
  return (
    <Component className={`text-lg font-bold tracking-tight text-slate-900 dark:text-white ${className}`} {...props}>
      {children}
    </Component>
  );
};

export const CardDescription = ({ children, className = '', ...props }) => {
  return (
    <p className={`text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-5 sm:p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-4 sm:p-6 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80 rounded-b-xl flex items-center justify-between ${className}`} {...props}>
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
