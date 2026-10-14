import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  KeyRound,
  Briefcase,
  FileSpreadsheet,
  Bell,
  BarChart3,
  Database,
  Filter,
  UserCheck,
  ShieldCheck,
  MessageSquare,
  Award,
  Sparkles,
  CheckCheck,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';

export const RoadmapPage = () => {
  const [filter, setFilter] = useState('all');

  const phases = [
    {
      number: 'Phase 1',
      title: 'Project Foundation & Design System',
      status: 'healthy',
      statusLabel: 'Completed & Verified',
      icon: Database,
      category: 'completed',
      description: 'Monorepo scaffolding, Scalable Express REST backend, high-availability database connectivity, centralized operational error handling, and complete enterprise design system with light/dark theme toggle.',
      deliverables: [
        'Monorepo directory layout (frontend/, backend/, docs/)',
        'Express server with helmet, CORS, and centralized AppError handler',
        'MongoDB Atlas cloud replica set verified connection',
        'Automated backend health check integration tests',
        'Tailwind CSS design system with light/dark theme persistence',
        'Reusable enterprise UI library (Navbar, Sidebar, Card, Table, Modal, Button, StatusBadge)',
      ],
    },
    {
      number: 'Phase 2',
      title: 'Authentication & Multi-Role Authorization (RBAC)',
      status: 'healthy',
      statusLabel: 'Completed & Verified',
      icon: KeyRound,
      category: 'completed',
      description: 'Registration, credential hashing with bcrypt, JWT token generation & verification, role discrimination across Student, Company, Mentor, Coordinator, and Admin.',
      deliverables: [
        'User schema with role-specific profile subdocuments',
        'Password hashing with bcryptjs (salt rounds = 12)',
        'JWT issuance, expiration (7d), and verify middleware',
        'Express route guard middleware (requireRoles)',
        'React AuthContext with token state & session persistence',
        'Responsive Login & Registration UI forms with client validation',
      ],
    },
    {
      number: 'Phase 3',
      title: 'User Profiles & Administrator Management',
      status: 'healthy',
      statusLabel: 'Completed & Verified',
      icon: UserCheck,
      category: 'completed',
      description: 'Role-specific profile schemas, authenticated profile management, secure PDF resume upload with MIME verification, and last-active administrator safety protection.',
      deliverables: [
        'Authenticated user profile retrieval and granular field updates',
        'Secure PDF/DOC resume upload with Multer and MIME validation',
        'Admin user management portal with pagination, role & status edits',
        'Last active administrator safety guard (prohibits sole admin demotion)',
        '13 automated integration tests verifying profile workflows & security',
      ],
    },
    {
      number: 'Phase 4',
      title: 'Internship Opportunities Management',
      status: 'healthy',
      statusLabel: 'Completed & Verified',
      icon: Briefcase,
      category: 'completed',
      description: 'Opportunity schema with status lifecycle (draft, published, closed), multi-criteria filtering, search, and ownership-based authorization controls.',
      deliverables: [
        'Comprehensive Internship schema with requirements, stipend & openings',
        'Public & authenticated opportunity catalog with keyword search',
        'Coordinator and company management console for opportunity creation & edits',
        'Ownership authorization barrier preventing cross-employer tampering',
        '14 automated integration tests verifying lifecycle & access control',
      ],
    },
    {
      number: 'Phase 5',
      title: 'Student Applications & Review Pipeline',
      status: 'healthy',
      statusLabel: 'Completed & Verified',
      icon: FileSpreadsheet,
      category: 'completed',
      description: 'Compound-index deduplicated application submission, student tracking dashboard, employer/coordinator applicant review Kanban, and status transitions.',
      deliverables: [
        'Compound unique index on [student, internship] preventing duplicate applications',
        'Application deadline enforcement and validation gates',
        'Student application dashboard with timeline and status indicators',
        'Coordinator & company candidate review portal with feedback notes',
        '12 automated integration tests verifying submission & review flows',
      ],
    },
    {
      number: 'Phase 6',
      title: 'Internship Allocation, Attendance & Tasks',
      status: 'healthy',
      statusLabel: 'Completed & Verified',
      icon: CheckCheck,
      category: 'completed',
      description: 'Official student allocations with mentor assignment, daily attendance check-in with duplicate guards and audit correction trails, and prioritized task management.',
      deliverables: [
        'Official allocation tracking with mentor link and active conflict guards',
        'Daily student attendance submission with hours & work summary',
        'Mentor attendance review & correction with immutable audit trail',
        'Prioritized milestone tasks with overdue indicators & progress notes',
        '15 automated integration tests verifying allocations, attendance & tasks',
      ],
    },
    {
      number: 'Phase 7',
      title: 'Real-Time Event Notifications & Socket.IO',
      status: 'healthy',
      statusLabel: 'Completed & Verified',
      icon: Bell,
      category: 'completed',
      description: 'Persistent MongoDB notification pipeline with authenticated Socket.IO rooms, personal event delivery, unread counters, and navigation routing.',
      deliverables: [
        'Socket.IO server integration with JWT handshake authentication',
        'Personal notification rooms (user:<userId>) ensuring zero message leakage',
        'Interactive notification bell with live counter and mark-all-as-read',
        'Event triggers for opportunity publication, status changes, tasks & attendance',
        '10 automated integration tests verifying socket auth & delivery',
      ],
    },
    {
      number: 'Phase 8',
      title: 'Secure Real-Time 1-to-1 & Group Chat',
      status: 'healthy',
      statusLabel: 'Completed & Verified',
      icon: MessageSquare,
      category: 'completed',
      description: 'Direct messaging and group chat for authorized users with persistent MongoDB history, typing indicators, read receipts, and strict membership guards.',
      deliverables: [
        '1-to-1 direct messaging and multi-member group conversation support',
        'Conversation room isolation with strict membership authorization guards',
        'Message payload sanitization, length validation, and rate limiting',
        'Real-time delivery over Socket.IO with reconnect synchronization',
        '15 automated integration tests verifying chat security and messaging',
      ],
    },
    {
      number: 'Phase 9',
      title: 'Institutional Analytics, Evaluations & Reports',
      status: 'healthy',
      statusLabel: 'Completed & Verified',
      icon: BarChart3,
      category: 'completed',
      description: 'Role-scoped analytical dashboards, midterm/final performance appraisals with numerical rubrics, multi-parameter filtered reports, and sanitized CSV exports.',
      deliverables: [
        'Role-specific dashboards with MongoDB aggregation pipelines',
        'Rubric-based midterm and final intern performance appraisals',
        'Multi-filter institutional report queries (type, dates, department, status)',
        'Sanitized CSV export with formula-injection (=, +, -, @) neutralization',
        '12 automated integration tests verifying metrics & reporting',
      ],
    },
    {
      number: 'Phase 10',
      title: 'Security, Reliability Hardening & Audit Logs',
      status: 'healthy',
      statusLabel: 'Completed & Verified',
      icon: ShieldCheck,
      category: 'completed',
      description: 'Defense-in-depth security hardening: NoSQL operator stripping, ReDoS regex escaping, resume IDOR prevention, regulatory audit logging, and rate limiting.',
      deliverables: [
        'Strict token revocation on account deactivation and password reset',
        'NoSQL injection & prototype pollution neutralization middleware',
        'Immutable regulatory audit logging for all critical system mutations',
        'Sliding-window rate limiters with 429 Retry-After headers',
        '15 automated integration tests verifying security controls',
      ],
    },
    {
      number: 'Phase 11',
      title: 'Full System Integration & Regression Testing',
      status: 'healthy',
      statusLabel: 'Completed & Verified',
      icon: CheckCircle2,
      category: 'completed',
      description: 'Comprehensive end-to-end multi-role verification covering all 10 end-to-end workflows and 11 negative/boundary security regressions with 100% pass rate.',
      deliverables: [
        '10 E2E workflow tests (WF-01 to WF-10) validating complete lifecycle',
        '11 negative regression tests (NEG-01 to NEG-11) validating security guards',
        '143/143 passing tests across all 12 test suites (0 failures)',
        'Frontend production build verified with zero bundling errors',
        'docs/TEST_REPORT.md certified with reproducible testing instructions',
      ],
    },
    {
      number: 'Phase 12',
      title: 'Final Product Polish & Deployment Readiness',
      status: 'healthy',
      statusLabel: 'Completed & Verified',
      icon: Sparkles,
      category: 'completed',
      description: 'Visual consistency polish, loading skeletons, error recovery, mobile drawer navigation, production environment documentation, and college demonstration guide.',
      deliverables: [
        'Visual consistency, responsive layouts, and skeleton loading grids',
        'Sidebar & mobile navigation with Escape key keyboard accessibility',
        'Optimized frontend polling and memoized request flows',
        'Production MongoDB connection & environment configuration documentation',
        'docs/DEPLOYMENT_CHECKLIST.md and comprehensive README demo runbook',
      ],
    },
  ];

  const filteredPhases = phases.filter((p) => {
    if (filter === 'all') return true;
    return p.category === filter;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Implementation Roadmap"
        description="Structured 12-phase engineering roadmap for the Smart Internship Management System. All 12 milestones have been successfully completed, tested, and verified."
        breadcrumbs={[{ label: 'Roadmap' }]}
        badge={
          <StatusBadge
            status="healthy"
            label="12 / 12 PHASES VERIFIED"
            size="sm"
          />
        }
        actions={
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700">
            {['all', 'completed'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  filter === key
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        }
      />

      {/* Phased Cards */}
      <div className="space-y-6">
        {filteredPhases.map((phase) => {
          const Icon = phase.icon;
          const isCurrent = phase.status === 'healthy';

          return (
            <Card
              key={phase.number}
              className={`transition-all ${
                isCurrent
                  ? 'border-brand-500/40 ring-1 ring-brand-500/20'
                  : ''
              }`}
            >
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      isCurrent
                        ? 'bg-brand-50 text-brand-600 border-brand-200 dark:bg-brand-950/40 dark:text-brand-400 dark:border-brand-800'
                        : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-850 dark:text-slate-400 dark:border-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                      {phase.number}
                    </span>
                    <CardTitle className="text-xl">{phase.title}</CardTitle>
                  </div>
                </div>

                <StatusBadge status={phase.status} label={phase.statusLabel} />
              </CardHeader>

              <CardContent className="space-y-6">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {phase.description}
                </p>

                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Deliverables & Acceptance Gates:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {phase.deliverables.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800"
                      >
                        {isCurrent ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default RoadmapPage;
