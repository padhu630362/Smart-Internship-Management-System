import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Filter,
  Search,
  MessageSquare,
  Check,
  RotateCcw,
} from 'lucide-react';
import taskService, { TASK_STATUSES, TASK_PRIORITIES } from '../services/taskService';
import allocationService, { ALLOCATION_STATUSES } from '../services/allocationService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { Card, CardContent } from '../components/common/Card';

export const ManageTasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  // Create Task Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    allocationId: '',
    title: '',
    description: '',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
    priority: TASK_PRIORITIES.MEDIUM,
  });
  const [isCreating, setIsCreating] = useState(false);

  // Review Task Modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState(TASK_STATUSES.COMPLETED);
  const [feedback, setFeedback] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    fetchInitialAllocations();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [selectedStatus, selectedPriority, onlyOverdue]);

  const fetchInitialAllocations = async () => {
    try {
      const res = await allocationService.getAllocations({
        status: ALLOCATION_STATUSES.ACTIVE,
        limit: 100,
      });
      if (res?.data?.allocations) {
        setAllocations(res.data.allocations);
      }
    } catch (err) {
      console.warn('Could not load active allocations for task assignment:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const params = {
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        priority: selectedPriority !== 'all' ? selectedPriority : undefined,
        overdue: onlyOverdue ? 'true' : undefined,
        limit: 50,
      };

      const res = await taskService.getTasks(params);
      if (res?.data?.tasks) {
        setTasks(res.data.tasks);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to retrieve managed tasks.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setTaskForm({
      allocationId: allocations[0]?._id || '',
      title: '',
      description: '',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
      priority: TASK_PRIORITIES.MEDIUM,
    });
    setErrorMessage('');
    setIsCreateModalOpen(true);
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      setErrorMessage('');

      const res = await taskService.createTask({
        allocationId: taskForm.allocationId,
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        dueDate: taskForm.dueDate,
        priority: taskForm.priority,
      });

      if (res?.success) {
        setSuccessMessage('Task successfully assigned to intern!');
        setIsCreateModalOpen(false);
        fetchTasks();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to assign task.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenReviewModal = (task) => {
    setSelectedTask(task);
    setReviewStatus(TASK_STATUSES.COMPLETED);
    setFeedback('');
    setIsReviewModalOpen(true);
  };

  const handleReviewTaskSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      setIsReviewing(true);
      setErrorMessage('');

      const res = await taskService.reviewTask(selectedTask._id, {
        status: reviewStatus,
        reviewerFeedback: feedback.trim(),
      });

      if (res?.success) {
        setSuccessMessage(`Task marked as '${reviewStatus}'.`);
        setIsReviewModalOpen(false);
        fetchTasks();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to review task.'
      );
    } finally {
      setIsReviewing(false);
    }
  };

  const pendingReviewCount = tasks.filter((t) => t.status === TASK_STATUSES.SUBMITTED).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intern Task & Milestone Management"
        description="Assign technical deliverables to placed interns, track deadlines, inspect submissions, and record mentor review feedback."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Manage Tasks' }]}
        badge={
          <StatusBadge
            status={pendingReviewCount > 0 ? 'warning' : 'healthy'}
            label={`${pendingReviewCount} PENDING EVALUATION`}
            size="sm"
          />
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleOpenCreateModal}
            className="font-semibold shadow-2xs"
          >
            Assign New Task
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

      {/* Filter Toolbar */}
      <div className="surface-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
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

      {/* Tasks List */}
      {loading ? (
        <LoadingState message="Loading tasks..." />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="No Tasks Assigned"
          description="Click 'Assign New Task' to delegate milestones to your placed interns."
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
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {task.priority}
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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {task.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Assignee: <strong>{task.assignedTo?.name}</strong> ({task.assignedTo?.email})
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Progress: {task.progressPercentage || 0}%
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {task.description}
                </p>

                {/* Submission deliverables if submitted */}
                {task.submissionNotes && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 text-xs space-y-1.5 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Intern Submitted Deliverable:
                      </span>
                      {task.submissionLink && (
                        <a
                          href={task.submissionLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brand-600 hover:underline flex items-center gap-1"
                        >
                          <span>Open Deliverable Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 italic">
                      "{task.submissionNotes}"
                    </p>
                  </div>
                )}

                {/* Review button */}
                <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Check}
                    onClick={() => handleOpenReviewModal(task)}
                    className="font-semibold text-xs shadow-2xs"
                  >
                    Evaluate & Review Task
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Task Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Assign Milestone Task to Intern"
        size="md"
      >
        <form onSubmit={handleCreateTaskSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assigned Intern / Allocation <span className="text-rose-500">*</span>
            </label>
            <select
              value={taskForm.allocationId}
              onChange={(e) => setTaskForm({ ...taskForm, allocationId: e.target.value })}
              required
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            >
              {allocations.map((alc) => (
                <option key={alc._id} value={alc._id}>
                  {alc.student?.name} - {alc.internship?.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              required
              placeholder="e.g., Implement OAuth2 integration & unit tests"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description & Requirements <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              required
              placeholder="Detail the technical specifications, expected output, and documentation needed..."
              rows={3}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              >
                <option value={TASK_PRIORITIES.LOW}>Low</option>
                <option value={TASK_PRIORITIES.MEDIUM}>Medium</option>
                <option value={TASK_PRIORITIES.HIGH}>High</option>
                <option value={TASK_PRIORITIES.URGENT}>Urgent</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isCreating}
            >
              Assign Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Task Deliverable Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Evaluate Task Deliverable"
        subtitle={selectedTask?.title}
        size="md"
      >
        <form onSubmit={handleReviewTaskSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Review Decision Status
            </label>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            >
              <option value={TASK_STATUSES.COMPLETED}>Completed (Approved Deliverable)</option>
              <option value={TASK_STATUSES.REVISION_REQUESTED}>Revision Requested (Requires Changes)</option>
              <option value={TASK_STATUSES.IN_PROGRESS}>In Progress (Work Continues)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Feedback Notes & Code Review Remarks
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback, architecture observations, or revision instructions..."
              rows={3}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
          </div>

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
              loading={isReviewing}
            >
              Submit Evaluation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ManageTasksPage;
