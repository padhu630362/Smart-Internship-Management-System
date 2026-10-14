import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  UserCheck,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  ExternalLink,
  ShieldCheck,
  Ban,
  Check,
} from 'lucide-react';
import allocationService, { ALLOCATION_STATUSES } from '../services/allocationService';
import internshipService from '../services/internshipService';
import userService from '../services/userService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { Card, CardContent } from '../components/common/Card';

export const ManageAllocationsPage = () => {
  const [allocations, setAllocations] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [students, setStudents] = useState([]);
  const [mentors, setMentors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Allocate Modal
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [allocateForm, setAllocateForm] = useState({
    studentId: '',
    internshipId: '',
    mentorId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString().slice(0, 10),
    notes: '',
  });
  const [isAllocating, setIsAllocating] = useState(false);

  // Status Change Modal
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState(ALLOCATION_STATUSES.COMPLETED);
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAllocations();
  }, [selectedStatus]);

  const fetchInitialData = async () => {
    try {
      const [oppsRes, usersRes] = await Promise.all([
        internshipService.getCompanyInternships({ limit: 100 }),
        userService.getUsers({ limit: 100 }),
      ]);

      if (oppsRes?.data?.opportunities) {
        setOpportunities(oppsRes.data.opportunities);
      }
      if (usersRes?.data?.users) {
        setStudents(usersRes.data.users.filter((u) => u.role === 'student'));
        setMentors(usersRes.data.users.filter((u) => ['mentor', 'company'].includes(u.role)));
      }
    } catch (err) {
      console.warn('Could not load prerequisite allocation options:', err);
    }
  };

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const params = {
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        limit: 50,
      };

      const res = await allocationService.getAllocations(params);
      if (res?.data?.allocations) {
        setAllocations(res.data.allocations);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to retrieve internship allocations.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAllocateModal = () => {
    setAllocateForm({
      studentId: students[0]?._id || '',
      internshipId: opportunities[0]?._id || '',
      mentorId: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString().slice(0, 10),
      notes: '',
    });
    setErrorMessage('');
    setIsAllocateModalOpen(true);
  };

  const handleCreateAllocationSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsAllocating(true);
      setErrorMessage('');

      const res = await allocationService.createAllocation({
        studentId: allocateForm.studentId,
        internshipId: allocateForm.internshipId,
        mentorId: allocateForm.mentorId || undefined,
        startDate: allocateForm.startDate,
        endDate: allocateForm.endDate,
        notes: allocateForm.notes.trim(),
      });

      if (res?.success) {
        setSuccessMessage('Student officially assigned and allocated to internship!');
        setIsAllocateModalOpen(false);
        fetchAllocations();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to create internship allocation.'
      );
    } finally {
      setIsAllocating(false);
    }
  };

  const handleOpenStatusModal = (allocation) => {
    setSelectedAllocation(allocation);
    setTargetStatus(ALLOCATION_STATUSES.COMPLETED);
    setStatusNote('');
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAllocation) return;

    try {
      setIsUpdatingStatus(true);
      setErrorMessage('');

      const res = await allocationService.updateAllocationStatus(selectedAllocation._id, {
        status: targetStatus,
        note: statusNote.trim(),
      });

      if (res?.success) {
        setSuccessMessage(`Allocation marked as '${targetStatus}'.`);
        setIsStatusModalOpen(false);
        fetchAllocations();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to update allocation status.'
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const activeCount = allocations.filter((a) => a.status === ALLOCATION_STATUSES.ACTIVE).length;
  const completedCount = allocations.filter((a) => a.status === ALLOCATION_STATUSES.COMPLETED).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internship Placement & Allocation Hub"
        description="Assign selected candidates to active opportunities, configure mentor supervision, and track internship lifecycle duration."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Intern Allocations' }]}
        badge={
          <StatusBadge
            status="healthy"
            label={`${activeCount} ACTIVE PLACEMENTS`}
            size="sm"
          />
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleOpenAllocateModal}
            className="font-semibold shadow-2xs"
          >
            Assign Candidate to Internship
          </Button>
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

      {/* Summary KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="shadow-2xs border-l-4 border-l-brand-500">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500">Active Allocations</span>
            <div className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">
              {activeCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500">Completed Terms</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {completedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border-l-4 border-l-slate-400">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500">Total Placements</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {allocations.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
        {['all', ALLOCATION_STATUSES.ACTIVE, ALLOCATION_STATUSES.COMPLETED, ALLOCATION_STATUSES.TERMINATED].map(
          (st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
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

      {/* Allocations List */}
      {loading ? (
        <LoadingState message="Loading placed intern allocations..." />
      ) : allocations.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Allocations Found"
          description="Use the 'Assign Candidate to Internship' button to place selected students into your opportunities."
        />
      ) : (
        <div className="space-y-3">
          {allocations.map((alc) => (
            <div
              key={alc._id}
              className="surface-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-brand-300 dark:hover:border-brand-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={alc.status === 'active' ? 'healthy' : 'neutral'}
                    label={alc.status.toUpperCase()}
                    size="sm"
                  />
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(alc.startDate).toLocaleDateString()} —{' '}
                    {new Date(alc.endDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-brand text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {alc.student?.name?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {alc.student?.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">{alc.student?.email}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  <span>
                    Opportunity: <strong>{alc.internship?.title}</strong>
                  </span>
                  {alc.mentor && (
                    <span>
                      Supervising Mentor: <strong>{alc.mentor?.name}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Status transition action */}
              <div className="shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                {alc.status === ALLOCATION_STATUSES.ACTIVE && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Check}
                    onClick={() => handleOpenStatusModal(alc)}
                    className="text-xs"
                  >
                    Update Term Status
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Allocate Candidate Modal */}
      <Modal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        title="Assign Candidate to Internship"
        subtitle="Places candidate into an active allocation term. Prevents conflicting active allocations."
        size="md"
      >
        <form onSubmit={handleCreateAllocationSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Candidate <span className="text-rose-500">*</span>
            </label>
            <select
              value={allocateForm.studentId}
              onChange={(e) => setAllocateForm({ ...allocateForm, studentId: e.target.value })}
              required
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            >
              {students.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.name} ({st.email}) - {st.profile?.studentDetails?.department || 'Student'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internship Position <span className="text-rose-500">*</span>
            </label>
            <select
              value={allocateForm.internshipId}
              onChange={(e) => setAllocateForm({ ...allocateForm, internshipId: e.target.value })}
              required
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            >
              {opportunities.map((opp) => (
                <option key={opp._id} value={opp._id}>
                  {opp.title} ({opp.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assigned Mentor (Optional)
            </label>
            <select
              value={allocateForm.mentorId}
              onChange={(e) => setAllocateForm({ ...allocateForm, mentorId: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            >
              <option value="">No dedicated mentor assigned yet</option>
              {mentors.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.email}) - {m.role}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={allocateForm.startDate}
                onChange={(e) => setAllocateForm({ ...allocateForm, startDate: e.target.value })}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={allocateForm.endDate}
                onChange={(e) => setAllocateForm({ ...allocateForm, endDate: e.target.value })}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Allocation Remarks
            </label>
            <textarea
              value={allocateForm.notes}
              onChange={(e) => setAllocateForm({ ...allocateForm, notes: e.target.value })}
              placeholder="e.g., Campus recruitment drive batch, university MoU placement"
              rows={2}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAllocateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={UserCheck}
              loading={isAllocating}
            >
              Confirm Allocation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Term Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Internship Allocation Term"
        subtitle={selectedAllocation?.student?.name}
        size="md"
      >
        <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Status
            </label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            >
              <option value={ALLOCATION_STATUSES.COMPLETED}>Completed (Successful Term)</option>
              <option value={ALLOCATION_STATUSES.TERMINATED}>Terminated (Premature Exit)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Audit Note / Rationale
            </label>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Enter remarks for regulatory completion records..."
              rows={3}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isUpdatingStatus}
            >
              Save Status Transition
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ManageAllocationsPage;
