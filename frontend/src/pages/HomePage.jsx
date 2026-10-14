import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Server,
  Database,
  ShieldCheck,
  RefreshCw,
  Clock,
  Cpu,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
  Lock,
  LogIn,
  Search,
  Filter,
  Eye,
  FileText,
  Activity,
} from 'lucide-react';
import RoleCard from '../components/RoleCard';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/common/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/common/Table';
import Input from '../components/common/Input';
import healthService from '../services/healthService';
import { useAuth } from '../context/AuthContext';

export const HomePage = ({ onOpenLogin }) => {
  const { isAuthenticated, user } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  const fetchHealth = async () => {
    setLoadingHealth(true);
    const result = await healthService.checkHealth();
    setHealthData(result);
    setLastChecked(new Date().toLocaleTimeString());
    setLoadingHealth(false);
  };

  useEffect(() => {
    fetchHealth();
    // Poll every 45s only if page is visible to optimize performance
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchHealth();
      }
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  const roles = [
    {
      role: 'student',
      title: 'Student Portal',
      description: 'Discover curated internship listings, submit trackable applications, upload resumes, log daily attendance, and chat in real-time.',
      features: [
        'Opportunity directory with keyword search & filters',
        'Transparent application tracking & resume management',
        'Daily attendance logging, task progress, and live chat',
      ],
      plannedPhase: 'Fully Operational • All Phases Complete',
    },
    {
      role: 'company',
      title: 'Employer Hub',
      description: 'Publish vetted internship listings, manage candidate pipelines, review applications, and coordinate intern placements.',
      features: [
        'Post and manage internship openings with openings & deadlines',
        'Applicant review pipeline with multi-status transitions',
        'Collaborate with mentors and evaluate candidate progress',
      ],
      plannedPhase: 'Fully Operational • All Phases Complete',
    },
    {
      role: 'mentor',
      title: 'Mentor Workspace',
      description: 'Supervise daily activities, assign structured deliverables, approve attendance logs, and submit rubric-based appraisals.',
      features: [
        'Milestone task creation, priorities, and progress reviews',
        'Daily attendance verification with audit trail notes',
        'Rubric-based performance appraisals & 1-on-1 chat',
      ],
      plannedPhase: 'Fully Operational • All Phases Complete',
    },
    {
      role: 'admin',
      title: 'Admin Console',
      description: 'Institutional administration overseeing role verifications, credit compliance, system-wide analytics, and audit logging.',
      features: [
        'Full user management with RBAC & last-admin protection',
        'Institutional analytics dashboards & sanitized CSV exports',
        'Regulatory audit logging & security boundary enforcement',
      ],
      plannedPhase: 'Fully Operational • All Phases Complete',
    },
  ];

  // Verified design system sample table rows (Workflow representation)
  const workflowPreviewRows = [
    {
      role: 'Full-Stack Developer Intern',
      company: 'TechCorp Labs',
      department: 'Engineering',
      stipend: '₹25,000 / mo',
      status: 'active',
      statusLabel: 'Published',
      applicants: 18,
    },
    {
      role: 'Cloud DevOps Associate',
      company: 'SkyNet Systems',
      department: 'Infrastructure',
      stipend: '₹30,000 / mo',
      status: 'info',
      statusLabel: 'Interviewing',
      applicants: 12,
    },
    {
      role: 'Product Management Intern',
      company: 'InnoVenture AI',
      department: 'Product',
      stipend: '₹20,000 / mo',
      status: 'warning',
      statusLabel: 'Under Review',
      applicants: 34,
    },
    {
      role: 'Data Science Trainee',
      company: 'QuantIQ Analytics',
      department: 'Analytics',
      stipend: '₹28,000 / mo',
      status: 'active',
      statusLabel: 'Published',
      applicants: 22,
    },
  ].filter(
    (item) =>
      item.role.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.company.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.department.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const isHealthy = healthData?.data?.status === 'healthy';
  const isDbConnected = healthData?.data?.database?.connected;

  return (
    <div className="space-y-12">
      {/* Hero Section with Enterprise Polish */}
      <section className="relative overflow-hidden rounded-3xl surface-card border border-slate-200/90 dark:border-slate-800 p-8 sm:p-12 lg:p-14 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-[#0d1424] dark:via-[#090e1c] dark:to-[#0d1424]">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-brand-500/10 dark:bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-80 h-80 bg-accent-500/10 dark:bg-accent-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200 dark:border-brand-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Phase 1 Design System Active • Connected to MongoDB Atlas</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Institutional Internship Governance & Workflow Platform
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            A cohesive full-stack enterprise ecosystem connecting students, host companies, faculty
            mentors, and academic coordinators. Built with React 18, Tailwind CSS, Express, and MongoDB Atlas.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button
                  variant="primary"
                  size="lg"
                  icon={ArrowRight}
                  iconPosition="right"
                  className="font-semibold shadow-md"
                >
                  Access My {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''} Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button
                  variant="primary"
                  size="lg"
                  icon={LogIn}
                  className="font-semibold shadow-md"
                >
                  Sign In to SIMS
                </Button>
              </Link>
            )}
            <Link to="/roadmap">
              <Button variant="secondary" size="lg" icon={ArrowRight} iconPosition="right">
                View 6-Phase Roadmap
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Live Backend & Database Diagnostics Card */}
      <section id="diagnostics">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                  <Server className="w-5 h-5" />
                </div>
                <CardTitle>System Gateway & Cluster Diagnostics</CardTitle>
              </div>
              <CardDescription>
                Live diagnostic telemetry communicating directly with <code className="font-mono text-brand-600 dark:text-brand-400">/api/health</code> (Port 5001)
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              {lastChecked && (
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  Synced: {lastChecked}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                isLoading={loadingHealth}
                onClick={fetchHealth}
              >
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* API Gateway Status */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200/90 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">API Gateway</span>
                  <StatusBadge
                    status={isHealthy ? 'healthy' : 'warning'}
                    label={isHealthy ? 'Operational' : 'Checking'}
                  />
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {isHealthy ? 'HTTP 200 OK' : 'Pending...'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Port: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">5001</span> • Env: <span className="font-mono">{healthData?.data?.environment || 'dev'}</span>
                </div>
              </div>

              {/* Database State */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200/90 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">MongoDB Atlas</span>
                  <StatusBadge
                    status={isDbConnected ? 'healthy' : 'warning'}
                    label={isDbConnected ? 'Connected' : 'Degraded'}
                  />
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {isDbConnected ? 'Cloud Replica Set' : 'Standby'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Mongoose 8.9.x • Host: <span className="font-mono truncate">{healthData?.data?.database?.host ? 'Atlas Cluster0' : '127.0.0.1'}</span>
                </div>
              </div>

              {/* Uptime */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200/90 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Process Uptime</span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {healthData?.data?.uptimeSeconds !== undefined ? `${healthData.data.uptimeSeconds}s` : '--'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Graceful signal termination
                </div>
              </div>

              {/* Memory Allocation */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200/90 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Memory (RSS)</span>
                  <Cpu className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {healthData?.data?.memoryUsageMB?.rss ? `${healthData.data.memoryUsageMB.rss} MB` : '--'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Heap: <span className="font-mono">{healthData?.data?.memoryUsageMB?.heapUsed || '--'} MB</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Design System Preview Table (Enterprise Table Component) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Internship Workflow Preview
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Enterprise Table, Input, and StatusBadge components designed for Phase 3 directory
            </p>
          </div>

          <div className="w-full sm:w-72">
            <Input
              icon={Search}
              placeholder="Filter by role, company, department..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <tr>
              <TableHead>Opportunity</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Stipend</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Applicants</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {workflowPreviewRows.length > 0 ? (
              workflowPreviewRows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-semibold text-slate-900 dark:text-white">
                    {row.role}
                  </TableCell>
                  <TableCell>{row.company}</TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {row.department}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.stipend}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} label={row.statusLabel} size="sm" />
                  </TableCell>
                  <TableCell className="font-medium text-xs">{row.applicants} students</TableCell>
                  <TableCell className="text-right">
                    <Link to="/login">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Lock}
                        className="text-xs"
                      >
                        Apply
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                  No listings found matching "{searchFilter}"
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
      </section>

      {/* Stakeholder Workspaces (RoleCards) */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Tailored Role Workspaces
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Strict role-based interfaces enforcing permission boundaries across every actor.
            Login portals unlock in Phase 2.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((item) => (
            <RoleCard key={item.role} {...item} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
