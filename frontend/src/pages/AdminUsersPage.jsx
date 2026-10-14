import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  ShieldAlert,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  RefreshCw,
  Mail,
  GraduationCap,
  Building2,
  Shield,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import userService from '../services/userService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { Dropdown, DropdownItem, DropdownDivider } from '../components/common/Dropdown';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    students: 0,
    companies: 0,
    coordinators: 0,
    admins: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    status: 'active',
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: '',
    status: '',
    password: '',
  });

  useEffect(() => {
    fetchUsers(1);
  }, [roleFilter, statusFilter]);

  const fetchUsers = async (page = pagination.page) => {
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await userService.getUsers({
        page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });

      if (res?.data) {
        setUsers(res.data.users || []);
        setPagination(res.data.pagination);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  // Open Edit Modal
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'student',
      status: user.status || 'active',
      password: '',
    });
    setErrorMessage('');
    setIsEditOpen(true);
  };

  // Submit User Update
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      setErrorMessage('');
      const payload = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        status: editForm.status,
      };
      if (editForm.password && editForm.password.trim().length >= 8) {
        payload.password = editForm.password.trim();
      }

      await userService.updateUser(selectedUser._id, payload);
      setSuccessMessage(`User '${editForm.name}' updated successfully.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      setIsEditOpen(false);
      fetchUsers();
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to update user.');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Status Toggle (Activate / Deactivate)
  const handleToggleStatus = async (user, targetStatus) => {
    try {
      setErrorMessage('');
      await userService.updateUserStatus(user._id, targetStatus);
      setSuccessMessage(`User status changed to '${targetStatus}'.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      fetchUsers();
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to update user status.');
    }
  };

  // Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setErrorMessage('');
      await userService.createUser(createForm);
      setSuccessMessage(`Account created for ${createForm.name} with role '${createForm.role}'.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'student',
        status: 'active',
      });
      fetchUsers(1);
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to create user.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      setErrorMessage('');
      await userService.deleteUser(selectedUser._id);
      setSuccessMessage('User deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to delete user.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-brand-600" />
            User Management & Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Oversee user accounts, provision institutional roles, and enforce security controls.
          </p>
        </div>

        <Button
          variant="primary"
          icon={UserPlus}
          onClick={() => {
            setErrorMessage('');
            setIsCreateOpen(true);
          }}
          className="shadow-sm font-semibold"
        >
          Add New User
        </Button>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 font-medium">Total Users</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.totalUsers}
          </p>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-emerald-600 font-medium">Active Accounts</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.activeUsers}
          </p>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-brand-600 font-medium">Students</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.students}
          </p>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-purple-600 font-medium">Companies</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.companies}
          </p>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-amber-600 font-medium">Coordinators</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.coordinators}
          </p>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-rose-600 font-medium">Admins</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.admins}
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
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, student ID, department..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-slate-400"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-hidden focus:border-brand-500"
          >
            <option value="all">All Roles</option>
            <option value="student">Student / Intern</option>
            <option value="company">Company / Employer</option>
            <option value="mentor">Company Mentor</option>
            <option value="coordinator">Coordinator</option>
            <option value="admin">Administrator</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-hidden focus:border-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="pending_verification">Pending Verification</option>
          </select>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={() => fetchUsers()}
            aria-label="Refresh users list"
          />
        </div>
      </div>

      {/* Users Data Table */}
      <div className="surface-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16">
            <LoadingState message="Fetching user directory..." />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={Users}
              title="No users match the search criteria"
              description="Try adjusting your filters or search keywords."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('all');
                    setStatusFilter('all');
                    fetchUsers(1);
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Department / Org</th>
                  <th className="px-6 py-3.5">Registered</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-850/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl gradient-brand text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-400 font-mono truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                        {user.role}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={user.status} />
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">
                      {user.profile?.studentDetails?.department ||
                        user.profile?.companyDetails?.companyName ||
                        user.profile?.coordinatorDetails?.institution ||
                        user.profile?.department ||
                        '—'}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Dropdown
                        align="right"
                        width="w-44"
                        trigger={
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label={`Actions for ${user.name}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        }
                      >
                        <DropdownItem
                          icon={Edit2}
                          onClick={() => handleOpenEdit(user)}
                        >
                          Edit Profile
                        </DropdownItem>

                        {user.status === 'active' ? (
                          <DropdownItem
                            icon={UserX}
                            onClick={() => handleToggleStatus(user, 'inactive')}
                          >
                            Deactivate User
                          </DropdownItem>
                        ) : (
                          <DropdownItem
                            icon={UserCheck}
                            onClick={() => handleToggleStatus(user, 'active')}
                          >
                            Activate User
                          </DropdownItem>
                        )}

                        <DropdownDivider />

                        <DropdownItem
                          icon={Trash2}
                          danger
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDeleteOpen(true);
                          }}
                        >
                          Delete Account
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
              records
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                icon={ChevronLeft}
                disabled={pagination.page <= 1}
                onClick={() => fetchUsers(pagination.page - 1)}
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
                onClick={() => fetchUsers(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Provision New User Account"
        subtitle="Create an internal account with direct role assignment"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Full Name"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            required
            placeholder="e.g. Dr. Arthur Vance"
          />

          <Input
            label="Official Email Address"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            required
            placeholder="arthur.vance@university.edu"
          />

          <Input
            label="Initial Account Password"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            required
            placeholder="Minimum 8 characters"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned System Role
              </label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
              >
                <option value="student">Student / Intern</option>
                <option value="company">Company / Employer</option>
                <option value="mentor">Company Mentor</option>
                <option value="coordinator">Internship Coordinator</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Initial Account Status
              </label>
              <select
                value={createForm.status}
                onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
              >
                <option value="active">Active</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={actionLoading}
            >
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit User: ${selectedUser?.name}`}
        subtitle="Update role, status, and account credentials"
        size="md"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <Input
            label="Full Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Role Assignment
              </label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
              >
                <option value="student">Student / Intern</option>
                <option value="company">Company / Employer</option>
                <option value="mentor">Company Mentor</option>
                <option value="coordinator">Internship Coordinator</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Account Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending_verification">Pending Verification</option>
              </select>
            </div>
          </div>

          <Input
            label="Reset Password (Optional)"
            type="password"
            value={editForm.password}
            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
            placeholder="Leave empty to keep existing password"
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={actionLoading}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Account Deletion"
        subtitle="This action cannot be undone"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to permanently delete account for{' '}
            <strong className="text-slate-900 dark:text-white">{selectedUser?.name}</strong> (
            {selectedUser?.email})?
          </p>

          <div className="flex items-center justify-end gap-3 pt-3">
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
              onClick={handleDeleteUser}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsersPage;
