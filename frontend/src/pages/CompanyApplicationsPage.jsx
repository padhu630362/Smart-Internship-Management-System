import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Video,
  FileText,
  Briefcase,
  Building2,
  GraduationCap,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  UserCheck,
  XCircle,
  FileCheck,
  Send,
} from 'lucide-react';
import applicationService, { APPLICATION_STATUSES } from '../services/applicationService';
import internshipService from '../services/internshipService';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';

export const CompanyApplicationsPage = () => {
  const { user, token } = useAuth();

  const getResumeUrl = (rawUrl) => {
    if (!rawUrl) return '#';
    const authToken = token || localStorage.getItem('sims_auth_token') || '';
    return `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(authToken)}`;
  };

  const [applications, setApplications] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    submittedCount: 0,
    underReviewCount: 0,
    shortlistedCount: 0,
    interviewCount: 0,
    selectedCount: 0,
    rejectedCount: 0,
    withdrawnCount: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedInternshipId, setSelectedInternshipId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Review Candidate Modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [interviewForm, setInterviewForm] = useState({
    scheduledAt: '',
    meetingLink: '',
    location: '',
    instructions: '',
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleTriggerAiAnalysis = async (appId) => {
    try {
      setIsAnalyzing(true);
      setErrorMessage('');
      const res = await applicationService.analyzeResume(appId);
      if (res?.data?.aiAnalysis) {
        const updatedAnalysis = res.data.aiAnalysis;
        setSelectedApp((prev) => (prev ? { ...prev, aiAnalysis: updatedAnalysis } : null));
        setApplications((prev) =>
          prev.map((a) => (a._id === appId ? { ...a, aiAnalysis: updatedAnalysis } : a))
        );
        setSuccessMessage('AI Resume analysis completed successfully.');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.response?.data?.error?.message || 'Failed to perform AI analysis.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  useEffect(() => {
    fetchApplications(1);
  }, [selectedStatus, selectedInternshipId]);

  const fetchOpportunities = async () => {
    try {
      const res = await internshipService.getCompanyInternships({ limit: 100 });
      if (res?.data?.opportunities) {
        setOpportunities(res.data.opportunities);
      }
    } catch (err) {
      console.warn('Could not load company opportunities for filter dropdown:', err);
    }
  };

  const fetchApplications = async (page = 1) => {
    try {
      setLoading(true);
      setErrorMessage('');
      const params = {
        page,
        limit: pagination.limit,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        internshipId: selectedInternshipId || undefined,
        search: searchTerm.trim() || undefined,
      };

      const res = await applicationService.getCompanyApplications(params);
      if (res?.data) {
        setApplications(res.data.applications || []);
        setPagination(res.data.pagination);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to retrieve candidate applications.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApplications(1);
  };

  const handleOpenReview = (app) => {
    setSelectedApp(app);
    setTargetStatus('');
    setReviewNotes('');
    setDecisionReason('');
    setInterviewForm({
      scheduledAt: app.interviewDetails?.scheduledAt
        ? new Date(app.interviewDetails.scheduledAt).toISOString().slice(0, 16)
        : '',
      meetingLink: app.interviewDetails?.meetingLink || '',
      location: app.interviewDetails?.location || '',
      instructions: app.interviewDetails?.instructions || '',
    });
    setIsReviewOpen(true);
  };

  // Helper for available next status transitions
  const getAvailableTransitions = (currentStatus) => {
    const isPrivileged = ['admin', 'coordinator'].includes(user?.role);
    if (isPrivileged) {
      return [
        APPLICATION_STATUSES.SUBMITTED,
        APPLICATION_STATUSES.UNDER_REVIEW,
        APPLICATION_STATUSES.SHORTLISTED,
        APPLICATION_STATUSES.INTERVIEW,
        APPLICATION_STATUSES.SELECTED,
        APPLICATION_STATUSES.REJECTED,
      ].filter((s) => s !== currentStatus);
    }

    switch (currentStatus) {
      case APPLICATION_STATUSES.SUBMITTED:
        return [
          APPLICATION_STATUSES.UNDER_REVIEW,
          APPLICATION_STATUSES.SHORTLISTED,
          APPLICATION_STATUSES.REJECTED,
        ];
      case APPLICATION_STATUSES.UNDER_REVIEW:
        return [
          APPLICATION_STATUSES.SHORTLISTED,
          APPLICATION_STATUSES.INTERVIEW,
          APPLICATION_STATUSES.REJECTED,
        ];
      case APPLICATION_STATUSES.SHORTLISTED:
        return [
          APPLICATION_STATUSES.INTERVIEW,
          APPLICATION_STATUSES.SELECTED,
          APPLICATION_STATUSES.REJECTED,
        ];
      case APPLICATION_STATUSES.INTERVIEW:
        return [APPLICATION_STATUSES.SELECTED, APPLICATION_STATUSES.REJECTED];
      default:
        return [];
    }
  };

  const handleSubmitStatusChange = async (e) => {
    e.preventDefault();
    if (!selectedApp || !targetStatus) return;

    if (targetStatus === APPLICATION_STATUSES.REJECTED && !decisionReason.trim()) {
      setErrorMessage('A rejection rationale is mandatory when declining an applicant.');
      return;
    }

    try {
      setIsSubmittingReview(true);
      setErrorMessage('');

      const payload = {
        status: targetStatus,
        reviewNotes: reviewNotes.trim() || undefined,
        reason: decisionReason.trim() || undefined,
        interviewDetails:
          targetStatus === APPLICATION_STATUSES.INTERVIEW ? interviewForm : undefined,
      };

      const res = await applicationService.updateApplicationStatus(selectedApp._id, payload);
      if (res?.success) {
        setSuccessMessage(`Application status updated to '${targetStatus}'.`);
        setIsReviewOpen(false);
        fetchApplications(pagination.page);
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to update candidate status.'
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const statusFilterTabs = [
    { id: 'all', label: 'All Candidates', count: stats.totalCount },
    { id: APPLICATION_STATUSES.SUBMITTED, label: 'Submitted', count: stats.submittedCount },
    { id: APPLICATION_STATUSES.UNDER_REVIEW, label: 'Under Review', count: stats.underReviewCount },
    { id: APPLICATION_STATUSES.SHORTLISTED, label: 'Shortlisted', count: stats.shortlistedCount },
    { id: APPLICATION_STATUSES.INTERVIEW, label: 'Interviews', count: stats.interviewCount },
    { id: APPLICATION_STATUSES.SELECTED, label: 'Selected Offers', count: stats.selectedCount },
    { id: APPLICATION_STATUSES.REJECTED, label: 'Rejected', count: stats.rejectedCount },
    { id: APPLICATION_STATUSES.WITHDRAWN, label: 'Withdrawn', count: stats.withdrawnCount },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidate Screening & Selection Console"
        description="Review student applications, verify academic credentials, schedule technical rounds, and advance candidates through the selection funnel."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Candidate Applications' }]}
        badge={
          <StatusBadge
            status="healthy"
            label={`${stats.totalCount} APPLICANTS`}
            size="sm"
          />
        }
      />

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 font-bold">
            ×
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-500 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Funnel Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500">Submitted</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {stats.submittedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Under Review</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {stats.underReviewCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">Shortlisted</span>
            <div className="text-xl font-black text-brand-600 dark:text-brand-400 mt-0.5">
              {stats.shortlistedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">Interviews</span>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
              {stats.interviewCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Selected</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.selectedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Rejected</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {stats.rejectedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="surface-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search candidate by name, email, student ID, or department..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Opportunity Dropdown */}
          <div className="w-full sm:w-64">
            <select
              value={selectedInternshipId}
              onChange={(e) => setSelectedInternshipId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">All Managed Opportunities</option>
              {opportunities.map((opp) => (
                <option key={opp._id} value={opp._id}>
                  {opp.title} ({opp.applicationsCount || 0} applicants)
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="primary" size="sm">
            Search
          </Button>
        </form>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {statusFilterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedStatus === tab.id
                  ? 'bg-brand-500 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedStatus === tab.id
                    ? 'bg-brand-600/60 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <LoadingState message="Loading candidate applications..." />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            selectedStatus === 'all'
              ? 'No Candidate Applications Found'
              : `No Applications in '${selectedStatus.replace('_', ' ')}' Status`
          }
          description="Applications submitted by qualified students for your published positions will appear here for review."
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const snapshot = app.studentSnapshot || {};
            const internship = app.internship || {};

            return (
              <div
                key={app._id}
                className="surface-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-brand-300 dark:hover:border-brand-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Candidate Overview */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={app.status}
                      label={app.status.replace('_', ' ').toUpperCase()}
                      size="sm"
                    />
                    <span className="text-xs text-slate-400 font-mono">
                      Applied {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold border border-brand-200/60 dark:border-brand-800/60">
                      Target: {internship.title || 'Position'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-brand text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {snapshot.name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{snapshot.name || 'Candidate Name'}</span>
                        {snapshot.studentId && (
                          <span className="text-xs font-mono font-normal text-slate-400">
                            ({snapshot.studentId})
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">{snapshot.email}</p>
                    </div>
                  </div>

                  {/* Academic Snapshot badges */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                    {snapshot.department && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
                        Dept: {snapshot.department}
                      </span>
                    )}
                    {snapshot.cgpa && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200 dark:border-emerald-800">
                        CGPA: {snapshot.cgpa} / 10.0
                      </span>
                    )}
                    {snapshot.skills?.length > 0 && (
                      <span className="text-[11px] text-slate-400">
                        Skills: {snapshot.skills.slice(0, 3).join(', ')}
                        {snapshot.skills.length > 3 ? '...' : ''}
                      </span>
                    )}
                  </div>

                  {/* AI Match Score Badge & Skills Preview */}
                  {app.aiAnalysis?.matchScore !== undefined && app.aiAnalysis?.matchScore !== null ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          app.aiAnalysis.matchScore >= 75
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : app.aiAnalysis.matchScore >= 50
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        {app.aiAnalysis.matchScore}% Match
                      </span>
                      {app.aiAnalysis.matchedSkills?.length > 0 && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ {app.aiAnalysis.matchedSkills.slice(0, 3).join(', ')}
                        </span>
                      )}
                      {app.aiAnalysis.missingSkills?.length > 0 && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          • Missing: {app.aiAnalysis.missingSkills.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTriggerAiAnalysis(app._id);
                        }}
                        disabled={isAnalyzing}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700 underline"
                      >
                        <Sparkles className="w-3 h-3 text-brand-500" />
                        {isAnalyzing ? 'Analyzing...' : 'Run AI Resume Match'}
                      </button>
                    </div>
                  )}

                  {/* Rejection reason or interview preview */}
                  {app.status === 'rejected' && app.decisionReason && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 italic">
                      Rejection Reason: "{app.decisionReason}"
                    </p>
                  )}
                  {app.status === 'interview' && app.interviewDetails?.scheduledAt && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" />
                      Interview: {new Date(app.interviewDetails.scheduledAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Right Action: Review button */}
                <div className="flex items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                  <a
                    href={getResumeUrl(app.resumeUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-brand-500" />
                    <span>Resume</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={ChevronRight}
                    onClick={() => handleOpenReview(app)}
                    className="text-xs shadow-2xs font-semibold"
                  >
                    Review Candidate
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-slate-500">
              <span>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} candidates)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchApplications(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchApplications(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Candidate Modal */}
      <Modal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        title="Candidate Screening & Evaluation Dossier"
        size="lg"
      >
        {selectedApp && (
          <div className="space-y-6">
            {/* Candidate Profile Dossier */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedApp.studentSnapshot?.name}</span>
                    <StatusBadge
                      status={selectedApp.status}
                      label={selectedApp.status.toUpperCase()}
                      size="sm"
                    />
                  </h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedApp.studentSnapshot?.email} • {selectedApp.studentSnapshot?.phone || 'No phone'}
                  </p>
                </div>

                <a
                  href={getResumeUrl(selectedApp.resumeUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-brand-600 hover:text-brand-700 shadow-2xs"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>View Verified Resume</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Academic Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">College ID</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedApp.studentSnapshot?.studentId || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Department</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedApp.studentSnapshot?.department || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Graduation Year</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedApp.studentSnapshot?.graduationYear || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">CGPA Score</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedApp.studentSnapshot?.cgpa ? `${selectedApp.studentSnapshot.cgpa} / 10.0` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Skills */}
              {selectedApp.studentSnapshot?.skills?.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase mb-1">
                    Candidate Skills
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApp.studentSnapshot.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[11px] font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Student Statement / Cover letter */}
              {selectedApp.coverLetter && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase mb-1">
                    Student Statement of Interest
                  </span>
                  <p className="p-3 rounded-lg bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    {selectedApp.coverLetter}
                  </p>
                </div>
              )}
            </div>

            {/* AI Resume Analysis & Screening Intelligence */}
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      AI Resume & Skills Compatibility Insights
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Engine: {selectedApp.aiAnalysis?.engine || 'Deterministic Semantic Matcher'}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTriggerAiAnalysis(selectedApp._id)}
                  disabled={isAnalyzing}
                  className="text-xs font-medium border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                >
                  <Sparkles className={`w-3.5 h-3.5 mr-1 text-indigo-500 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  {isAnalyzing ? 'Analyzing...' : 'Re-Run AI Analysis'}
                </Button>
              </div>

              {selectedApp.aiAnalysis?.matchScore !== undefined && selectedApp.aiAnalysis?.matchScore !== null ? (
                <div className="space-y-3">
                  {/* Score & Progress */}
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-2xs ${
                        selectedApp.aiAnalysis.matchScore >= 75
                          ? 'bg-emerald-600'
                          : selectedApp.aiAnalysis.matchScore >= 50
                          ? 'bg-amber-600'
                          : 'bg-rose-600'
                      }`}>
                        {selectedApp.aiAnalysis.matchScore}%
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Candidate Alignment Score
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {selectedApp.aiAnalysis.matchScore >= 75
                            ? 'Strong candidate fit across required technical domains'
                            : selectedApp.aiAnalysis.matchScore >= 50
                            ? 'Moderate alignment; some prerequisite skill gaps present'
                            : 'Foundational gaps identified against mandatory requirements'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Matched vs Missing Skills */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1.5 text-[11px] uppercase tracking-wide">
                        ✓ Verified Matched Skills ({selectedApp.aiAnalysis.matchedSkills?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {selectedApp.aiAnalysis.matchedSkills?.length > 0 ? (
                          selectedApp.aiAnalysis.matchedSkills.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-semibold">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No exact required skills detected</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
                      <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1.5 text-[11px] uppercase tracking-wide">
                        ⚠ Missing Prerequisite Skills ({selectedApp.aiAnalysis.missingSkills?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {selectedApp.aiAnalysis.missingSkills?.length > 0 ? (
                          selectedApp.aiAnalysis.missingSkills.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-semibold">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-emerald-600 font-semibold text-[11px]">All required skills satisfied!</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Overall Assessment */}
                  {selectedApp.aiAnalysis.overallAssessment && (
                    <div className="text-xs p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-bold block text-slate-900 dark:text-white mb-1">
                        AI Executive Summary:
                      </span>
                      {selectedApp.aiAnalysis.overallAssessment}
                    </div>
                  )}

                  {/* Strengths */}
                  {selectedApp.aiAnalysis.strengths?.length > 0 && (
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                        Identified Candidate Strengths:
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400 text-[11px]">
                        {selectedApp.aiAnalysis.strengths.map((str, i) => (
                          <li key={i}>{str}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested Improvements */}
                  {selectedApp.aiAnalysis.improvements?.length > 0 && (
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                        Recommended Improvement Areas:
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400 text-[11px]">
                        {selectedApp.aiAnalysis.improvements.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs text-slate-500 mb-2">
                    AI analysis has not been executed yet for this applicant's resume.
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleTriggerAiAnalysis(selectedApp._id)}
                    disabled={isAnalyzing}
                    className="text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    {isAnalyzing ? 'Analyzing Resume...' : 'Analyze Resume Now'}
                  </Button>
                </div>
              )}
            </div>

            {/* Status Transition Action Form */}
            {selectedApp.status !== 'withdrawn' ? (
              <form onSubmit={handleSubmitStatusChange} className="space-y-4">
                <div className="p-4 rounded-xl border border-brand-200/80 dark:border-brand-900/60 bg-brand-50/40 dark:bg-brand-950/20 space-y-3">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    Transition Application Status
                  </h5>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target Milestone Status <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="">Select next status transition...</option>
                      {getAvailableTransitions(selectedApp.status).map((s) => (
                        <option key={s} value={s}>
                          Advance to: {s.toUpperCase().replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* If Interview: Schedule Details Form */}
                  {targetStatus === APPLICATION_STATUSES.INTERVIEW && (
                    <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2.5 text-xs">
                      <div className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-purple-600" />
                        <span>Interview Scheduling Details</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-purple-900 dark:text-purple-300 mb-1">
                            Scheduled Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={interviewForm.scheduledAt}
                            onChange={(e) =>
                              setInterviewForm({ ...interviewForm, scheduledAt: e.target.value })
                            }
                            className="w-full p-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-purple-900 dark:text-purple-300 mb-1">
                            Meeting Link / Platform
                          </label>
                          <input
                            type="text"
                            value={interviewForm.meetingLink}
                            onChange={(e) =>
                              setInterviewForm({ ...interviewForm, meetingLink: e.target.value })
                            }
                            placeholder="e.g., https://meet.google.com/xyz"
                            className="w-full p-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-purple-900 dark:text-purple-300 mb-1">
                          Instructions for Candidate
                        </label>
                        <input
                          type="text"
                          value={interviewForm.instructions}
                          onChange={(e) =>
                            setInterviewForm({ ...interviewForm, instructions: e.target.value })
                          }
                          placeholder="e.g., Prepare portfolio and coding demo"
                          className="w-full p-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* If Rejected: Mandatory Decision Reason */}
                  {targetStatus === APPLICATION_STATUSES.REJECTED && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-1.5 text-xs">
                      <label className="block font-bold text-rose-900 dark:text-rose-200">
                        Reason for Rejection (Mandatory) <span className="text-rose-600">*</span>
                      </label>
                      <textarea
                        value={decisionReason}
                        onChange={(e) => setDecisionReason(e.target.value)}
                        required
                        placeholder="Provide formal constructive rationale for declining this applicant..."
                        rows={2}
                        className="w-full p-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-xs text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>
                  )}

                  {/* Internal Review Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Internal Review Notes (Recorded in Audit Trail)
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add evaluation feedback, score, or recruiter notes..."
                      rows={2}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      icon={Send}
                      disabled={!targetStatus}
                      loading={isSubmittingReview}
                    >
                      Confirm Status Transition
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Ban className="w-4 h-4 text-slate-500" />
                <span>This application has been withdrawn by the student. Status transitions are locked.</span>
              </div>
            )}

            {/* Audit History Timeline */}
            <div className="space-y-3">
              <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Complete Audit Trail
              </h5>

              <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {(selectedApp.statusHistory || []).map((step, idx) => (
                  <div key={idx} className="relative group">
                    <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-brand-500" />
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <StatusBadge
                          status={step.status}
                          label={step.status.toUpperCase()}
                          size="sm"
                        />
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(step.changedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        {step.note || `Transition to '${step.status}'`}
                      </p>
                      {step.reason && (
                        <p className="text-slate-500 italic text-[11px]">Reason: {step.reason}</p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        Actor: <strong>{step.changedByName || 'System Actor'}</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setIsReviewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CompanyApplicationsPage;
