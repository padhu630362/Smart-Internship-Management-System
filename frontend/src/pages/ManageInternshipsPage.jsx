import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Archive,
  RefreshCw,
  Clock,
  DollarSign,
  MapPin,
  Users,
  Calendar,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import internshipService from '../services/internshipService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { Dropdown, DropdownItem, DropdownDivider } from '../components/common/Dropdown';

export const ManageInternshipsPage = () => {
  const { user } = useAuth();

  const [opportunities, setOpportunities] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    publishedCount: 0,
    draftCount: 0,
    closedCount: 0,
    archivedCount: 0,
    totalOpenings: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Opportunity Form State
  const defaultFormState = {
    title: '',
    description: '',
    workMode: 'on-site',
    location: '',
    openings: 1,
    duration: '3 Months',
    hasStipend: true,
    stipendAmount: 2000,
    currency: 'USD',
    periodicity: 'monthly',
    applicationDeadline: '',
    status: 'draft',
    requiredSkills: [],
    minCgpa: 0,
    allowedDepartments: '',
    allowedGraduationYears: '',
    otherRequirements: '',
  };

  const [form, setForm] = useState(defaultFormState);
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    fetchOpportunities(1);
  }, [statusFilter]);

  const fetchOpportunities = async (page = pagination.page) => {
    try {
      setLoading(true);
      setErrorMessage('');
      const params = {
        page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };

      const res = await internshipService.getCompanyInternships(params);
      if (res?.data) {
        setOpportunities(res.data.opportunities || []);
        setPagination(res.data.pagination);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to fetch internship opportunities.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOpportunities(1);
  };

  const handleOpenCreate = () => {
    // Default deadline to 30 days in future
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const defaultDateStr = d.toISOString().split('T')[0];

    setForm({
      ...defaultFormState,
      applicationDeadline: defaultDateStr,
    });
    setSkillInput('');
    setErrorMessage('');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (opp) => {
    setSelectedOpportunity(opp);
    const deadlineStr = opp.applicationDeadline
      ? new Date(opp.applicationDeadline).toISOString().split('T')[0]
      : '';

    setForm({
      title: opp.title || '',
      description: opp.description || '',
      workMode: opp.workMode || 'on-site',
      location: opp.location || '',
      openings: opp.openings || 1,
      duration: opp.duration || '3 Months',
      hasStipend: opp.stipend?.hasStipend ?? true,
      stipendAmount: opp.stipend?.amount ?? 0,
      currency: opp.stipend?.currency || 'USD',
      periodicity: opp.stipend?.periodicity || 'monthly',
      applicationDeadline: deadlineStr,
      status: opp.status || 'draft',
      requiredSkills: opp.requiredSkills || [],
      minCgpa: opp.eligibility?.minCgpa ?? 0,
      allowedDepartments: opp.eligibility?.allowedDepartments?.join(', ') || '',
      allowedGraduationYears: opp.eligibility?.allowedGraduationYears?.join(', ') || '',
      otherRequirements: opp.eligibility?.otherRequirements || '',
    });
    setSkillInput('');
    setErrorMessage('');
    setIsEditOpen(true);
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const trimmed = skillInput.trim();
    if (trimmed && !form.requiredSkills.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, trimmed],
      }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setForm((prev) => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter((s) => s !== skillToRemove),
    }));
  };

  const buildPayloadFromForm = () => {
    return {
      title: form.title,
      description: form.description,
      workMode: form.workMode,
      location: form.location,
      openings: Number(form.openings),
      duration: form.duration,
      stipend: {
        hasStipend: form.hasStipend,
        amount: Number(form.stipendAmount) || 0,
        currency: form.currency,
        periodicity: form.periodicity,
      },
      applicationDeadline: form.applicationDeadline,
      status: form.status,
      requiredSkills: form.requiredSkills,
      eligibility: {
        minCgpa: Number(form.minCgpa) || 0,
        allowedDepartments: form.allowedDepartments
          ? form.allowedDepartments.split(',').map((d) => d.trim()).filter(Boolean)
          : [],
        allowedGraduationYears: form.allowedGraduationYears
          ? form.allowedGraduationYears.split(',').map((y) => Number(y.trim())).filter(Boolean)
          : [],
        otherRequirements: form.otherRequirements,
      },
    };
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setErrorMessage('');
      const payload = buildPayloadFromForm();
      await internshipService.createInternship(payload);

      setSuccessMessage(`Opportunity '${form.title}' created successfully.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      setIsCreateOpen(false);
      fetchOpportunities(1);
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to create opportunity.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOpportunity) return;
    try {
      setActionLoading(true);
      setErrorMessage('');
      const payload = buildPayloadFromForm();
      await internshipService.updateInternship(selectedOpportunity._id, payload);

      setSuccessMessage(`Opportunity '${form.title}' updated successfully.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      setIsEditOpen(false);
      fetchOpportunities();
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to update opportunity.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (opp, targetStatus) => {
    try {
      setErrorMessage('');
      await internshipService.updateInternshipStatus(opp._id, targetStatus);
      setSuccessMessage(`Opportunity status set to '${targetStatus}'.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      fetchOpportunities();
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to update status.');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedOpportunity) return;
    try {
      setActionLoading(true);
      setErrorMessage('');
      await internshipService.deleteInternship(selectedOpportunity._id);

      setSuccessMessage('Opportunity deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
      setIsDeleteOpen(false);
      fetchOpportunities();
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to delete opportunity.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & New Opportunity Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Briefcase className="w-7 h-7 text-brand-600" />
            Internship Opportunity Governance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Publish postings, manage candidate opening counts, and configure academic eligibility criteria.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={handleOpenCreate}
          className="shadow-sm font-semibold"
        >
          Post New Opportunity
        </Button>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 font-medium">Total Opportunities</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.totalCount}
          </p>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-emerald-600 font-medium">Published & Active</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.publishedCount}
          </p>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-amber-600 font-medium">Draft Postings</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {stats.draftCount}
          </p>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 font-medium">Closed</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">
            {stats.closedCount}
          </p>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-indigo-600 font-medium">Archived</p>
          <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.archivedCount}
          </p>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-brand-600 font-medium">Total Openings</p>
          <p className="text-xl sm:text-2xl font-bold text-brand-600 dark:text-brand-400 mt-1">
            {stats.totalOpenings}
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Search & Status Toolbar */}
      <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search opportunity title, skills, location..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-slate-400"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-hidden focus:border-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={() => fetchOpportunities()}
            aria-label="Refresh opportunities"
          />
        </div>
      </div>

      {/* Opportunities Management Table */}
      <div className="surface-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16">
            <LoadingState message="Loading internship opportunities..." />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={Briefcase}
              title="No internship opportunities found"
              description="Get started by posting your first internship opening or adjusting filters."
              action={
                <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreate}>
                  Post New Opportunity
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Opportunity</th>
                  <th className="px-6 py-3.5">Mode</th>
                  <th className="px-6 py-3.5">Openings</th>
                  <th className="px-6 py-3.5">Stipend</th>
                  <th className="px-6 py-3.5">Deadline</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {opportunities.map((opp) => (
                  <tr
                    key={opp._id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-850/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                          {opp.title}
                        </p>
                        <p className="text-xs text-slate-400 truncate max-w-xs flex items-center gap-1.5 mt-0.5">
                          <span>{opp.companyName}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            {opp.location}
                          </span>
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {opp.workMode}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {opp.openings}
                    </td>

                    <td className="px-6 py-4 text-xs">
                      {opp.stipend?.hasStipend && opp.stipend?.amount > 0 ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {opp.stipend.currency} {opp.stipend.amount} / {opp.stipend.periodicity || 'mo'}
                        </span>
                      ) : (
                        <span className="text-slate-400">Academic Credit</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {opp.applicationDeadline
                        ? new Date(opp.applicationDeadline).toLocaleDateString()
                        : '—'}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge
                        status={
                          opp.status === 'published'
                            ? 'healthy'
                            : opp.status === 'draft'
                            ? 'warning'
                            : 'error'
                        }
                        label={opp.status.toUpperCase()}
                        size="sm"
                      />
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Dropdown
                        align="right"
                        width="w-48"
                        trigger={
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label={`Actions for ${opp.title}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        }
                      >
                        <DropdownItem
                          icon={Edit2}
                          onClick={() => handleOpenEdit(opp)}
                        >
                          Edit Details
                        </DropdownItem>

                        {opp.status !== 'published' && (
                          <DropdownItem
                            icon={CheckCircle2}
                            onClick={() => handleStatusChange(opp, 'published')}
                          >
                            Publish Opportunity
                          </DropdownItem>
                        )}

                        {opp.status === 'published' && (
                          <DropdownItem
                            icon={XCircle}
                            onClick={() => handleStatusChange(opp, 'closed')}
                          >
                            Close Opportunity
                          </DropdownItem>
                        )}

                        {opp.status !== 'archived' && (
                          <DropdownItem
                            icon={Archive}
                            onClick={() => handleStatusChange(opp, 'archived')}
                          >
                            Archive
                          </DropdownItem>
                        )}

                        <DropdownDivider />

                        <DropdownItem
                          icon={Trash2}
                          danger
                          onClick={() => {
                            setSelectedOpportunity(opp);
                            setIsDeleteOpen(true);
                          }}
                        >
                          Delete
                        </DropdownItem>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && pagination.total > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/30 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {pagination.total}
              </span>{' '}
              postings
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                icon={ChevronLeft}
                disabled={pagination.page <= 1}
                onClick={() => fetchOpportunities(pagination.page - 1)}
              >
                Previous
              </Button>
              <span className="px-2 font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                icon={ChevronRight}
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchOpportunities(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Opportunity Modal */}
      <Modal
        isOpen={isCreateOpen || isEditOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setIsEditOpen(false);
        }}
        title={isEditOpen ? 'Edit Opportunity' : 'Post New Internship Opportunity'}
        subtitle="Configure position details, compensation, opening count, and academic requirements"
        size="lg"
      >
        <form
          onSubmit={isEditOpen ? handleEditSubmit : handleCreateSubmit}
          className="space-y-4 max-h-[75vh] overflow-y-auto px-1"
        >
          <Input
            label="Position Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            placeholder="e.g. Cloud Infrastructure Engineering Intern"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Comprehensive Role Description
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              minLength={20}
              placeholder="Outline project milestones, key duties, and technologies used..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Work Arrangement
              </label>
              <select
                value={form.workMode}
                onChange={(e) => setForm({ ...form, workMode: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
              >
                <option value="on-site">On-Site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            <Input
              label="Location / Office City"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. San Francisco, CA"
            />

            <Input
              label="Openings Count"
              type="number"
              min="1"
              value={form.openings}
              onChange={(e) => setForm({ ...form, openings: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Expected Duration"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              placeholder="e.g. 3 Months"
            />

            <Input
              label="Application Closing Deadline"
              type="date"
              value={form.applicationDeadline}
              onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
              >
                <option value="draft">Save as Draft</option>
                <option value="published">Publish Immediately</option>
                {isEditOpen && <option value="closed">Closed</option>}
                {isEditOpen && <option value="archived">Archived</option>}
              </select>
            </div>
          </div>

          {/* Stipend Row */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasStipend"
                checked={form.hasStipend}
                onChange={(e) => setForm({ ...form, hasStipend: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="hasStipend" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Provides Paid Financial Stipend
              </label>
            </div>

            {form.hasStipend && (
              <div className="grid grid-cols-3 gap-3 pt-1">
                <Input
                  label="Amount"
                  type="number"
                  min="0"
                  value={form.stipendAmount}
                  onChange={(e) => setForm({ ...form, stipendAmount: e.target.value })}
                />
                <Input
                  label="Currency"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Frequency
                  </label>
                  <select
                    value={form.periodicity}
                    onChange={(e) => setForm({ ...form, periodicity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="lump-sum">Lump-Sum</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Skills Tag Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Required Technical Skills & Competencies
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill(e);
                  }
                }}
                placeholder="Type skill and press Enter"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddSkill}>
                Add Skill
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2 min-h-[32px]">
              {form.requiredSkills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200/50"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-brand-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Academic Eligibility */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Academic Eligibility Restrictions
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Min CGPA (0.0 to 10.0)"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={form.minCgpa}
                onChange={(e) => setForm({ ...form, minCgpa: e.target.value })}
              />

              <Input
                label="Allowed Departments"
                value={form.allowedDepartments}
                onChange={(e) => setForm({ ...form, allowedDepartments: e.target.value })}
                placeholder="e.g. Computer Science, IT"
              />

              <Input
                label="Target Graduation Years"
                value={form.allowedGraduationYears}
                onChange={(e) => setForm({ ...form, allowedGraduationYears: e.target.value })}
                placeholder="e.g. 2026, 2027"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={actionLoading}
            >
              {isEditOpen ? 'Save Changes' : 'Create Opportunity'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Opportunity Deletion"
        subtitle="This action will permanently delete the posting"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to permanently remove opportunity{' '}
            <strong className="text-slate-900 dark:text-white">{selectedOpportunity?.title}</strong>?
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              loading={actionLoading}
              onClick={handleDeleteSubmit}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageInternshipsPage;
