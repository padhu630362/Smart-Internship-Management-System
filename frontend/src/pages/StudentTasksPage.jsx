import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Clock,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  Search,
  Send,
  Sparkles,
  AlertTriangle,
  History,
  Layers,
  MessageSquare,
} from 'lucide-react';
import taskService, { TASK_STATUSES, TASK_PRIORITIES } from '../services/taskService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';

export const StudentTasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  // Submit Deliverable Modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [progress, setProgress] = useState(100);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [targetStatus, setTargetStatus] = useState(TASK_STATUSES.SUBMITTED);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [selectedStatus, selectedPriority, onlyOverdue]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const params = {
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        priority: selectedPriority !== 'all' ? selectedPriority : undefined,
        overdue: onlyOverdue ? 'true' : undefined,
        search: searchTerm.trim() || undefined,
        limit: 50,
      };

      const res = await taskService.getTasks(params);
      if (res?.data?.tasks) {
        setTasks(res.data.tasks);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to retrieve your assigned tasks.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  const handleOpenSubmitModal = (task) => {
    setSelectedTask(task);
    setProgress(task.progressPercentage || 50);
    setSubmissionNotes(task.submissionNotes || '');
    setSubmissionLink(task.submissionLink || '');
    setTargetStatus(TASK_STATUSES.SUBMITTED);
    setIsSubmitModalOpen(true);
  };

  const handleSubmitProgress = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const res = await taskService.submitTaskProgress(selectedTask._id, {
        progressPercentage: progress,
        submissionNotes: submissionNotes.trim(),
        submissionLink: submissionLink.trim(),
        status: targetStatus,
      });

      if (res?.success) {
        setSuccessMessage('Task deliverables & progress successfully submitted!');
        setIsSubmitModalOpen(false);
        fetchTasks();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to submit task progress.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'urgent':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300';
      case 'high':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';
      case 'medium':
        return 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border-brand-200';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    }
  };

  const todoCount = tasks.filter((t) => t.status === TASK_STATUSES.TODO).length;
  const inProgressCount = tasks.filter((t) => t.status === TASK_STATUSES.IN_PROGRESS).length;
  const submittedCount = tasks.filter((t) => t.status === TASK_STATUSES.SUBMITTED).length;
  const completedCount = tasks.filter((t) => t.status === TASK_STATUSES.COMPLETED).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Milestone Deliverables & Tasks"
        description="Track project tasks assigned by your mentor, submit code/document deliverables, and review feedback."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'My Tasks' }]}
        badge={
          <StatusBadge
            status="healthy"
            label={`${tasks.length} ASSIGNED TASKS`}
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

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-2xs border-l-4 border-l-slate-400">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500">To Do</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {todoCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border-l-4 border-l-brand-500">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">In Progress</span>
            <div className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">
              {inProgressCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Submitted</span>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {submittedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Completed</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {completedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="surface-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks by title, keywords, or requirements..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
          </div>
          <Button type="submit" variant="primary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', TASK_STATUSES.TODO, TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.SUBMITTED, TASK_STATUSES.COMPLETED, TASK_STATUSES.REVISION_REQUESTED].map(
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
                  {st.replace('_', ' ').toUpperCase()}
                </button>
              )
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyOverdue}
              onChange={(e) => setOnlyOverdue(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            <span className="font-semibold text-rose-600 dark:text-rose-400">Show Overdue Only</span>
          </label>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <LoadingState message="Loading your assigned tasks..." />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="No Tasks Found"
          description="Tasks assigned by your company mentor or coordinator will appear here."
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isOverdue = task.status !== TASK_STATUSES.COMPLETED && new Date() > new Date(task.dueDate);

            return (
              <div
                key={task._id}
                className="surface-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 hover:border-brand-300 dark:hover:border-brand-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={task.status === 'completed' ? 'healthy' : 'brand'}
                      label={task.status.replace('_', ' ').toUpperCase()}
                      size="sm"
                    />
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase ${getPriorityBadge(
                        task.priority
                      )}`}
                    >
                      {task.priority} Priority
                    </span>
                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        OVERDUE
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-500 font-mono">
                    Due: <strong>{new Date(task.dueDate).toLocaleDateString()}</strong>
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {task.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {task.description}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>Deliverable Progress</span>
                    <span>{task.progressPercentage || 0}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        task.status === 'completed'
                          ? 'bg-emerald-500'
                          : task.progressPercentage > 60
                          ? 'bg-brand-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${task.progressPercentage || 0}%` }}
                    />
                  </div>
                </div>

                {/* Mentor feedback if present */}
                {task.reviewerFeedback && (
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Mentor Review Feedback:
                    </span>
                    <p className="italic">"{task.reviewerFeedback}"</p>
                  </div>
                )}

                {/* Action button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    Assigned by: <strong>{task.assignedBy?.name || 'Mentor'}</strong>
                  </span>

                  {task.status !== TASK_STATUSES.COMPLETED && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Send}
                      onClick={() => handleOpenSubmitModal(task)}
                      className="font-semibold text-xs shadow-2xs"
                    >
                      Update Progress / Submit
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress / Deliverable Submission Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Deliverable & Update Progress"
        subtitle={selectedTask?.title}
        size="md"
      >
        {selectedTask && (
          <form onSubmit={handleSubmitProgress} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Completion Progress ({progress}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-brand-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Deliverable Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              >
                <option value={TASK_STATUSES.IN_PROGRESS}>In Progress (Save Draft Progress)</option>
                <option value={TASK_STATUSES.SUBMITTED}>Submitted (Ready for Mentor Review)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Deliverable Link (GitHub PR, Google Drive, Figma, etc.)
              </label>
              <input
                type="url"
                value={submissionLink}
                onChange={(e) => setSubmissionLink(e.target.value)}
                placeholder="https://github.com/organization/repo/pull/12"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Submission Notes & Implementation Details
              </label>
              <textarea
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="Explain what was accomplished, technical challenges solved, or testing notes..."
                rows={3}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSubmitModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={Send}
                loading={isSubmitting}
                className="font-semibold"
              >
                Submit Deliverable
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default StudentTasksPage;
