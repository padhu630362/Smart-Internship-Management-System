import React from 'react';

export const Table = ({ children, className = '' }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0d1424] shadow-xs">
      <table className={`w-full text-left text-sm text-slate-700 dark:text-slate-300 border-collapse ${className}`}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader = ({ children, className = '' }) => {
  return (
    <thead className={`bg-slate-50/90 dark:bg-slate-900/60 border-b border-slate-200/90 dark:border-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${className}`}>
      {children}
    </thead>
  );
};

export const TableBody = ({ children, className = '' }) => {
  return (
    <tbody className={`divide-y divide-slate-100 dark:divide-slate-800/60 ${className}`}>
      {children}
    </tbody>
  );
};

export const TableRow = ({ children, className = '', hoverable = true, onClick }) => {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors duration-150 ${
        hoverable ? 'hover:bg-slate-50/70 dark:hover:bg-slate-850/50' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
};

export const TableHead = ({ children, className = '' }) => {
  return (
    <th scope="col" className={`px-4 py-3 sm:px-6 font-semibold whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
};

export const TableCell = ({ children, className = '' }) => {
  return (
    <td className={`px-4 py-3 sm:px-6 whitespace-nowrap text-slate-700 dark:text-slate-200 ${className}`}>
      {children}
    </td>
  );
};

export const TableEmpty = ({ colSpan, message = 'No data available in this view.' }) => {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center text-sm text-slate-400">
        {message}
      </td>
    </tr>
  );
};

Table.Header = TableHeader;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Head = TableHead;
Table.Cell = TableCell;
Table.Empty = TableEmpty;

export default Table;
