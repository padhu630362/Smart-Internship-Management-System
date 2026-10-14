import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  Calendar,
  Building2,
  Users,
  GraduationCap,
  Briefcase,
  FileCheck2,
  Award,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import reportService from '../services/reportService';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import StatusBadge from '../components/common/StatusBadge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';

export const ReportsPage = () => {
  const { user } = useAuth();

  // Filter States
  const [reportType, setReportType] = useState('applications'); // 'applications' | 'allocations' | 'internships' | 'evaluations'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  // Data States
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        type: reportType,
        page,
        limit: 25,
      };

      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (department !== 'all') params.department = department;
      if (status !== 'all') params.status = status;

      const res = await reportService.getReportData(params);
      if (res?.data) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError(err?.response?.data?.error?.message || 'Failed to generate report dataset.');
    } finally {
      setLoading(false);
    }
  }, [reportType, startDate, endDate, department, status, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Handle CSV Download
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = {
        type: reportType,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (department !== 'all') params.department = department;
      if (status !== 'all') params.status = status;

      await reportService.downloadReportCSV(params);
    } catch (err) {
      alert(err?.response?.data?.error?.message || 'Failed to export CSV report.');
    } finally {
      setExporting(false);
    }
  };

  const records = reportData?.records || [];
  const pagination = reportData?.pagination || { total: 0, totalPages: 1 };
  const summary = reportData?.summary || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Institutional Analytics & Reports"
        description="Filter verified institutional datasets and download auditable CSV spreadsheets."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Reports' }]}
        badge={<StatusBadge status="healthy" label="AUDITED DATA" size="sm" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchReports}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              icon={exporting ? Loader2 : Download}
              onClick={handleExportCSV}
              disabled={exporting || loading || records.length === 0}
              className={exporting ? 'opacity-70' : ''}
            >
              {exporting ? 'Generating CSV...' : 'Export CSV'}
            </Button>
          </div>
        }
      />

      {/* Report Type Selector Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
        {[
          { id: 'applications', label: 'Applications Pipeline', icon: FileCheck2 },
          { id: 'allocations', label: 'Student Placements', icon: Users },
          { id: 'internships', label: 'Internship Opportunities', icon: Briefcase },
          { id: 'evaluations', label: 'Academic Appraisals', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setReportType(tab.id);
                setPage(1);
                setStatus('all');
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-brand-500 text-slate-900 dark:text-white outline-hidden"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-brand-500 text-slate-900 dark:text-white outline-hidden"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-brand-500 text-slate-900 dark:text-white outline-hidden"
              >
                <option value="all">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electrical Engineering">Electrical Engineering</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Status Filter
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-brand-500 text-slate-900 dark:text-white outline-hidden"
              >
                <option value="all">All Statuses</option>
                {reportType === 'applications' && (
                  <>
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="selected">Selected</option>
                    <option value="rejected">Rejected</option>
                  </>
                )}
                {reportType === 'allocations' && (
                  <>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="terminated">Terminated</option>
                  </>
                )}
                {reportType === 'internships' && (
                  <>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="closed">Closed</option>
                  </>
                )}
                {reportType === 'evaluations' && (
                  <>
                    <option value="mid_term">Mid-Term Only</option>
                    <option value="final">Final Only</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI Strip for Current Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Total Matched Records</p>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {pagination.total || 0}
              </h4>
            </div>
            <FileSpreadsheet className="w-8 h-8 text-brand-500 opacity-60" />
          </CardContent>
        </Card>

        {reportType === 'applications' && (
          <>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">Selected Candidates</p>
                  <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {summary.selectedCount || 0}
                  </h4>
                </div>
                <Users className="w-8 h-8 text-emerald-500 opacity-60" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">Under Review</p>
                  <h4 className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                    {summary.underReviewCount || 0}
                  </h4>
                </div>
                <Briefcase className="w-8 h-8 text-blue-500 opacity-60" />
              </CardContent>
            </Card>
          </>
        )}

        {reportType === 'allocations' && (
          <>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">Active Internships</p>
                  <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {summary.activeCount || 0}
                  </h4>
                </div>
                <Users className="w-8 h-8 text-emerald-500 opacity-60" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">Completed Term</p>
                  <h4 className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                    {summary.completedCount || 0}
                  </h4>
                </div>
                <Award className="w-8 h-8 text-purple-500 opacity-60" />
              </CardContent>
            </Card>
          </>
        )}

        {reportType === 'evaluations' && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase">Average Rating Score</p>
                <h4 className="text-xl font-black text-amber-500 mt-0.5">
                  {summary.averageOverallRating || 0} / 5.0
                </h4>
              </div>
              <Award className="w-8 h-8 text-amber-500 opacity-60" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Data Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-bold capitalize">
              {reportType} Dataset
            </CardTitle>
            <CardDescription className="text-xs">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              <span>Querying institutional records...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs">
              No matching records found for the selected filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                  {reportType === 'applications' && (
                    <tr>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Opportunity</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Applied</th>
                    </tr>
                  )}
                  {reportType === 'allocations' && (
                    <tr>
                      <th className="p-3">Intern</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Internship</th>
                      <th className="p-3">Mentor</th>
                      <th className="p-3">Dates</th>
                      <th className="p-3">Status</th>
                    </tr>
                  )}
                  {reportType === 'internships' && (
                    <tr>
                      <th className="p-3">Opportunity</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Mode</th>
                      <th className="p-3">Openings</th>
                      <th className="p-3">Deadline</th>
                      <th className="p-3">Status</th>
                    </tr>
                  )}
                  {reportType === 'evaluations' && (
                    <tr>
                      <th className="p-3">Student</th>
                      <th className="p-3">Evaluator</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Rating</th>
                      <th className="p-3">Recommendation</th>
                      <th className="p-3">Submitted</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reportType === 'applications' &&
                    records.map((app) => (
                      <tr key={app._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                        <td className="p-3">
                          <p className="font-bold text-slate-900 dark:text-white">{app.student?.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{app.student?.email}</p>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {app.student?.profile?.studentDetails?.department || 'N/A'}
                        </td>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          {app.internship?.title}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {app.internship?.companyName || 'Company'}
                        </td>
                        <td className="p-3">
                          <StatusBadge status="healthy" label={app.status.replace('_', ' ')} size="sm" />
                        </td>
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {app.createdAt ? new Date(app.createdAt).toISOString().split('T')[0] : 'N/A'}
                        </td>
                      </tr>
                    ))}

                  {reportType === 'allocations' &&
                    records.map((alloc) => (
                      <tr key={alloc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                        <td className="p-3">
                          <p className="font-bold text-slate-900 dark:text-white">{alloc.student?.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{alloc.student?.email}</p>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {alloc.student?.profile?.studentDetails?.department || 'N/A'}
                        </td>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          {alloc.internship?.title}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {alloc.mentor?.name || 'Unassigned'}
                        </td>
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {alloc.startDate ? new Date(alloc.startDate).toISOString().split('T')[0] : ''} -{' '}
                          {alloc.endDate ? new Date(alloc.endDate).toISOString().split('T')[0] : ''}
                        </td>
                        <td className="p-3">
                          <StatusBadge status="healthy" label={alloc.status} size="sm" />
                        </td>
                      </tr>
                    ))}

                  {reportType === 'internships' &&
                    records.map((opp) => (
                      <tr key={opp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{opp.title}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{opp.companyName}</td>
                        <td className="p-3 capitalize">{opp.workMode}</td>
                        <td className="p-3 font-mono">{opp.openings}</td>
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {opp.applicationDeadline ? new Date(opp.applicationDeadline).toISOString().split('T')[0] : ''}
                        </td>
                        <td className="p-3">
                          <StatusBadge status="healthy" label={opp.status} size="sm" />
                        </td>
                      </tr>
                    ))}

                  {reportType === 'evaluations' &&
                    records.map((ev) => (
                      <tr key={ev._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{ev.student?.name}</td>
                        <td className="p-3">
                          {ev.evaluator?.name} ({ev.evaluator?.role})
                        </td>
                        <td className="p-3 uppercase text-[10px] font-bold">
                          {ev.evaluationType.replace('_', ' ')}
                        </td>
                        <td className="p-3 font-black text-amber-500">
                          {ev.ratings?.overallRating} / 5
                        </td>
                        <td className="p-3 capitalize">
                          {ev.recommendation?.replace('_', ' ')}
                        </td>
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {ev.submittedAt ? new Date(ev.submittedAt).toISOString().split('T')[0] : ''}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
