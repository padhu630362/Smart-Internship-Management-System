import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Search,
  Filter,
  Ban,
  ArrowUpRight,
  ShieldCheck,
  Video,
  FileCheck,
} from 'lucide-react';
import applicationService, { APPLICATION_STATUSES } from '../services/applicationService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { useAuth } from '../context/AuthContext';

export const StudentApplicationsPage = () => {
  const { token } = useAuth();

  const getResumeUrl = (rawUrl) => {
    if (!rawUrl) return '#';
    const authToken = token || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sims_auth_token') : null) || (typeof localStorage !== 'undefined' ? localStorage.getItem('sims_auth_token') : null) || '';
    return `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(authToken)}`;
  };

  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    totalApplied: 0,
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
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Detail Modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Withdraw Modal
  const [withdrawApp, setWithdrawApp] = useState(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    fetchApplications(1);
  }, [selectedStatus]);

  const fetchApplications = async (page = 1) => {
    try {
      setLoading(true);
      setErrorMessage('');
      const params = {
        page,
        limit: pagination.limit,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      };

      const res = await applicationService.getMyApplications(params);
      if (res?.data) {
        setApplications(res.data.applications || []);
        setPagination(res.data.pagination);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to load your internship applications.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (app) => {
    setSelectedApp(app);
    setIsDetailOpen(true);
  };

  const handleOpenWithdraw = (app) => {
    setWithdrawApp(app);
    setWithdrawReason('');
    setIsDetailOpen(false);
  };

  const handleConfirmWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawApp) return;

    try {
      setIsWithdrawing(true);
      setErrorMessage('');
      const res = await applicationService.withdrawApplication(
        withdrawApp._id,
        withdrawReason.trim()
      );

      if (res?.success) {
        setSuccessMessage('Application successfully withdrawn.');
        setWithdrawApp(null);
        fetchApplications(pagination.page);
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to withdraw application.'
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  const statusFilterTabs = [
    { id: 'all', label: 'All Applications', count: stats.totalApplied },
    { id: APPLICATION_STATUSES.SUBMITTED, label: 'Submitted', count: stats.submittedCount },
    { id: APPLICATION_STATUSES.UNDER_REVIEW, label: 'Under Review', count: stats.underReviewCount },
    { id: APPLICATION_STATUSES.SHORTLISTED, label: 'Shortlisted', count: stats.shortlistedCount },
    { id: APPLICATION_STATUSES.INTERVIEW, label: 'Interview', count: stats.interviewCount },
    { id: APPLICATION_STATUSES.SELECTED, label: 'Selected / Offers', count: stats.selectedCount },
    { id: APPLICATION_STATUSES.REJECTED, label: 'Rejected', count: stats.rejectedCount },
    { id: APPLICATION_STATUSES.WITHDRAWN, label: 'Withdrawn', count: stats.withdrawnCount },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="My Internship Applications"
        description="Track your application progress, screening milestones, interview schedules, and offers in real-time."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'My Applications' }]}
        badge={
          <StatusBadge
            status="healthy"
            label={`${stats.totalApplied} TOTAL FILED`}
            size="sm"
          />
        }
        actions={
          <Link to="/internships">
            <Button variant="primary" size="sm" icon={Briefcase}>
              Explore Open Opportunities
            </Button>
          </Link>
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

      {/* Pipeline Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-brand-500 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Applied</span>
              <FileText className="w-4 h-4 text-brand-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {stats.totalApplied}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Active career applications</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Under Review</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {stats.underReviewCount + stats.submittedCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Screening & resume evaluation</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Interviews & Shortlist</span>
              <Video className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {stats.shortlistedCount + stats.interviewCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Technical rounds & discussions</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Selected / Placed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.selectedCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Official internship offers</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
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

      {/* Main Applications Content */}
      {loading ? (
        <LoadingState message="Fetching your application history..." />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            selectedStatus === 'all'
              ? 'No Internship Applications Yet'
              : `No Applications in '${selectedStatus.replace('_', ' ')}' Status`
          }
          description="Browse published internship listings, verify required criteria, and submit applications directly to host companies."
          action={
            <Link to="/internships">
              <Button variant="primary" size="sm" icon={Briefcase}>
                Explore Opportunities
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const internship = app.internship || {};
            const canWithdraw = !['selected', 'rejected', 'withdrawn'].includes(app.status);

            return (
              <div
                key={app._id}
                className="surface-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-brand-300 dark:hover:border-brand-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={app.status} label={app.status.replace('_', ' ').toUpperCase()} size="sm" />
                    {internship.workMode && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                        {internship.workMode}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">
                      Applied {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {internship.title || 'Internship Opportunity'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-brand-500" />
                      {internship.companyName || 'Host Company'}
                    </span>
                    {internship.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {internship.location}
                      </span>
                    )}
                    {internship.stipend?.amount > 0 && (
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {internship.stipend.currency} {internship.stipend.amount}/mo
                      </span>
                    )}
                  </div>

                  {/* Interview notice preview */}
                  {app.status === 'interview' && app.interviewDetails?.scheduledAt && (
                    <div className="mt-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-800 dark:text-purple-200 flex items-center gap-2">
                      <Video className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>
                        Interview Scheduled for:{' '}
                        <strong>
                          {new Date(app.interviewDetails.scheduledAt).toLocaleString()}
                        </strong>
                      </span>
                    </div>
                  )}

                  {/* Rejection / Note preview */}
                  {app.status === 'rejected' && app.decisionReason && (
                    <div className="mt-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
                      Decision Note: <em>"{app.decisionReason}"</em>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  {canWithdraw && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Ban}
                      onClick={() => handleOpenWithdraw(app)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
                    >
                      Withdraw
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    icon={ChevronRight}
                    onClick={() => handleOpenDetail(app)}
                    className="text-xs"
                  >
                    View Timeline
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-slate-500">
              <span>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} items)
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

      {/* Detail & Timeline Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Application Status & Audit Timeline"
        size="lg"
      >
        {selectedApp && (
          <div className="space-y-5">
            {/* Opportunity snapshot */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedApp.internship?.title || 'Internship Opportunity'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedApp.internship?.companyName} • Applied on{' '}
                  {new Date(selectedApp.createdAt).toLocaleString()}
                </p>
              </div>
              <StatusBadge
                status={selectedApp.status}
                label={selectedApp.status.replace('_', ' ').toUpperCase()}
                size="md"
              />
            </div>

            {/* Resume & Cover Letter */}
            <div className="space-y-2 text-xs">
              <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                Submitted Application Materials
              </h5>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-brand-500" />
                    Official Resume:
                  </span>
                  <a
                    href={getResumeUrl(selectedApp.resumeUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand-600 hover:underline flex items-center gap-1"
                  >
                    <span>{selectedApp.resumeFileName || 'View Attached Resume'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {selectedApp.coverLetter && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 block mb-1">Statement of Interest:</span>
                    <p className="p-2.5 rounded-lg bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-xs">
                      {selectedApp.coverLetter}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Interview details if present */}
            {selectedApp.interviewDetails?.scheduledAt && (
              <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs space-y-2">
                <h5 className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-purple-600" />
                  Interview Scheduled
                </h5>
                <div className="space-y-1 text-purple-800 dark:text-purple-300">
                  <div>
                    <strong>Date & Time:</strong>{' '}
                    {new Date(selectedApp.interviewDetails.scheduledAt).toLocaleString()}
                  </div>
                  {selectedApp.interviewDetails.meetingLink && (
                    <div>
                      <strong>Virtual Room:</strong>{' '}
                      <a
                        href={selectedApp.interviewDetails.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-semibold"
                      >
                        {selectedApp.interviewDetails.meetingLink}
                      </a>
                    </div>
                  )}
                  {selectedApp.interviewDetails.location && (
                    <div>
                      <strong>Location:</strong> {selectedApp.interviewDetails.location}
                    </div>
                  )}
                  {selectedApp.interviewDetails.instructions && (
                    <div>
                      <strong>Preparation:</strong> {selectedApp.interviewDetails.instructions}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Decision Reason */}
            {selectedApp.decisionReason && (
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">Official Decision Rationale:</span>
                <p className="text-slate-600 dark:text-slate-400 italic">
                  "{selectedApp.decisionReason}"
                </p>
              </div>
            )}

            {/* Audit History Timeline */}
            <div className="space-y-3">
              <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Audit Trail & Status Progression
              </h5>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
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
                        Recorded by: <strong>{step.changedByName || 'System Actor'}</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              {!['selected', 'rejected', 'withdrawn'].includes(selectedApp.status) ? (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Ban}
                  onClick={() => handleOpenWithdraw(selectedApp)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  Withdraw Application
                </Button>
              ) : (
                <div />
              )}
              <Button variant="secondary" size="sm" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Withdraw Modal */}
      <Modal
        isOpen={Boolean(withdrawApp)}
        onClose={() => setWithdrawApp(null)}
        title="Withdraw Internship Application"
        size="md"
      >
        {withdrawApp && (
          <form onSubmit={handleConfirmWithdraw} className="space-y-4">
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-1">
              <p className="font-bold">Are you sure you want to withdraw this application?</p>
              <p>
                Position: <strong>{withdrawApp.internship?.title}</strong> at{' '}
                <strong>{withdrawApp.internship?.companyName}</strong>.
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                This action will notify the recruiting team and change the status to 'withdrawn'.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Reason for Withdrawal (Optional)
              </label>
              <textarea
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="e.g., Accepted another offer, scheduling conflict, etc."
                rows={3}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWithdrawApp(null)}
                disabled={isWithdrawing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                icon={Ban}
                loading={isWithdrawing}
              >
                Confirm Withdrawal
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default StudentApplicationsPage;
