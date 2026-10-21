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
  Award,
  Mail,
  Sparkles,
  Download,
  Eye,
  Send,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import allocationService, { ALLOCATION_STATUSES } from '../services/allocationService';
import internshipService from '../services/internshipService';
import userService from '../services/userService';
import certificateService from '../services/certificateService';
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

  const { token } = useAuth();

  // Completion Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('approved');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewDeliveryEmail, setReviewDeliveryEmail] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Certificate Preview & Issue Modal State
  const [isCertPreviewModalOpen, setIsCertPreviewModalOpen] = useState(false);
  const [certPreview, setCertPreview] = useState(null);
  const [targetDeliveryEmail, setTargetDeliveryEmail] = useState('');
  const [isIssuingCert, setIsIssuingCert] = useState(false);
  const [issuedCertResult, setIssuedCertResult] = useState(null);

  // Status Change Modal
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState(ALLOCATION_STATUSES.COMPLETED);
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

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

  const handleSeedDemoAllocations = async () => {
    try {
      setIsSeeding(true);
      setErrorMessage('');
      const res = await allocationService.seedDemo();
      if (res?.success) {
        setSuccessMessage(res.message || 'Demo interns and allocations loaded successfully!');
        await fetchInitialData();
        await fetchAllocations();
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || err.response?.data?.message || 'Failed to seed demo allocations.'
      );
    } finally {
      setIsSeeding(false);
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
        if (targetStatus === ALLOCATION_STATUSES.COMPLETED && res.data?.certificate) {
          const emailSent = res.data?.emailDelivery?.sent;
          setSuccessMessage(
            emailSent
              ? `Allocation completed! Certificate #${res.data.certificate.certificateNumber} generated & delivered to student email.`
              : `Allocation completed! Certificate generated (email queued/pending retry).`
          );
        } else {
          setSuccessMessage(`Allocation marked as '${targetStatus}'.`);
        }
        setIsStatusModalOpen(false);
        fetchAllocations();
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.response?.data?.error?.message || 'Failed to update allocation status.'
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleIssueOrResendCertificate = async (alc) => {
    try {
      setSuccessMessage('');
      setErrorMessage('');
      const res = await certificateService.issueAllocationCertificate(alc._id);
      if (res?.success) {
        setSuccessMessage(
          res.data?.emailDelivery?.sent
            ? `Certificate officially issued & delivered to ${alc.student?.email}!`
            : `Certificate processed! Email delivery status: ${res.data?.emailDelivery?.error || 'queued'}`
        );
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.response?.data?.error?.message || 'Failed to process certificate.'
      );
    }
  };

  const handleOpenReviewModal = async (alc) => {
    setSelectedAllocation(alc);
    setReviewDecision('approved');
    setReviewFeedback('');
    setReviewDeliveryEmail(alc.completionRequest?.preferredDeliveryEmail || alc.student?.email || '');
    setEligibilityData(null);
    setIsReviewModalOpen(true);

    try {
      const res = await allocationService.getCompletionEligibility(alc._id);
      if (res?.data) {
        setEligibilityData(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch completion eligibility:', err);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAllocation) return;

    try {
      setIsSubmittingReview(true);
      setErrorMessage('');

      const res = await allocationService.reviewCompletion(selectedAllocation._id, {
        decision: reviewDecision,
        feedback: reviewFeedback.trim(),
        deliveryEmail: reviewDeliveryEmail.trim(),
      });

      if (res?.success) {
        setSuccessMessage(
          reviewDecision === 'approved'
            ? 'Completion approved! You may now preview and issue the certificate.'
            : 'Revisions requested from the student.'
        );
        setIsReviewModalOpen(false);
        fetchAllocations();

        // If approved, automatically transition to Certificate Preview
        if (reviewDecision === 'approved') {
          handleOpenCertPreviewModal(selectedAllocation, reviewDeliveryEmail);
        }
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to submit completion review.'
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleOpenCertPreviewModal = async (alc, preferredEmail) => {
    setSelectedAllocation(alc);
    setCertPreview(null);
    setIssuedCertResult(null);
    setTargetDeliveryEmail(preferredEmail || alc.completionRequest?.preferredDeliveryEmail || alc.student?.email || '');
    setIsCertPreviewModalOpen(true);

    try {
      const res = await certificateService.getCertificatePreview(alc._id);
      if (res?.data) {
        setCertPreview(res.data);
        if (res.data.preferredDeliveryEmail) {
          setTargetDeliveryEmail(res.data.preferredDeliveryEmail);
        }
      }
    } catch (err) {
      console.warn('Failed to load certificate preview:', err);
    }
  };

  const handleConfirmIssueCertificate = async () => {
    if (!selectedAllocation) return;

    try {
      setIsIssuingCert(true);
      setErrorMessage('');

      const res = await certificateService.issueAllocationCertificate(selectedAllocation._id, {
        deliveryEmail: targetDeliveryEmail.trim(),
      });

      if (res?.success) {
        setIssuedCertResult(res.data);
        setSuccessMessage(
          res.data?.emailDelivery?.sent
            ? `Official certificate generated and emailed to ${targetDeliveryEmail}!`
            : `Certificate generated! Email delivery queued/pending retry.`
        );
        fetchAllocations();
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to issue certificate.'
      );
    } finally {
      setIsIssuingCert(false);
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Sparkles}
              loading={isSeeding}
              onClick={handleSeedDemoAllocations}
              className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-bold"
              title="Quickly populate demo interns & internships for certificate testing"
            >
              Seed Demo Interns
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={handleOpenAllocateModal}
              className="font-semibold shadow-2xs"
            >
              Assign Candidate to Internship
            </Button>
          </div>
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
          description="Use the 'Assign Candidate to Internship' button or click below to quickly load demo interns."
          action={
            <Button
              variant="primary"
              size="sm"
              icon={Sparkles}
              loading={isSeeding}
              onClick={handleSeedDemoAllocations}
              className="text-xs font-bold mt-2"
            >
              Seed Demo Interns & Allocations
            </Button>
          }
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
                  {alc.isDemo && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <Sparkles className="w-3 h-3" />
                      DEMO
                    </span>
                  )}
                  {alc.completionRequest?.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                      <Clock className="w-3.5 h-3.5" />
                      COMPLETION REQUESTED
                    </span>
                  )}
                  {alc.completionRequest?.status === 'approved' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      COMPLETION APPROVED
                    </span>
                  )}
                  {alc.completionRequest?.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      <AlertCircle className="w-3 h-3" />
                      REVISIONS REQUESTED
                    </span>
                  )}
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

                {alc.completionRequest?.studentNotes && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 italic">
                    Student Submission Note: "{alc.completionRequest.studentNotes}"
                  </p>
                )}
              </div>

              {/* Status and Action Buttons */}
              <div className="shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                {/* Review Completion Action */}
                {alc.completionRequest?.status === 'pending' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircle2}
                    onClick={() => handleOpenReviewModal(alc)}
                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                  >
                    Review Completion
                  </Button>
                )}

                {/* Preview & Issue Certificate Action */}
                <Button
                  variant="outline"
                  size="sm"
                  icon={Award}
                  onClick={() => handleOpenCertPreviewModal(alc)}
                  className="text-xs font-semibold text-primary-600 dark:text-primary-400 border-primary-500/30 hover:bg-primary-50 dark:hover:bg-primary-950/40"
                  title="Preview certificate layout & confirm delivery recipient"
                >
                  Preview & Issue Certificate
                </Button>

                {alc.status === ALLOCATION_STATUSES.ACTIVE && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Check}
                    onClick={() => handleOpenStatusModal(alc)}
                    className="text-xs text-slate-600 dark:text-slate-400"
                  >
                    Update Term
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

      {/* Completion Review Modal */}
      {selectedAllocation && (
        <Modal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          title="Review Internship Completion Request"
          subtitle="Verify task completion requirements and candidate deliverables before official certificate generation."
          size="lg"
        >
          <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
            {/* Student & Opportunity Info */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedAllocation.student?.name}
                </p>
                <p className="text-slate-500 font-mono">{selectedAllocation.student?.email}</p>
                <p className="text-slate-700 dark:text-slate-300 pt-1">
                  Internship: <strong>{selectedAllocation.internship?.title}</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  COMPLETION PENDING
                </span>
                {selectedAllocation.completionRequest?.requestedAt && (
                  <p className="text-[10px] text-slate-400 pt-1">
                    Requested: {new Date(selectedAllocation.completionRequest.requestedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Student Notes */}
            {selectedAllocation.completionRequest?.studentNotes && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <span className="font-semibold block text-[11px] uppercase text-slate-400">Student Submission Remarks:</span>
                <p className="italic pt-0.5">"{selectedAllocation.completionRequest.studentNotes}"</p>
              </div>
            )}

            {/* Requirements & Tasks Checklist */}
            <div className="space-y-2">
              <label className="font-semibold uppercase text-slate-500 block text-[11px]">
                Milestone Tasks Verification:
              </label>
              {eligibilityData ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>
                      Completed Tasks: <strong>{eligibilityData.completedTasks}</strong> / {eligibilityData.totalTasks}
                    </span>
                    {eligibilityData.eligible ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> All Mandatory Tasks Approved
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {eligibilityData.pendingTasks?.length || 0} Tasks Pending
                      </span>
                    )}
                  </div>

                  {eligibilityData.pendingTasks && eligibilityData.pendingTasks.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                      <p className="text-[11px] font-semibold text-rose-500">Pending or Incomplete Tasks:</p>
                      {eligibilityData.pendingTasks.map((pt) => (
                        <div key={pt._id} className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                          <span>• {pt.title}</span>
                          <span className="font-mono uppercase text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {pt.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 text-xs">
                  Checking task criteria...
                </div>
              )}
            </div>

            {/* Decision Radio */}
            <div className="space-y-1">
              <label className="font-semibold uppercase text-slate-500 block text-[11px]">
                Mentor Decision <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer font-semibold ${
                  reviewDecision === 'approved'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}>
                  <input
                    type="radio"
                    name="reviewDecision"
                    value="approved"
                    checked={reviewDecision === 'approved'}
                    onChange={(e) => setReviewDecision(e.target.value)}
                    className="text-emerald-600"
                  />
                  <span>Approve Completion</span>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer font-semibold ${
                  reviewDecision === 'rejected'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}>
                  <input
                    type="radio"
                    name="reviewDecision"
                    value="rejected"
                    checked={reviewDecision === 'rejected'}
                    onChange={(e) => setReviewDecision(e.target.value)}
                    className="text-rose-600"
                  />
                  <span>Request Revisions</span>
                </label>
              </div>
            </div>

            {/* Preferred Delivery Email Input */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Certificate Delivery Email Address:
              </label>
              <input
                type="email"
                value={reviewDeliveryEmail}
                onChange={(e) => setReviewDeliveryEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono"
              />
              <p className="text-[10px] text-slate-400 pt-1">
                Student's selected delivery address. Can be changed if student requested dispatch to another verified email.
              </p>
            </div>

            {/* Feedback / Rationale */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mentor Feedback / Instructions:
              </label>
              <textarea
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder={reviewDecision === 'approved' ? 'Outstanding work throughout the internship!' : 'Please resubmit Task 3 with test coverage...'}
                rows={2}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReviewModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isSubmittingReview}
              >
                {reviewDecision === 'approved' ? 'Approve & Proceed to Certificate' : 'Send Revisions Request'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Certificate Preview & Issuance Modal */}
      {selectedAllocation && (
        <Modal
          isOpen={isCertPreviewModalOpen}
          onClose={() => setIsCertPreviewModalOpen(false)}
          title="Mentor Certificate Issuance Hub"
          subtitle="Preview generated institutional completion credential and execute official issuance."
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {issuedCertResult ? (
              /* Success / Result View */
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Certificate Successfully Issued!
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                    ID: {issuedCertResult.certificate?.certificateNumber} · Code: {issuedCertResult.certificate?.verificationCode}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium pt-1">
                    {issuedCertResult.emailDelivery?.sent
                      ? `Delivered to student at: ${targetDeliveryEmail}`
                      : 'Delivery recorded (SMTP dispatch simulated/queued for audit).'}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <a
                    href={certificateService.getCertificateDownloadUrl(issuedCertResult.certificate?._id, token, true)}
                    download
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Official PDF
                  </a>

                  <a
                    href={`/verify-certificate/${issuedCertResult.certificate?.verificationCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Public Verification Page
                  </a>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCertPreviewModalOpen(false);
                      setIssuedCertResult(null);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              /* Preview Mode */
              <>
                {/* Certificate Preview Card */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white border border-slate-800 shadow-xl relative overflow-hidden space-y-4">
                  {/* Demo Watermark if demo */}
                  {(selectedAllocation.isDemo || certPreview?.isDemo) && (
                    <div className="bg-amber-500/20 text-amber-300 text-[10px] font-bold text-center py-1 rounded-md border border-amber-500/40 uppercase tracking-widest">
                      ★ DEMONSTRATION / SAMPLE CREDENTIAL — NOT AN OFFICIAL RECORD ★
                    </div>
                  )}

                  <div className="text-center space-y-1">
                    <p className="text-[10px] tracking-widest text-primary-400 uppercase font-semibold">
                      Institutional Credential Preview
                    </p>
                    <h3 className="text-lg font-bold tracking-tight text-white uppercase">
                      Certificate of Internship Completion
                    </h3>
                  </div>

                  <div className="text-center py-3 space-y-1.5 border-y border-slate-800">
                    <p className="text-xs text-slate-400">This certifies that</p>
                    <p className="text-xl font-extrabold text-amber-300 tracking-wide">
                      {certPreview?.studentName || selectedAllocation.student?.name}
                    </p>
                    <p className="text-xs text-slate-300 max-w-md mx-auto pt-1">
                      has successfully satisfied all milestone deliverables and performance requirements for the
                    </p>
                    <p className="text-sm font-bold text-white pt-1">
                      "{certPreview?.internshipTitle || selectedAllocation.internship?.title}"
                    </p>
                    <p className="text-xs text-primary-300">
                      Host Organization: {certPreview?.companyName || selectedAllocation.company?.name || 'NovaTech Demo Labs'}
                    </p>
                    {/* Dedicated Internship Tenure Dates Banner */}
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-bold">
                      <span>INTERNSHIP TENURE:</span>
                      <span>
                        {new Date(selectedAllocation.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                        {' TO '}
                        {new Date(selectedAllocation.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* 4 Details verification pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Verified Start Date</p>
                      <p className="text-xs font-bold text-white mt-0.5">
                        {new Date(selectedAllocation.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Verified End Date</p>
                      <p className="text-xs font-bold text-white mt-0.5">
                        {new Date(selectedAllocation.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Performance Score</p>
                      <p className="text-xs font-bold text-emerald-400 mt-0.5">
                        {certPreview?.grade || 'Distinction'} ({certPreview?.finalRating || '4.8'}/5.0)
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Issuance Authority</p>
                      <p className="text-xs font-bold text-cyan-300 mt-0.5">
                        {certPreview?.mentorName || selectedAllocation.mentor?.name || 'Verified Mentor'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recipient Destination Input */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      Send Certificate To Email: <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Account: {selectedAllocation.student?.email}
                    </span>
                  </div>
                  <input
                    type="email"
                    value={targetDeliveryEmail}
                    onChange={(e) => setTargetDeliveryEmail(e.target.value)}
                    required
                    placeholder="student@example.com"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono"
                  />
                  <p className="text-[11px] text-slate-500">
                    The generated completion certificate PDF and public verification link will be securely delivered to this chosen email address.
                  </p>
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCertPreviewModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={Award}
                    loading={isIssuingCert}
                    onClick={handleConfirmIssueCertificate}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-xs"
                  >
                    Confirm & Issue Certificate
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ManageAllocationsPage;
