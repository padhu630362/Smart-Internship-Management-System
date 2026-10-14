import React from 'react';
import { GitBranch, Shield, Terminal, Cpu } from 'lucide-react';
import SimsLogo from './common/SimsLogo';

export const Footer = () => {
  return (
    <footer className="border-t border-slate-200/90 dark:border-slate-800/80 bg-white/50 dark:bg-[#070c18]/50 py-8 text-slate-500 dark:text-slate-400 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
          <div className="md:col-span-2 space-y-3">
            <SimsLogo size="sm" />
            <p className="text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Smart Internship Management System (SIMS) standardizes and automates institutional internship
              workflows across students, host employers, faculty mentors, and academic administrators.
            </p>
          </div>

          <div>
            <h4 className="text-[11px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-2.5">
              Verified Stack
            </h4>
            <ul className="space-y-1.5 font-medium">
              <li className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Cpu className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" /> React 18 + Vite 6 + Tailwind 3
              </li>
              <li className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Terminal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Express API + Node.js (Port 5001)
              </li>
              <li className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Mongoose ODM + MongoDB Atlas
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-2.5">
              Git Branch & Status
            </h4>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1 font-mono">
              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold">
                <GitBranch className="w-3.5 h-3.5 text-brand-500" />
                <span>feature/project-foundation</span>
              </div>
              <div className="text-[10px] text-slate-500">Phase 1: Professional Design System</div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/80 dark:border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <p>© {new Date().getFullYear()} Smart Internship Management System. Enterprise College Project.</p>
          <p className="font-mono text-slate-400 dark:text-slate-500">
            Node v24 • React v18 • Tailwind v3 • Vite v6
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
