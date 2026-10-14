import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  LogIn,
  UserPlus,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  Building2,
  Users,
  Brain,
  CalendarCheck,
  BellRing,
  Award,
  MessageSquare,
  Search,
  CheckCircle2,
  Server,
  Activity,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileCheck2,
  Clock,
  Layers,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import Button from '../components/common/Button';
import StatusBadge from '../components/common/StatusBadge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import healthService from '../services/healthService';
import internshipService from '../services/internshipService';
import { useAuth } from '../context/AuthContext';

export const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [healthData, setHealthData] = useState(null);
  const [dbHealthData, setDbHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [recentInternships, setRecentInternships] = useState([]);
  const [loadingInternships, setLoadingInternships] = useState(true);
  const [quickCertCode, setQuickCertCode] = useState('');

  const fetchDiagnostics = async () => {
    setLoadingHealth(true);
    try {
      const [health, db] = await Promise.all([
        healthService.checkHealth(),
        healthService.checkDatabaseHealth(),
      ]);
      setHealthData(health);
      setDbHealthData(db);
    } catch {
      // Degraded fallback
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchLiveInternships = async () => {
    setLoadingInternships(true);
    try {
      const res = await internshipService.getPublicInternships({ limit: 4, page: 1 });
      if (res?.data?.internships) {
        setRecentInternships(res.data.internships);
      }
    } catch {
      // Silence error if server is cold
    } finally {
      setLoadingInternships(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    fetchLiveInternships();
  }, []);

  const isHealthy = healthData?.data?.status === 'healthy';
  const isDbConnected = dbHealthData?.data?.status === 'connected' || healthData?.data?.database?.connected;

  const coreFeatures = [
    {
      icon: Brain,
      title: 'AI Resume Matcher & Skill Radar',
      description: 'Automated candidate screening powered by Google Gemini 1.5. Analyzes student CVs against job criteria with match scoring and keyword gap detection.',
      badge: 'Gemini AI',
      color: 'burgundy',
    },
    {
      icon: BellRing,
      title: 'Live Job Alerts & LinkedIn Feeds',
      description: 'Continuous background aggregation of active tech internships with duplicate prevention, real-time push notifications, and verified LinkedIn search links.',
      badge: 'Real-Time Sync',
      color: 'champagne',
    },
    {
      icon: CalendarCheck,
      title: 'Daily Attendance & Work Logging',
      description: 'Structured daily check-in logs, work summary timestamps, automated percentage analytics, and multi-tier mentor approval workflows.',
      badge: 'Audit Verified',
      color: 'burgundy',
    },
    {
      icon: Award,
      title: 'Digital Verifiable Certificates',
      description: 'Cryptographically secured completion certificates with QR verification codes, dynamic PDF generation, and public verification portal.',
      badge: 'Instant Verify',
      color: 'champagne',
    },
    {
      icon: MessageSquare,
      title: 'Real-Time Collaboration & Chat',
      description: 'Instant WebSocket communication channels connecting interns with industry mentors and company coordinators with unread counters.',
      badge: 'Socket.IO',
      color: 'burgundy',
    },
    {
      icon: ShieldCheck,
      title: 'Institutional Governance & RBAC',
      description: 'Strict role-based access control protecting Students, Employers, Faculty Mentors, and Administrators with comprehensive audit logging.',
      badge: 'Enterprise RBAC',
      color: 'champagne',
    },
  ];

  const stakeholderRoles = [
    {
      role: 'student',
      title: 'Student & Intern Portal',
      icon: GraduationCap,
      description: 'Browse verified opportunities, upload PDF resumes for AI feedback, log daily attendance, track application stages, and earn completion certificates.',
      actionText: 'Join as Student',
      path: '/register?role=student',
      highlights: ['Smart Application Tracking', 'AI Resume Fit Scoring', 'Daily Attendance Logs'],
    },
    {
      role: 'company',
      title: 'Host Employer Hub',
      icon: Building2,
      description: 'Post and manage internship openings, review candidate pipelines with AI insights, schedule interviews, and oversee allocated intern deliverables.',
      actionText: 'Register Company',
      path: '/register?role=company',
      highlights: ['Candidate Pipeline Kanban', 'Automated AI Applicant Scoring', 'Attendance & Deliverable Sign-Off'],
    },
    {
      role: 'mentor',
      title: 'Faculty Mentor Workspace',
      icon: Users,
      description: 'Supervise assigned students across host organizations, review daily work accomplishment logs, provide rubric evaluations, and guide progress.',
      actionText: 'Mentor Sign In',
      path: '/login',
      highlights: ['Attendance Verification', 'Structured Rubric Appraisals', 'Direct Real-Time Chat'],
    },
    {
      role: 'admin',
      title: 'Institutional Admin Console',
      icon: ShieldCheck,
      description: 'System-wide governance, student-to-company allocation control, regulatory accreditation reports, sanitized CSV exports, and audit trails.',
      actionText: 'Admin Console',
      path: '/login',
      highlights: ['Global Analytics Dashboards', 'Accreditation CSV Exports', 'Security Audit Trails'],
    },
  ];

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    if (!quickCertCode.trim()) return;
    navigate(`/verify-certificate/${encodeURIComponent(quickCertCode.trim())}`);
  };

  return (
    <div className="space-y-16 py-4 animate-in fade-in duration-300">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl surface-card border border-champagne-300/80 dark:border-burgundy-900/60 p-8 sm:p-12 lg:p-16 shadow-card">
        {/* Subtle Ambient Radial Glows */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-burgundy-500/10 dark:bg-burgundy-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-champagne-400/15 dark:bg-champagne-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-champagne-100/80 dark:bg-burgundy-950/60 border border-champagne-300 dark:border-burgundy-800 text-xs font-semibold text-burgundy-900 dark:text-champagne-200 shadow-soft">
            <Sparkles className="w-3.5 h-3.5 text-champagne-600 dark:text-champagne-400 animate-pulse" />
            <span>Next-Generation Smart Internship Management System</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-stone-900 dark:text-white tracking-tight leading-[1.12]">
            Empowering Careers Through{' '}
            <span className="gradient-brand-text">Intelligent Governance</span>
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
            A unified digital ecosystem connecting <strong>Students</strong>, <strong>Host Companies</strong>,{' '}
            <strong>Faculty Mentors</strong>, and <strong>Academic Coordinators</strong> with AI resume screening,
            daily attendance logging, real-time job notifications, and verifiable digital certificates.
          </p>

          {/* Call to Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3.5">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard">
                  <Button
                    variant="gradient"
                    size="lg"
                    icon={ArrowRight}
                    iconPosition="right"
                    className="font-bold text-sm shadow-burgundy hover:scale-[1.02]"
                  >
                    Go to {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''} Dashboard
                  </Button>
                </Link>
                <Link to="/internships">
                  <Button variant="secondary" size="lg" icon={Briefcase} className="text-sm font-semibold">
                    Browse Opportunities
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/register">
                  <Button
                    variant="gradient"
                    size="lg"
                    icon={UserPlus}
                    iconPosition="left"
                    className="font-bold text-sm shadow-burgundy hover:scale-[1.02]"
                  >
                    Create Free Account
                  </Button>
                </Link>

                <Link to="/login">
                  <Button
                    variant="champagne"
                    size="lg"
                    icon={LogIn}
                    iconPosition="left"
                    className="font-bold text-sm shadow-champagne hover:scale-[1.02]"
                  >
                    Sign In
                  </Button>
                </Link>

                <Link to="/internships">
                  <Button variant="outline" size="lg" icon={Search} className="text-sm font-semibold">
                    Explore Internships
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Quick Metrics Trust Bar */}
          <div className="pt-6 border-t border-champagne-200/90 dark:border-warmdark-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xl sm:text-2xl font-black text-burgundy-700 dark:text-champagne-300">
                4 Roles
              </div>
              <div className="text-[11px] text-stone-500 font-medium">Students, Mentors, Companies, Admins</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-burgundy-700 dark:text-champagne-300">
                100% Dynamic
              </div>
              <div className="text-[11px] text-stone-500 font-medium">MongoDB Persistent Cloud Backend</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-burgundy-700 dark:text-champagne-300">
                Gemini 1.5
              </div>
              <div className="text-[11px] text-stone-500 font-medium">AI Resume Analysis & Skill Radar</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-burgundy-700 dark:text-champagne-300">
                Real-Time
              </div>
              <div className="text-[11px] text-stone-500 font-medium">Job Alerts & Socket.IO Chat</div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-burgundy-50 dark:bg-burgundy-950/50 text-burgundy-700 dark:text-burgundy-300 text-xs font-semibold border border-burgundy-200 dark:border-burgundy-900/60">
            <Sparkles className="w-3.5 h-3.5 text-burgundy-600 dark:text-champagne-400" />
            <span>Platform Capabilities</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight">
            Designed for Complete Internship Lifecycles
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            From opportunity discovery and AI CV evaluation to attendance logging, task progress, and certified graduation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="surface-card p-6 rounded-2xl border border-champagne-200/90 dark:border-warmdark-700 shadow-soft hover:shadow-card hover:border-champagne-400 transition-all duration-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-burgundy-50 dark:bg-burgundy-950/60 text-burgundy-700 dark:text-champagne-300 border border-burgundy-200 dark:border-burgundy-800/60">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-champagne-100/80 dark:bg-warmdark-800 text-stone-700 dark:text-champagne-300 border border-champagne-300 dark:border-warmdark-700">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="font-bold text-base text-stone-900 dark:text-white">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed font-normal">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stakeholder Workspaces Breakdown */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-champagne-100/80 dark:bg-warmdark-800 text-stone-800 dark:text-champagne-300 text-xs font-semibold border border-champagne-300 dark:border-warmdark-700">
            <Users className="w-3.5 h-3.5 text-champagne-600 dark:text-champagne-400" />
            <span>Role-Based Ecosystem</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight">
            Tailored Workspaces for Every Stakeholder
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            Dedicated interfaces and rigorous permission boundaries configured for each participant.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stakeholderRoles.map((roleItem, idx) => {
            const RoleIcon = roleItem.icon;
            return (
              <div
                key={idx}
                className="surface-card p-6 rounded-2xl border border-champagne-200/90 dark:border-warmdark-700 flex flex-col justify-between space-y-4 hover:border-burgundy-300 transition-all duration-200"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-champagne-50 dark:bg-burgundy-950/40 text-burgundy-700 dark:text-champagne-300 border border-champagne-300 dark:border-burgundy-800 flex items-center justify-center">
                    <RoleIcon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base text-stone-900 dark:text-white">
                    {roleItem.title}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    {roleItem.description}
                  </p>

                  <div className="space-y-1.5 pt-2">
                    {roleItem.highlights.map((item, hIdx) => (
                      <div key={hIdx} className="flex items-center gap-1.5 text-[11px] text-stone-700 dark:text-stone-300 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-champagne-200/80 dark:border-warmdark-800">
                  <Link to={roleItem.path} className="w-full block">
                    <Button variant="outline" size="sm" icon={ArrowRight} iconPosition="right" className="w-full justify-center text-xs">
                      {roleItem.actionText}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live Featured Opportunities Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-burgundy-700 dark:text-champagne-300">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Verified Industry Postings</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
              Featured Active Internships
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Directly fetched from the live database. Apply with one click using your stored profile & resume.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/internships">
              <Button variant="secondary" size="sm" icon={ExternalLink} iconPosition="right">
                View All Directory
              </Button>
            </Link>
            <Link to="/external-jobs">
              <Button variant="champagne" size="sm" icon={Search}>
                LinkedIn & Remote Feeds
              </Button>
            </Link>
          </div>
        </div>

        {loadingInternships ? (
          <div className="p-8 text-center surface-card border border-champagne-200/80 rounded-2xl text-xs text-stone-500">
            Loading live opportunities from database...
          </div>
        ) : recentInternships.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentInternships.map((opp) => (
              <div
                key={opp._id}
                className="surface-card p-4 rounded-xl border border-champagne-200/80 dark:border-warmdark-700 hover:border-champagne-400 space-y-2.5 transition-all text-xs flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-champagne-100 dark:bg-warmdark-800 text-stone-700 dark:text-champagne-300">
                      {opp.workMode || 'Hybrid'}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">
                      {opp.openings} opening{opp.openings > 1 ? 's' : ''}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-white line-clamp-1">
                    {opp.title}
                  </h4>
                  <div className="text-stone-600 dark:text-stone-400 font-medium">
                    {opp.companyName}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-stone-500">
                    <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                    <span className="truncate">{opp.location || 'Flexible'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-champagne-200/60 dark:border-warmdark-800 flex items-center justify-between">
                  <div className="font-bold font-mono text-burgundy-800 dark:text-champagne-300">
                    {opp.stipend?.amount ? `₹${opp.stipend.amount}/mo` : 'Negotiable'}
                  </div>
                  <Link to={`/internships`}>
                    <Button variant="primary" size="sm" className="text-xs px-2.5 py-1">
                      Apply
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center surface-card border border-champagne-200/80 rounded-2xl space-y-2">
            <p className="text-xs text-stone-500">No active postings found in this instance yet.</p>
            <Link to="/register?role=company">
              <Button variant="champagne" size="sm" icon={Building2}>
                Post First Internship
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* Quick Certificate Verification Callout */}
      <section className="relative overflow-hidden rounded-2xl surface-card border border-champagne-300 dark:border-burgundy-900/60 p-6 sm:p-8 bg-gradient-to-r from-champagne-50/60 via-white to-burgundy-50/30 dark:from-[#170d11] dark:via-[#150d10] dark:to-[#170d11]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-burgundy-800 dark:text-champagne-300">
              <Award className="w-4 h-4 text-champagne-600" />
              <span>Public Verification Gateway</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white">
              Verify an Issued Internship Certificate
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Employers, universities, and verification agencies can instantly validate certificate legitimacy
              using the unique alphanumeric code stamped on the digital credential.
            </p>
          </div>

          <form onSubmit={handleVerifySubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5 w-full lg:w-auto">
            <input
              type="text"
              placeholder="e.g. SIMS-2026-A1B2C3"
              value={quickCertCode}
              onChange={(e) => setQuickCertCode(e.target.value)}
              className="p-2.5 rounded-xl border border-champagne-300 dark:border-warmdark-700 bg-white dark:bg-warmdark-900 text-xs font-mono tracking-wider text-stone-900 dark:text-white min-w-[220px]"
            />
            <Button type="submit" variant="gradient" size="md" icon={ShieldCheck} className="text-xs font-semibold whitespace-nowrap">
              Verify Credential
            </Button>
          </form>
        </div>
      </section>

      {/* Live System Diagnostics Card */}
      <section id="diagnostics">
        <Card className="border border-champagne-200/90 dark:border-warmdark-800 shadow-soft">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-burgundy-50 dark:bg-burgundy-950/60 text-burgundy-700 dark:text-champagne-300 border border-burgundy-200 dark:border-burgundy-800">
                  <Server className="w-5 h-5" />
                </div>
                <CardTitle className="text-base">System Telemetry & Database Diagnostics</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Active status queried live from <code className="font-mono text-burgundy-700 dark:text-champagne-400">/api/health</code> and <code className="font-mono text-burgundy-700 dark:text-champagne-400">/api/health/db</code>
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              isLoading={loadingHealth}
              onClick={fetchDiagnostics}
              className="text-xs"
            >
              Refresh Diagnostics
            </Button>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* API Gateway */}
              <div className="p-4 rounded-xl bg-champagne-50/50 dark:bg-warmdark-850 border border-champagne-200/80 dark:border-warmdark-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-stone-500">API Gateway</span>
                  <StatusBadge
                    status={isHealthy ? 'healthy' : 'warning'}
                    label={isHealthy ? 'Operational' : 'Checking'}
                    size="sm"
                  />
                </div>
                <div className="text-sm font-bold text-stone-900 dark:text-white font-mono">
                  {isHealthy ? 'HTTP 200 OK' : 'Checking...'}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  Port: <strong className="font-mono text-stone-700 dark:text-stone-300">5001</strong> • Env: <span className="font-mono">{healthData?.data?.environment || 'dev'}</span>
                </div>
              </div>

              {/* Database Connection */}
              <div className="p-4 rounded-xl bg-champagne-50/50 dark:bg-warmdark-850 border border-champagne-200/80 dark:border-warmdark-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-stone-500">MongoDB Database</span>
                  <StatusBadge
                    status={isDbConnected ? 'healthy' : 'warning'}
                    label={isDbConnected ? 'Connected' : 'Degraded'}
                    size="sm"
                  />
                </div>
                <div className="text-sm font-bold text-stone-900 dark:text-white">
                  {isDbConnected ? 'Active Connection' : 'Standby'}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  Latency: <strong className="font-mono text-stone-700 dark:text-stone-300">{dbHealthData?.data?.latencyMs !== undefined ? `${dbHealthData.data.latencyMs}ms` : '< 10ms'}</strong>
                </div>
              </div>

              {/* Process Uptime */}
              <div className="p-4 rounded-xl bg-champagne-50/50 dark:bg-warmdark-850 border border-champagne-200/80 dark:border-warmdark-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-stone-500">Node Process Uptime</span>
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                </div>
                <div className="text-sm font-bold text-stone-900 dark:text-white font-mono">
                  {healthData?.data?.uptimeSeconds !== undefined ? `${healthData.data.uptimeSeconds}s` : '--'}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  Graceful signal termination active
                </div>
              </div>

              {/* Memory Allocation */}
              <div className="p-4 rounded-xl bg-champagne-50/50 dark:bg-warmdark-850 border border-champagne-200/80 dark:border-warmdark-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-stone-500">Node RSS Memory</span>
                  <Activity className="w-3.5 h-3.5 text-stone-400" />
                </div>
                <div className="text-sm font-bold text-stone-900 dark:text-white font-mono">
                  {healthData?.data?.memoryUsageMB?.rss ? `${healthData.data.memoryUsageMB.rss} MB` : '--'}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  Heap: <span className="font-mono">{healthData?.data?.memoryUsageMB?.heapUsed || '--'} MB</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default HomePage;
