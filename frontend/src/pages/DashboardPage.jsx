import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Building2,
  UserCheck,
  ShieldCheck,
  Briefcase,
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  LogOut,
  Calendar,
  Layers,
  Sparkles,
  User,
  FileText,
  BarChart3,
  TrendingUp,
  Star,
  Award,
  ChevronRight,
  Download,
  CheckCheck,
  Loader2,
  ArrowUpRight,
  MessageSquare,
  PlusCircle,
  Eye,
  CheckSquare,
  FileSpreadsheet,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import analyticsService from '../services/analyticsService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { SkeletonCard } from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await analyticsService.getDashboardAnalytics();
      if (res?.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
      setError('Unable to fetch live analytics from server. Please verify network connectivity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const roleTitleMap = {
    student: 'Student & Intern Workspace',
    company: 'Host Employer Portal',
    mentor: 'Industry Mentor Workspace',
    coordinator: 'Internship Coordinator Hub',
    admin: 'Institutional Governance Console',
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Top Page Header */}
      <PageHeader
        title={roleTitleMap[user?.role] || 'Authenticated Workspace'}
        description={`Welcome back, ${user?.name}. Real-time analytics aggregated directly from your institutional database.`}
        breadcrumbs={[{ label: 'Dashboard' }]}
        badge={
          <StatusBadge
            status="healthy"
            label={`${user?.role?.toUpperCase()} ROLE`}
            size="sm"
          />
        }
        actions={
          <div className="flex items-center gap-2">
            {user?.role !== 'student' && (
              <Link to="/reports">
                <Button variant="outline" size="sm" icon={BarChart3}>
                  Reports & CSV
                </Button>
              </Link>
            )}
            <Link to="/chat">
              <Button variant="outline" size="sm" icon={MessageSquare}>
                Chat
              </Button>
            </Link>
            <Button variant="outline" size="sm" icon={LogOut} onClick={logout}>
              Sign Out
            </Button>
          </div>
        }
      />

      {/* Loading & Error States */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to Load Dashboard Analytics"
          message={error}
          onRetry={fetchAnalytics}
        />
      ) : (
        <>
          {/* ========================================================= */}
          {/* 1. ADMIN & COORDINATOR DASHBOARD VIEW                     */}
          {/* ========================================================= */}
          {(user?.role === 'admin' || user?.role === 'coordinator') && analytics && (
            <div className="space-y-8">
              {/* Quick Actions Strip */}
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/admin/users">
                  <Button size="sm" variant="outline" icon={Users}>
                    Manage User Directory
                  </Button>
                </Link>
                <Link to="/reports">
                  <Button size="sm" variant="outline" icon={FileSpreadsheet}>
                    Audit Reports & CSV
                  </Button>
                </Link>
                <Link to="/manage/internships">
                  <Button size="sm" variant="outline" icon={Briefcase}>
                    Review Postings
                  </Button>
                </Link>
                <Link to="/manage/allocations">
                  <Button size="sm" variant="outline" icon={Award}>
                    Placement Allocations
                  </Button>
                </Link>
              </div>

              {/* Primary KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Enrolled Students
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {analytics.users?.totalStudents || 0}
                      </h3>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {analytics.departmentBreakdown?.length || 0} Active Departments
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-burgundy-500/10 text-burgundy-600 dark:text-champagne-400 flex items-center justify-center font-bold">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Partner Network
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {(analytics.users?.totalCompanies || 0) + (analytics.users?.totalMentors || 0)}
                      </h3>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {analytics.users?.totalCompanies || 0} Employers • {analytics.users?.totalMentors || 0} Mentors
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-champagne-500/15 text-champagne-700 dark:text-champagne-300 flex items-center justify-center font-bold">
                      <Building2 className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Opportunities
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {analytics.opportunities?.total || 0}
                      </h3>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                        {analytics.opportunities?.published || 0} Published & Open
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <Briefcase className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Active Placements
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {analytics.allocations?.active || 0}
                      </h3>
                      <p className="text-[11px] text-burgundy-700 dark:text-champagne-400 mt-0.5 font-medium">
                        {analytics.allocations?.completed || 0} Completed ({analytics.allocations?.completionRate || 0}%)
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                      <Award className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Secondary Metric Cards: Attendance, Tasks & Evaluations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Attendance Performance */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-burgundy-600 dark:text-champagne-400" />
                      Attendance Audit Rate
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Aggregate present/remote attendance compliance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-black text-stone-900 dark:text-white">
                        {analytics.attendance?.overallAttendanceRate || 0}%
                      </span>
                      <span className="text-xs text-stone-500">
                        {analytics.attendance?.presentDays || 0} / {analytics.attendance?.totalRecords || 0} logs
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                        style={{ width: `${Math.min(100, analytics.attendance?.overallAttendanceRate || 0)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-stone-400">
                      Based on verified student daily check-in attendance records.
                    </p>
                  </CardContent>
                </Card>

                {/* Task Milestone Completion */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-burgundy-600 dark:text-champagne-400" />
                      Milestone Completion Rate
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Deliverables completed vs total assigned
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-black text-stone-900 dark:text-white">
                        {analytics.tasks?.completionRate || 0}%
                      </span>
                      <span className="text-xs text-stone-500">
                        {analytics.tasks?.completed || 0} of {analytics.tasks?.total || 0} tasks
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-burgundy-600 to-champagne-500 rounded-full"
                        style={{ width: `${Math.min(100, analytics.tasks?.completionRate || 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-stone-500">
                      <span>{analytics.tasks?.inProgress || 0} In Progress</span>
                      <span>{analytics.tasks?.submitted || 0} Pending Review</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Academic Evaluations Quality */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      Academic Appraisal Rating
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Average mentor evaluation score across placements
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-3xl font-black text-stone-900 dark:text-white">
                          {analytics.evaluations?.averageRating || 0}
                        </span>
                        <span className="text-xs text-stone-400 font-bold">/ 5.0</span>
                      </div>
                      <span className="text-xs text-stone-500">
                        {analytics.evaluations?.total || 0} Evaluations
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(analytics.evaluations?.averageRating || 0)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-stone-300 dark:text-stone-700'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-[11px] text-stone-500">
                      <span>{analytics.evaluations?.midTermCount || 0} Mid-term</span>
                      <span>{analytics.evaluations?.finalCount || 0} Final sign-offs</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Application Funnel & Department Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Application Lifecycle Funnel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-bold">
                      Applications Lifecycle Pipeline
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Candidate distribution across workflow transition stages
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(analytics.applications?.byStatus || {}).map(([statusKey, count]) => {
                      const total = analytics.applications?.total || 1;
                      const percent = Math.round((count / total) * 100);
                      return (
                        <div key={statusKey} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold capitalize text-stone-700 dark:text-stone-300">
                              {statusKey.replace('_', ' ')}
                            </span>
                            <span className="text-stone-500 font-medium">
                              {count} ({percent}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                            <div
                              className="h-full bg-burgundy-600 dark:bg-champagne-500 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Department Enrollment Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-bold">
                      Academic Department Distribution
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Student cohort concentration across university faculties
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(analytics.departmentBreakdown || []).length === 0 ? (
                      <p className="text-xs text-stone-400 italic">No student department data found.</p>
                    ) : (
                      analytics.departmentBreakdown.map((dept, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-champagne-50/50 dark:bg-warmdark-850 border border-champagne-200/60 dark:border-warmdark-800">
                          <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                            {dept.department}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-burgundy-50 dark:bg-burgundy-950 text-burgundy-700 dark:text-champagne-300 border border-burgundy-200 dark:border-burgundy-800">
                            {dept.count} students
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity Stream */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span>Recent Institutional Activity</span>
                    <Link to="/reports" className="text-xs text-burgundy-700 dark:text-champagne-300 hover:underline font-medium">
                      View Full Reports &rarr;
                    </Link>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Latest student applications, allocations, and appraisals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {(analytics.recentActivity?.allocations || []).length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-3">No recent institutional activities logged.</p>
                    ) : (
                      analytics.recentActivity.allocations.map((alloc) => (
                        <div key={alloc._id} className="py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-burgundy-500/10 text-burgundy-700 dark:text-champagne-300 flex items-center justify-center font-bold text-xs shrink-0">
                              PL
                            </div>
                            <div>
                              <p className="text-xs font-bold text-stone-900 dark:text-white">
                                {alloc.student?.name} allocated to {alloc.internship?.title}
                              </p>
                              <p className="text-[11px] text-stone-400">
                                Host: {alloc.company?.name || 'Company'} • Status: {alloc.status}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] text-stone-400 shrink-0">
                            {alloc.createdAt ? new Date(alloc.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. STUDENT DASHBOARD VIEW                                 */}
          {/* ========================================================= */}
          {user?.role === 'student' && analytics && (
            <div className="space-y-8">
              {/* Quick Actions Strip */}
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/my-attendance">
                  <Button size="sm" variant="primary" icon={Calendar}>
                    Submit Daily Attendance
                  </Button>
                </Link>
                <Link to="/my-tasks">
                  <Button size="sm" variant="outline" icon={FileCheck2}>
                    My Milestone Tasks
                  </Button>
                </Link>
                <Link to="/external-jobs">
                  <Button size="sm" variant="outline" icon={Briefcase}>
                    Discover LinkedIn Jobs
                  </Button>
                </Link>
                <Link to="/my-certificates">
                  <Button size="sm" variant="outline" icon={Award}>
                    Verifiable Credentials
                  </Button>
                </Link>
              </div>

              {/* Student Top KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Open Opportunities
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {analytics.availableOpportunities || 0}
                      </h3>
                      <Link to="/internships" className="text-[11px] text-burgundy-700 dark:text-champagne-300 hover:underline font-semibold flex items-center gap-0.5 mt-1">
                        <span>Browse Directory</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-burgundy-500/10 text-burgundy-700 dark:text-champagne-300 flex items-center justify-center font-bold">
                      <Briefcase className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        My Applications
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {analytics.applications?.total || 0}
                      </h3>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {analytics.applications?.byStatus?.selected || 0} Selected
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                      <FileText className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Attendance Record
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {analytics.attendance?.attendanceRate || 0}%
                      </h3>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                        {analytics.attendance?.presentDays || 0} Days Present
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                      <Calendar className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Assigned Tasks
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {analytics.tasks?.total || 0}
                      </h3>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {analytics.tasks?.completed || 0} Completed
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-champagne-500/15 text-champagne-700 dark:text-champagne-300 flex items-center justify-center font-bold">
                      <FileCheck2 className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Internship Details Banner */}
              {analytics.currentInternship ? (
                <Card className="border-burgundy-500/30 bg-gradient-to-r from-burgundy-50/40 via-champagne-50/20 to-transparent dark:from-burgundy-950/30 dark:to-transparent">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-burgundy-700 dark:text-champagne-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        Current Active Placement
                      </span>
                      <StatusBadge status="healthy" label="ACTIVE PLACEMENT" size="sm" />
                    </div>
                    <CardTitle className="text-xl font-bold mt-1">
                      {analytics.currentInternship.internship?.title}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {analytics.currentInternship.company?.name || 'Partner Host Employer'} •{' '}
                      {analytics.currentInternship.internship?.location || 'Remote'} ({analytics.currentInternship.internship?.workMode || 'Hybrid'})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-3 border-t border-stone-200/80 dark:border-stone-800">
                      <div>
                        <span className="text-stone-400 block font-medium">Assigned Faculty Mentor</span>
                        <span className="font-bold text-stone-800 dark:text-stone-200">
                          {analytics.currentInternship.mentor?.name || 'Mentor Assigned'}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block font-medium">Placement Duration</span>
                        <span className="font-bold text-stone-800 dark:text-stone-200">
                          {analytics.currentInternship.startDate ? new Date(analytics.currentInternship.startDate).toLocaleDateString() : 'Active'} -{' '}
                          {analytics.currentInternship.endDate ? new Date(analytics.currentInternship.endDate).toLocaleDateString() : 'Ongoing'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to="/my-attendance">
                          <Button size="sm" variant="outline">
                            Log Attendance
                          </Button>
                        </Link>
                        <Link to="/my-tasks">
                          <Button size="sm">
                            View Tasks
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-stone-500 text-xs flex flex-col items-center gap-3">
                    <Briefcase className="w-10 h-10 text-stone-300 dark:text-stone-700" />
                    <div>
                      <p className="font-bold text-sm text-stone-800 dark:text-stone-200">
                        No active internship placement yet
                      </p>
                      <p className="text-stone-400 max-w-sm mt-1">
                        Apply to verified internship opportunities in the institutional directory to receive placement offers.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link to="/internships">
                        <Button size="sm">Explore Available Internships</Button>
                      </Link>
                      <Link to="/external-jobs">
                        <Button size="sm" variant="outline">Discover LinkedIn Jobs</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upcoming Tasks & Received Evaluations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Deadlines */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-burgundy-600 dark:text-champagne-400" />
                        Upcoming Deadlines
                      </span>
                      <Link to="/my-tasks" className="text-xs text-burgundy-700 dark:text-champagne-300 hover:underline">
                        View All
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(analytics.tasks?.upcoming || []).length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-4">No pending task deadlines!</p>
                    ) : (
                      <div className="divide-y divide-stone-100 dark:divide-stone-800">
                        {analytics.tasks.upcoming.map((task) => (
                          <div key={task._id} className="py-2.5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-stone-900 dark:text-white truncate max-w-xs">
                                {task.title}
                              </p>
                              <p className="text-[11px] text-stone-400">
                                Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date set'}
                              </p>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-sm bg-champagne-50 dark:bg-warmdark-850 text-stone-700 dark:text-stone-300 uppercase">
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Received Appraisals / Evaluations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        Academic Evaluations
                      </span>
                      <Link to="/evaluations" className="text-xs text-burgundy-700 dark:text-champagne-300 hover:underline">
                        Appraisal History
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(analytics.evaluations || []).length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-4">
                        No evaluation submitted by your mentor yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.evaluations.map((ev) => (
                          <div
                            key={ev._id}
                            className="p-3 rounded-xl bg-champagne-50/50 dark:bg-warmdark-850 border border-champagne-200/70 dark:border-warmdark-800 flex items-center justify-between"
                          >
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-burgundy-700 dark:text-champagne-400">
                                {ev.evaluationType === 'mid_term' ? 'Mid-Term Evaluation' : 'Final Evaluation'}
                              </span>
                              <p className="text-xs font-semibold text-stone-900 dark:text-white mt-0.5">
                                Evaluator: {ev.evaluator?.name || 'Mentor'}
                              </p>
                              <p className="text-[11px] text-stone-500 line-clamp-1 italic">
                                "{ev.feedback?.generalComments || ev.feedback?.strengths || 'Satisfactory work'}"
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-lg font-black text-amber-500">
                                {ev.ratings?.overallRating || 0}
                              </span>
                              <span className="text-[10px] text-stone-400 block">/ 5.0</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Completion Certificates Access Banner */}
                <div className="lg:col-span-2">
                  <div className="rounded-2xl p-4 border border-burgundy-200/80 dark:border-burgundy-900/60 bg-gradient-to-r from-burgundy-50/50 via-champagne-50/30 to-transparent dark:from-burgundy-950/40 dark:to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-burgundy-600 text-white shadow-sm">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                          Verified Completion Credentials & Certificates
                        </h4>
                        <p className="text-xs text-stone-500">
                          Accredited, verifiable completion credentials awarded upon successful final mentor evaluations.
                        </p>
                      </div>
                    </div>
                    <Link to="/my-certificates">
                      <Button size="sm" variant="primary" icon={ChevronRight} className="text-xs shrink-0">
                        View Credentials
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. HOST EMPLOYER (COMPANY) DASHBOARD VIEW                 */}
          {/* ========================================================= */}
          {user?.role === 'company' && analytics && (
            <div className="space-y-8">
              {/* Quick Actions Strip */}
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/manage/internships">
                  <Button size="sm" variant="primary" icon={PlusCircle}>
                    Post New Internship
                  </Button>
                </Link>
                <Link to="/manage/applications">
                  <Button size="sm" variant="outline" icon={Users}>
                    Candidate Pipeline
                  </Button>
                </Link>
                <Link to="/manage/attendance">
                  <Button size="sm" variant="outline" icon={Calendar}>
                    Attendance Tracking
                  </Button>
                </Link>
                <Link to="/evaluations">
                  <Button size="sm" variant="outline" icon={Star}>
                    Evaluate Interns
                  </Button>
                </Link>
              </div>

              {/* Company Top Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Managed Postings
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {analytics.opportunities?.total || 0}
                      </h3>
                      <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                        {analytics.opportunities?.published || 0} Published & Open
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-burgundy-500/10 text-burgundy-700 dark:text-champagne-300 flex items-center justify-center font-bold">
                      <Briefcase className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Total Applicants
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {analytics.applicants?.total || 0}
                      </h3>
                      <Link to="/manage/applications" className="text-[11px] text-burgundy-700 dark:text-champagne-300 hover:underline font-medium mt-0.5 block">
                        Review Pipeline &rarr;
                      </Link>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                      <Users className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Active Interns
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {analytics.assignedInterns?.active || 0}
                      </h3>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {analytics.assignedInterns?.total || 0} Total Allocations
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                      <UserCheck className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Pending Actions
                      </p>
                      <h3 className="text-2xl font-black text-amber-500 mt-1">
                        {(analytics.tasks?.submittedPendingReview || 0) +
                          (analytics.attendance?.pendingReviewsCount || 0)}
                      </h3>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {analytics.tasks?.submittedPendingReview || 0} Tasks • {analytics.attendance?.pendingReviewsCount || 0} Attendance
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                      <Clock className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Candidate Pipeline Funnel */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">Candidate Recruitment Pipeline</CardTitle>
                      <CardDescription className="text-xs">
                        Stage-by-stage progression of applicants across all your active postings
                      </CardDescription>
                    </div>
                    <Link to="/manage/applications">
                      <Button size="sm" variant="outline" icon={Users}>
                        Open Pipeline
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { key: 'applied', label: 'Applied', color: 'bg-blue-500' },
                      { key: 'under_review', label: 'In Review', color: 'bg-indigo-500' },
                      { key: 'shortlisted', label: 'Shortlisted', color: 'bg-amber-500' },
                      { key: 'interview', label: 'Interview', color: 'bg-purple-500' },
                      { key: 'selected', label: 'Selected', color: 'bg-emerald-500' },
                      { key: 'rejected', label: 'Rejected', color: 'bg-stone-400' },
                    ].map((stage) => {
                      const count = analytics.applicants?.byStatus?.[stage.key] || 0;
                      const total = analytics.applicants?.total || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={stage.key} className="p-3 rounded-xl bg-champagne-50/50 dark:bg-warmdark-850 border border-champagne-200/60 dark:border-warmdark-800 text-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                            {stage.label}
                          </span>
                          <span className="text-2xl font-black text-stone-900 dark:text-white mt-1 block">
                            {count}
                          </span>
                          <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 mt-2 overflow-hidden">
                            <div className={`h-full ${stage.color} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Active Postings & Assigned Interns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Internships List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                      <span>Recent Postings</span>
                      <Link to="/manage/internships" className="text-xs text-burgundy-700 dark:text-champagne-300 hover:underline">
                        Manage All &rarr;
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Internship openings posted by your organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(analytics.opportunities?.list || []).length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-xs text-stone-400 italic">No internship postings created yet.</p>
                        <Link to="/manage/internships" className="mt-2 inline-block">
                          <Button size="xs" variant="primary">Create First Posting</Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-stone-100 dark:divide-stone-800">
                        {analytics.opportunities.list.map((opp) => (
                          <div key={opp._id} className="py-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-stone-900 dark:text-white truncate max-w-xs">
                                {opp.title}
                              </p>
                              <p className="text-[11px] text-stone-400">
                                {opp.location} • {opp.workMode} • Status: <span className="font-semibold text-stone-600 dark:text-stone-300 uppercase">{opp.status}</span>
                              </p>
                            </div>
                            <Link to="/manage/internships">
                              <Button size="xs" variant="outline">Edit</Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Assigned Interns Roster */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                      <span>Assigned Interns</span>
                      <Link to="/evaluations" className="text-xs text-burgundy-700 dark:text-champagne-300 hover:underline">
                        Appraisals &rarr;
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Students placed in your active internship programs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(analytics.assignedInterns?.list || []).length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-6 text-center">
                        No interns currently placed. Review candidate applications to extend offers.
                      </p>
                    ) : (
                      <div className="divide-y divide-stone-100 dark:divide-stone-800">
                        {analytics.assignedInterns.list.map((alloc) => (
                          <div key={alloc._id} className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-burgundy-500/10 text-burgundy-700 dark:text-champagne-300 flex items-center justify-center font-bold text-xs shrink-0">
                                {alloc.student?.name?.slice(0, 2).toUpperCase() || 'ST'}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-stone-900 dark:text-white">
                                  {alloc.student?.name}
                                </p>
                                <p className="text-[11px] text-stone-400">
                                  {alloc.internship?.title} • {alloc.mentor?.name ? `Mentor: ${alloc.mentor.name}` : 'Mentor Pending'}
                                </p>
                              </div>
                            </div>
                            <Link to="/evaluations">
                              <Button size="xs" variant="outline">Evaluate</Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. FACULTY MENTOR DASHBOARD VIEW                          */}
          {/* ========================================================= */}
          {user?.role === 'mentor' && analytics && (
            <div className="space-y-8">
              {/* Quick Actions Strip */}
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/manage/attendance">
                  <Button size="sm" variant="primary" icon={Calendar}>
                    Verify Attendance Logs ({analytics.attendance?.pendingReviewsCount || 0})
                  </Button>
                </Link>
                <Link to="/manage/tasks">
                  <Button size="sm" variant="outline" icon={FileCheck2}>
                    Grade Milestone Tasks ({analytics.tasks?.submittedPendingReview || 0})
                  </Button>
                </Link>
                <Link to="/evaluations">
                  <Button size="sm" variant="outline" icon={Star}>
                    Submit Academic Appraisals
                  </Button>
                </Link>
                <Link to="/chat">
                  <Button size="sm" variant="outline" icon={MessageSquare}>
                    Advisee Chat Channels
                  </Button>
                </Link>
              </div>

              {/* Mentor KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Supervised Interns
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {analytics.assignedInterns?.active || 0}
                      </h3>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {analytics.assignedInterns?.total || 0} Total Assigned Advisees
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-burgundy-500/10 text-burgundy-700 dark:text-champagne-300 flex items-center justify-center font-bold">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Pending Attendance
                      </p>
                      <h3 className="text-2xl font-black text-amber-500 mt-1">
                        {analytics.attendance?.pendingReviewsCount || 0}
                      </h3>
                      <Link to="/manage/attendance" className="text-[11px] text-burgundy-700 dark:text-champagne-300 hover:underline font-medium mt-0.5 block">
                        Verify Daily Logs &rarr;
                      </Link>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                      <Calendar className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Tasks to Grade
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {analytics.tasks?.submittedPendingReview || 0}
                      </h3>
                      <Link to="/manage/tasks" className="text-[11px] text-burgundy-700 dark:text-champagne-300 hover:underline font-medium mt-0.5 block">
                        Review Submissions &rarr;
                      </Link>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                      <FileCheck2 className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Appraisals Due
                      </p>
                      <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                        {analytics.evaluations?.pendingEvaluationsCount || 0}
                      </h3>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Mid-Term & Final Rubrics
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                      <Star className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Attendance Queue & Supervised Interns Roster */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Verification Queue */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                      <span>Daily Attendance Verification Queue</span>
                      <Link to="/manage/attendance" className="text-xs text-burgundy-700 dark:text-champagne-300 hover:underline">
                        Open Verification Hub &rarr;
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Daily check-in logs submitted by your advisees awaiting faculty approval
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(analytics.attendance?.pendingList || []).length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-6 text-center">
                        All daily student attendance submissions have been verified!
                      </p>
                    ) : (
                      <div className="divide-y divide-stone-100 dark:divide-stone-800">
                        {analytics.attendance.pendingList.map((record) => (
                          <div key={record._id} className="py-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-stone-900 dark:text-white">
                                {record.student?.name}
                              </p>
                              <p className="text-[11px] text-stone-400">
                                Date: {record.date ? new Date(record.date).toLocaleDateString() : 'Today'} • Mode: <span className="capitalize font-semibold text-stone-600 dark:text-stone-300">{record.status}</span> ({record.hoursWorked || 8} hrs)
                              </p>
                              {record.tasksAccomplished && (
                                <p className="text-[11px] text-stone-500 italic line-clamp-1 mt-0.5">
                                  "{record.tasksAccomplished}"
                                </p>
                              )}
                            </div>
                            <Link to="/manage/attendance">
                              <Button size="xs" variant="outline">Verify</Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Advisees Roster */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                      <span>Supervised Advisees Roster</span>
                      <Link to="/evaluations" className="text-xs text-burgundy-700 dark:text-champagne-300 hover:underline">
                        Appraise Interns &rarr;
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Active students assigned under your academic faculty supervision
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(analytics.assignedInterns?.list || []).length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-6 text-center">
                        No students currently allocated to your mentorship portfolio.
                      </p>
                    ) : (
                      <div className="divide-y divide-stone-100 dark:divide-stone-800">
                        {analytics.assignedInterns.list.map((alloc) => (
                          <div key={alloc._id} className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-champagne-500/15 text-champagne-700 dark:text-champagne-300 flex items-center justify-center font-bold text-xs shrink-0">
                                {alloc.student?.name?.slice(0, 2).toUpperCase() || 'ST'}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-stone-900 dark:text-white">
                                  {alloc.student?.name}
                                </p>
                                <p className="text-[11px] text-stone-400">
                                  {alloc.internship?.title} • {alloc.student?.profile?.studentDetails?.department || 'CS'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link to="/chat">
                                <Button size="xs" variant="outline" icon={MessageSquare}>
                                  Chat
                                </Button>
                              </Link>
                              <Link to="/evaluations">
                                <Button size="xs">Evaluate</Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Milestone Deliverables Queue */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span>Milestone Deliverables Awaiting Evaluation</span>
                    <Link to="/manage/tasks" className="text-xs text-burgundy-700 dark:text-champagne-300 hover:underline">
                      Task Management &rarr;
                    </Link>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Deliverables submitted by interns for faculty grade review
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(analytics.tasks?.pendingReviews || []).length === 0 ? (
                    <p className="text-xs text-stone-400 italic py-4 text-center">
                      All student milestone submissions are reviewed and up to date!
                    </p>
                  ) : (
                    <div className="divide-y divide-stone-100 dark:divide-stone-800">
                      {analytics.tasks.pendingReviews.map((t) => (
                        <div key={t._id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-stone-900 dark:text-white truncate max-w-xs">
                              {t.title}
                            </p>
                            <p className="text-[11px] text-stone-400">
                              Intern: {t.assignedTo?.name || 'Student'} • {t.internship?.title}
                            </p>
                          </div>
                          <Link to="/manage/tasks">
                            <Button size="xs">Review Submission</Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Faculty Evaluation Rubric Guidelines */}
              <Card className="border-champagne-300/80 dark:border-burgundy-900/60 bg-gradient-to-r from-champagne-50/40 via-burgundy-50/20 to-transparent dark:from-warmdark-900 dark:to-warmdark-850">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    <CardTitle className="text-sm font-bold">Academic Evaluation & Grading Rubric Matrix</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Institutional appraisal benchmarks required for university credit fulfillment and verified certificate issuance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/70 dark:bg-warmdark-800/80 border border-champagne-200 dark:border-warmdark-700">
                      <span className="font-bold text-stone-900 dark:text-white block">1. Technical Proficiency</span>
                      <p className="text-stone-500 text-[11px] mt-1">Code standards, architectural logic, and tooling adoption.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/70 dark:bg-warmdark-800/80 border border-champagne-200 dark:border-warmdark-700">
                      <span className="font-bold text-stone-900 dark:text-white block">2. Punctuality & Logs</span>
                      <p className="text-stone-500 text-[11px] mt-1">Attendance regularity and accuracy of daily accomplishment logs.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/70 dark:bg-warmdark-800/80 border border-champagne-200 dark:border-warmdark-700">
                      <span className="font-bold text-stone-900 dark:text-white block">3. Milestone Timeliness</span>
                      <p className="text-stone-500 text-[11px] mt-1">Delivery of assigned deliverables against scheduled deadlines.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/70 dark:bg-warmdark-800/80 border border-champagne-200 dark:border-warmdark-700">
                      <span className="font-bold text-stone-900 dark:text-white block">4. Professional Ethics</span>
                      <p className="text-stone-500 text-[11px] mt-1">Workplace etiquette, collaboration, and mentor communication.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardPage;
