import React from 'react';
import { GraduationCap, Building2, UserCheck, ShieldCheck, Lock, ArrowUpRight } from 'lucide-react';
import StatusBadge from './common/StatusBadge';

const iconMap = {
  student: GraduationCap,
  company: Building2,
  mentor: UserCheck,
  admin: ShieldCheck,
};

const badgeThemeMap = {
  student: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60',
  company: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60',
  mentor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
  admin: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
};

export const RoleCard = ({ role, title, description, features, plannedPhase = 'Phase 2' }) => {
  const Icon = iconMap[role] || GraduationCap;
  const badgeStyle = badgeThemeMap[role] || badgeThemeMap.student;

  return (
    <div className="surface-card surface-hover p-6 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl border ${badgeStyle}`}>
            <Icon className="w-6 h-6" />
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Lock className="w-3 h-3 text-slate-400" />
            {plannedPhase}
          </span>
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          {description}
        </p>

        <ul className="space-y-2 mb-6">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start text-xs text-slate-700 dark:text-slate-300 gap-2">
              <span className="text-brand-600 dark:text-brand-400 font-bold">•</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium">Access Gateway</span>
        <span className="italic text-[11px]">Unlocks in Phase 2</span>
      </div>
    </div>
  );
};

export default RoleCard;
