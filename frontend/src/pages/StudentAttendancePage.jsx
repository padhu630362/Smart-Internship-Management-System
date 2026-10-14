import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  TrendingUp,
  ShieldCheck,
  Send,
  Sparkles,
  History,
  Info,
} from 'lucide-react';
import attendanceService, {
  ATTENDANCE_STATUSES,
  ATTENDANCE_REVIEW_STATUSES,
} from '../services/attendanceService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';

export const StudentAttendancePage = () => {
  const todayISO = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(todayISO);
  const [status, setStatus] = useState(ATTENDANCE_STATUSES.PRESENT);
  const [checkInTime, setCheckInTime] = useState('09:00 AM');
  const [checkOutTime, setCheckOutTime] = useState('05:30 PM');
  const [workSummary, setWorkSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalDays: 0,
    presentCount: 0,
    absentCount: 0,
    halfDayCount: 0,
    remoteCount: 0,
    excusedCount: 0,
    attendanceRate: 100,
  });

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedMonth, selectedYear]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const [summaryRes, recordsRes] = await Promise.all([
        attendanceService.getMonthlyAttendanceSummary({
          month: selectedMonth,
          year: selectedYear,
        }),
        attendanceService.getAttendanceRecords({
          month: selectedMonth,
          year: selectedYear,
          limit: 31,
        }),
      ]);

      if (summaryRes?.data?.summary) {
        setSummary(summaryRes.data.summary);
      }
      if (recordsRes?.data?.records) {
        setRecords(recordsRes.data.records);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to fetch attendance data.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!date) {
      setErrorMessage('Please specify the attendance date.');
      return;
    }

    if (date > todayISO) {
      setErrorMessage('Attendance cannot be recorded for future dates.');
      return;
    }

    if ((status === ATTENDANCE_STATUSES.PRESENT || status === ATTENDANCE_STATUSES.REMOTE) && !workSummary.trim()) {
      setErrorMessage('Please provide a brief description of work completed or key deliverables today.');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await attendanceService.submitAttendance({
        date,
        status,
        checkInTime: checkInTime.trim(),
        checkOutTime: checkOutTime.trim(),
        workSummary: workSummary.trim(),
      });

      if (res?.success) {
        setSuccessMessage('Daily attendance successfully recorded and saved to database!');
        setWorkSummary('');
        await fetchAttendanceData();
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      const msg = err.message || err.response?.data?.error?.message || 'Failed to submit daily attendance.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (st) => {
    switch (st) {
      case ATTENDANCE_STATUSES.PRESENT:
        return 'success';
      case ATTENDANCE_STATUSES.REMOTE:
        return 'info';
      case ATTENDANCE_STATUSES.HALF_DAY:
        return 'warning';
      case ATTENDANCE_STATUSES.ABSENT:
        return 'danger';
      case ATTENDANCE_STATUSES.EXCUSED:
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intern Daily Attendance & Logging"
        description="Submit your daily check-in logs, track work summaries, and review monthly attendance percentage."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Daily Attendance' }]}
        badge={
          <StatusBadge
            status={summary.attendanceRate >= 80 ? 'healthy' : 'warning'}
            label={`${summary.attendanceRate}% ATTENDANCE RATE`}
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
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-rose-500 font-bold px-1 hover:text-rose-700">
              ×
            </button>
          </div>
          {(errorMessage.toLowerCase().includes('placement') || errorMessage.toLowerCase().includes('allocation')) && (
            <div className="pt-1 text-[11px] text-rose-700 dark:text-rose-300">
              <span>Looking for an internship placement? </span>
              <a
                href="/internships"
                className="underline font-bold text-burgundy-700 dark:text-champagne-300 hover:text-burgundy-900"
              >
                Browse verified openings in the Directory &rarr;
              </a>
            </div>
          )}
        </div>
      )}

      {/* Monthly Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500">Days Logged</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {summary.totalDays}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Present</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {summary.presentCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">Remote</span>
            <div className="text-xl font-black text-brand-600 dark:text-brand-400 mt-0.5">
              {summary.remoteCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Half Day</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {summary.halfDayCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Absent</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {summary.absentCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500">Attendance %</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {summary.attendanceRate}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Check-In Form (Left) & History Log (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Attendance Submission Card */}
        <div className="lg:col-span-1">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-500" />
                <span>Log Daily Attendance</span>
              </CardTitle>
              <CardDescription>
                Record your attendance for today or previous unrecorded workdays.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAttendanceSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    max={todayISO}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Work Arrangement / Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value={ATTENDANCE_STATUSES.PRESENT}>Present (On-Site / Office)</option>
                    <option value={ATTENDANCE_STATUSES.REMOTE}>Remote (Work From Home)</option>
                    <option value={ATTENDANCE_STATUSES.HALF_DAY}>Half Day</option>
                    <option value={ATTENDANCE_STATUSES.EXCUSED}>Excused / Authorized Leave</option>
                    <option value={ATTENDANCE_STATUSES.ABSENT}>Absent</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Check-In Time
                    </label>
                    <input
                      type="text"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      placeholder="e.g., 09:15 AM"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Check-Out Time
                    </label>
                    <input
                      type="text"
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                      placeholder="e.g., 05:30 PM"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Daily Accomplishments Summary
                  </label>
                  <textarea
                    value={workSummary}
                    onChange={(e) => setWorkSummary(e.target.value)}
                    placeholder="Briefly describe key tasks, tickets, or research completed today..."
                    rows={3}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  icon={Send}
                  isLoading={isSubmitting}
                  className="w-full justify-center font-semibold shadow-sm"
                >
                  Submit Daily Attendance
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Attendance Log Table (Right 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-brand-500" />
              <span>Attendance History</span>
            </h3>

            {/* Month & Year Selectors */}
            <div className="flex items-center gap-2 text-xs">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                {monthNames.map((m, idx) => (
                  <option key={idx} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <LoadingState message="Loading monthly attendance history..." />
          ) : records.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No Attendance Logs Found"
              description={`No attendance records found for ${monthNames[selectedMonth - 1]} ${selectedYear}. Log your daily activity using the form.`}
            />
          ) : (
            <div className="space-y-2.5">
              {records.map((rec) => (
                <div
                  key={rec._id}
                  className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {new Date(rec.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <StatusBadge
                        status={getStatusBadgeVariant(rec.status)}
                        label={rec.status.toUpperCase()}
                        size="sm"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Review:</span>
                      <StatusBadge
                        status={rec.reviewStatus === 'approved' ? 'healthy' : 'neutral'}
                        label={rec.reviewStatus.toUpperCase()}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Timing & Summary */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-[11px]">
                    {rec.checkInTime && (
                      <span>In: <strong className="text-slate-700 dark:text-slate-300">{rec.checkInTime}</strong></span>
                    )}
                    {rec.checkOutTime && (
                      <span>Out: <strong className="text-slate-700 dark:text-slate-300">{rec.checkOutTime}</strong></span>
                    )}
                  </div>

                  {rec.workSummary && (
                    <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg text-xs leading-relaxed">
                      {rec.workSummary}
                    </p>
                  )}

                  {/* Correction Notice if adjusted */}
                  {rec.correctionHistory?.length > 0 && (
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <span className="font-semibold">Mentor Correction Notice: </span>
                        <span>{rec.correctionHistory[0].reason}</span>
                        <span className="text-[10px] text-amber-600 block">
                          Adjusted by {rec.correctionHistory[0].correctedByName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAttendancePage;
