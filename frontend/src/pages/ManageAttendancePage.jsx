import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Check,
  Edit3,
  Info,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import attendanceService, {
  ATTENDANCE_STATUSES,
  ATTENDANCE_REVIEW_STATUSES,
} from '../services/attendanceService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { Card, CardContent } from '../components/common/Card';

export const ManageAttendancePage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState('all');

  // Correction Modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isCorrectModalOpen, setIsCorrectModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(ATTENDANCE_STATUSES.PRESENT);
  const [correctionReason, setCorrectionReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, [selectedStatus, selectedReviewStatus]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const params = {
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        reviewStatus: selectedReviewStatus !== 'all' ? selectedReviewStatus : undefined,
        limit: 50,
      };

      const res = await attendanceService.getAttendanceRecords(params);
      if (res?.data?.records) {
        setRecords(res.data.records);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to retrieve intern attendance records.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApprove = async (recordId) => {
    try {
      setErrorMessage('');
      const res = await attendanceService.reviewAttendanceRecord(recordId, {
        reviewStatus: ATTENDANCE_REVIEW_STATUSES.APPROVED,
        reviewNotes: 'Verified and approved by supervisor.',
      });

      if (res?.success) {
        setSuccessMessage('Attendance record approved.');
        fetchRecords();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to approve attendance.'
      );
    }
  };

  const handleOpenCorrectModal = (record) => {
    setSelectedRecord(record);
    setNewStatus(record.status);
    setCorrectionReason('');
    setReviewNotes('');
    setIsCorrectModalOpen(true);
  };

  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;

    if (!correctionReason.trim()) {
      setErrorMessage('A mandatory audit reason is required when adjusting attendance records.');
      return;
    }

    try {
      setIsCorrecting(true);
      setErrorMessage('');

      const res = await attendanceService.reviewAttendanceRecord(selectedRecord._id, {
        reviewStatus: ATTENDANCE_REVIEW_STATUSES.CORRECTED,
        newStatus,
        reason: correctionReason.trim(),
        reviewNotes: reviewNotes.trim(),
      });

      if (res?.success) {
        setSuccessMessage('Attendance record corrected and audit trail logged.');
        setIsCorrectModalOpen(false);
        fetchRecords();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to correct attendance record.'
      );
    } finally {
      setIsCorrecting(false);
    }
  };

  const pendingReviewCount = records.filter(
    (r) => r.reviewStatus === ATTENDANCE_REVIEW_STATUSES.SUBMITTED
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intern Attendance Review & Audit Console"
        description="Review daily presence logs, verify check-ins, and apply regulatory corrections with audit trail recording."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Review Attendance' }]}
        badge={
          <StatusBadge
            status={pendingReviewCount > 0 ? 'warning' : 'healthy'}
            label={`${pendingReviewCount} PENDING REVIEW`}
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

      {/* Filter Tabs */}
      <div className="surface-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-semibold mr-1">Status:</span>
            {['all', ATTENDANCE_STATUSES.PRESENT, ATTENDANCE_STATUSES.REMOTE, ATTENDANCE_STATUSES.HALF_DAY, ATTENDANCE_STATUSES.ABSENT].map(
              (st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    selectedStatus === st
                      ? 'bg-brand-500 text-white font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {st.toUpperCase()}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-semibold mr-1">Review:</span>
            {['all', ATTENDANCE_REVIEW_STATUSES.SUBMITTED, ATTENDANCE_REVIEW_STATUSES.APPROVED, ATTENDANCE_REVIEW_STATUSES.CORRECTED].map(
              (rst) => (
                <button
                  key={rst}
                  onClick={() => setSelectedReviewStatus(rst)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    selectedReviewStatus === rst
                      ? 'bg-brand-500 text-white font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {rst.toUpperCase()}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Records Table */}
      {loading ? (
        <LoadingState message="Loading intern attendance records..." />
      ) : records.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Attendance Logs Found"
          description="Attendance submissions from placed interns will appear here for mentor verification and review."
        />
      ) : (
        <div className="space-y-3">
          {records.map((rec) => (
            <div
              key={rec._id}
              className="surface-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 hover:border-brand-300 dark:hover:border-brand-700 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl gradient-brand text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {rec.student?.name?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {rec.student?.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">{rec.student?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={rec.status === 'present' ? 'healthy' : 'brand'}
                    label={rec.status.toUpperCase()}
                    size="sm"
                  />
                  <StatusBadge
                    status={rec.reviewStatus === 'approved' ? 'healthy' : 'warning'}
                    label={`REVIEW: ${rec.reviewStatus.toUpperCase()}`}
                    size="sm"
                  />
                </div>
              </div>

              {/* Date & In/Out Details */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                <span>
                  Date:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {new Date(rec.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </strong>
                </span>
                {rec.checkInTime && <span>Check-In: <strong>{rec.checkInTime}</strong></span>}
                {rec.checkOutTime && <span>Check-Out: <strong>{rec.checkOutTime}</strong></span>}
              </div>

              {rec.workSummary && (
                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg leading-relaxed">
                  {rec.workSummary}
                </p>
              )}

              {/* Correction audit info if present */}
              {rec.correctionHistory?.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Correction Audit Entry:
                  </span>
                  <p className="italic">
                    Changed from '{rec.correctionHistory[0].previousStatus}' to '{rec.correctionHistory[0].newStatus}' by{' '}
                    <strong>{rec.correctionHistory[0].correctedByName}</strong>: "{rec.correctionHistory[0].reason}"
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {rec.reviewStatus !== ATTENDANCE_REVIEW_STATUSES.APPROVED && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Check}
                    onClick={() => handleQuickApprove(rec._id)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    Approve Record
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  icon={Edit3}
                  onClick={() => handleOpenCorrectModal(rec)}
                  className="text-xs"
                >
                  Correct Status
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Correct Record Modal */}
      <Modal
        isOpen={isCorrectModalOpen}
        onClose={() => setIsCorrectModalOpen(false)}
        title="Correct Attendance Record"
        subtitle={selectedRecord?.student?.name}
        size="md"
      >
        <form onSubmit={handleSubmitCorrection} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Adjusting an attendance record logs a permanent entry into the compliance audit trail. A valid rationale is mandatory.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Corrected Status <span className="text-rose-500">*</span>
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            >
              <option value={ATTENDANCE_STATUSES.PRESENT}>Present (Full Day)</option>
              <option value={ATTENDANCE_STATUSES.HALF_DAY}>Half Day</option>
              <option value={ATTENDANCE_STATUSES.REMOTE}>Remote</option>
              <option value={ATTENDANCE_STATUSES.ABSENT}>Absent</option>
              <option value={ATTENDANCE_STATUSES.EXCUSED}>Excused / Leave</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Audit Reason for Correction <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              required
              placeholder="e.g., Student left early at 1:00 PM for university examinations; standup missed"
              rows={3}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCorrectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isCorrecting}
            >
              Save Correction
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ManageAttendancePage;
