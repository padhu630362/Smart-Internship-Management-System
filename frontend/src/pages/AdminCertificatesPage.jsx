import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Download,
  ExternalLink,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Users,
  Building2,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Send,
  FileCheck2,
  AlertCircle,
  HelpCircle,
  Copy,
} from 'lucide-react';
import certificateService from '../services/certificateService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { useAuth } from '../context/AuthContext';

export const AdminCertificatesPage = () => {
  const { token } = useAuth();

  // Active view tab: 'audit' or 'mentors'
  const [activeTab, setActiveTab] = useState('audit');

  // Audit data & summary state
  const [certificates, setCertificates] = useState([]);
  const [summary, setSummary] = useState({
    totalCertificates: 0,
    issuedThisMonth: 0,
    totalStudentsCertified: 0,
    totalMentorsIssued: 0,
    pendingCompletionRequests: 0,
    failedEmailDeliveries: 0,
    demoCertificatesCount: 0,
    realCertificatesCount: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Mentor statistics state
  const [mentorStats, setMentorStats] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailStatusFilter, setEmailStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'real', 'demo'
  const [selectedMentorFilter, setSelectedMentorFilter] = useState('all');

  // UI state
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  // Certificate Detail Modal
  const [selectedCert, setSelectedCert] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Demo Seed Modal
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);
  const [seedStage, setSeedStage] = useState('default');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  // Resend Email State
  const [resendingId, setResendingId] = useState(null);

  useEffect(() => {
    fetchAuditData();
  }, [pagination.page, statusFilter, emailStatusFilter, typeFilter, selectedMentorFilter]);

  useEffect(() => {
    if (activeTab === 'mentors') {
      fetchMentorStats();
    }
  }, [activeTab, typeFilter]);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        emailStatus: emailStatusFilter !== 'all' ? emailStatusFilter : undefined,
        type: typeFilter,
        mentorId: selectedMentorFilter !== 'all' ? selectedMentorFilter : undefined,
      };

      const res = await certificateService.getAdminCertificateAudit(params);
      if (res?.data) {
        setCertificates(res.data.certificates || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to retrieve certificate audit records.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchMentorStats = async () => {
    try {
      setLoadingMentors(true);
      const res = await certificateService.getAdminMentorIssuanceStats({ type: typeFilter });
      if (res?.data?.mentors) {
        setMentorStats(res.data.mentors);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to retrieve mentor issuance statistics.'
      );
    } finally {
      setLoadingMentors(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchAuditData();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setEmailStatusFilter('all');
    setTypeFilter('all');
    setSelectedMentorFilter('all');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  const handleResendEmail = async (certId) => {
    try {
      setResendingId(certId);
      setErrorMessage('');
      setSuccessMessage('');

      const res = await certificateService.resendCertificateEmail(certId);
      if (res?.success) {
        setSuccessMessage(
          res.data?.emailDelivery?.sent
            ? 'Certificate email resent successfully.'
            : 'Email dispatch queued (SMTP delivery simulated/logged).'
        );
        fetchAuditData();
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to resend certificate email.'
      );
    } finally {
      setResendingId(null);
    }
  };

  const handleTriggerSeed = async () => {
    try {
      setIsSeeding(true);
      setErrorMessage('');
      setSeedResult(null);

      const res = await certificateService.seedDemo({ stage: seedStage });
      if (res?.success) {
        setSeedResult(res.data);
        setSuccessMessage('NovaTech Demo Labs successfully seeded!');
        fetchAuditData();
        if (activeTab === 'mentors') fetchMentorStats();
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to seed demo scenario.'
      );
    } finally {
      setIsSeeding(false);
    }
  };

  const openCertDetails = (cert) => {
    setSelectedCert(cert);
    setIsDetailModalOpen(true);
  };

  const filterByMentor = (mentorId) => {
    setSelectedMentorFilter(mentorId);
    setActiveTab('audit');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Certificate Audit & Compliance Dashboard"
        description="Comprehensive audit log of institutional credentials, mentor issuance metrics, delivery verification, and demo management."
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Certificate Audit' },
        ]}
        badge={
          <StatusBadge
            status="healthy"
            label={`${summary.totalCertificates} TOTAL ISSUED`}
            size="sm"
          />
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Sparkles}
              onClick={() => setIsSeedModalOpen(true)}
              className="border-primary-500/30 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40"
            >
              Seed Instant Demo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => {
                fetchAuditData();
                if (activeTab === 'mentors') fetchMentorStats();
              }}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-between text-sm shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            <p className="font-medium">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-emerald-500 hover:text-emerald-700 cursor-pointer font-bold text-xs"
          >
            DISMISS
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-between text-sm shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <p className="font-medium">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-rose-500 hover:text-rose-700 cursor-pointer font-bold text-xs"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* 6 Key Performance Indicator Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Issued */}
        <Card className="bg-slate-900 text-white border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Award className="w-12 h-12 text-primary-400" />
          </div>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Issued
            </p>
            <p className="text-2xl font-bold text-white tracking-tight">
              {summary.totalCertificates}
            </p>
            <p className="text-xs text-slate-400">
              {summary.realCertificatesCount} Real · {summary.demoCertificatesCount} Demo
            </p>
          </CardContent>
        </Card>

        {/* Issued This Month */}
        <Card className="bg-slate-900 text-white border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Calendar className="w-12 h-12 text-blue-400" />
          </div>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              This Month
            </p>
            <p className="text-2xl font-bold text-blue-400 tracking-tight">
              {summary.issuedThisMonth}
            </p>
            <p className="text-xs text-slate-400">Current calendar cycle</p>
          </CardContent>
        </Card>

        {/* Students Certified */}
        <Card className="bg-slate-900 text-white border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <User className="w-12 h-12 text-indigo-400" />
          </div>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Students Certified
            </p>
            <p className="text-2xl font-bold text-indigo-400 tracking-tight">
              {summary.totalStudentsCertified}
            </p>
            <p className="text-xs text-slate-400">Distinct student recipients</p>
          </CardContent>
        </Card>

        {/* Mentors Issuing */}
        <Card className="bg-slate-900 text-white border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Users className="w-12 h-12 text-purple-400" />
          </div>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Issuers
            </p>
            <p className="text-2xl font-bold text-purple-400 tracking-tight">
              {summary.totalMentorsIssued}
            </p>
            <p className="text-xs text-slate-400">Mentors & supervisors</p>
          </CardContent>
        </Card>

        {/* Pending Completion Requests */}
        <Card className="bg-slate-900 text-white border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Clock className="w-12 h-12 text-amber-400" />
          </div>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pending Requests
            </p>
            <p className="text-2xl font-bold text-amber-400 tracking-tight">
              {summary.pendingCompletionRequests}
            </p>
            <p className="text-xs text-slate-400">Awaiting mentor review</p>
          </CardContent>
        </Card>

        {/* Failed Email Deliveries */}
        <Card className="bg-slate-900 text-white border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Mail className="w-12 h-12 text-rose-400" />
          </div>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Delivery Issues
            </p>
            <p className="text-2xl font-bold text-rose-400 tracking-tight">
              {summary.failedEmailDeliveries}
            </p>
            <p className="text-xs text-slate-400">Requiring attention / retry</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Certificate Audit Records ({pagination.total})
        </button>
        <button
          onClick={() => setActiveTab('mentors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'mentors'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Mentor Issuance Statistics ({mentorStats.length || summary.totalMentorsIssued})
        </button>
      </div>

      {/* TAB 1: AUDIT RECORDS TABLE */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <Card className="p-4">
            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Search */}
                <div className="lg:col-span-2 relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by student, mentor, cert #, code..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="w-full py-2 px-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">Status: All Statuses</option>
                    <option value="issued">Issued</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </div>

                {/* Email Status Filter */}
                <div>
                  <select
                    value={emailStatusFilter}
                    onChange={(e) => {
                      setEmailStatusFilter(e.target.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="w-full py-2 px-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">Email: All Delivery States</option>
                    <option value="delivered">Delivered</option>
                    <option value="sent">Sent</option>
                    <option value="queued">Queued</option>
                    <option value="failed">Failed / Attention</option>
                  </select>
                </div>

                {/* Record Type: Real vs Demo */}
                <div>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="w-full py-2 px-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium"
                  >
                    <option value="all">Type: All (Real & Demo)</option>
                    <option value="real">Real Records Only</option>
                    <option value="demo">Demo Records Only</option>
                  </select>
                </div>
              </div>

              {/* Active Mentor Filter Indicator */}
              {selectedMentorFilter !== 'all' && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-slate-500">Filtered by Mentor:</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium flex items-center gap-1">
                    {selectedMentorFilter}
                    <button
                      type="button"
                      onClick={() => setSelectedMentorFilter('all')}
                      className="hover:text-purple-800 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs text-primary-600 hover:underline cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </form>
          </Card>

          {/* Audit Records Table */}
          <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
            {loading ? (
              <div className="p-8">
                <LoadingState message="Querying institutional certificate records..." />
              </div>
            ) : certificates.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Award}
                  title="No Certificate Records Match Filters"
                  description="Try broadening your search criteria or seed the NovaTech Demo Labs workflow."
                  action={
                    <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                      Reset Filters
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Certificate ID & Code</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Internship & Company</th>
                      <th className="py-3 px-4">Issuing Mentor</th>
                      <th className="py-3 px-4">Issue Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Email Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {certificates.map((cert) => {
                      const isDemo = Boolean(cert.isDemo);
                      const isFailed = cert.emailDeliveryStatus === 'failed';
                      const isSent = cert.emailDeliveryStatus === 'sent' || cert.emailDeliveryStatus === 'delivered';

                      return (
                        <tr
                          key={cert._id}
                          className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Certificate ID */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <p className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                {cert.certificateNumber}
                              </p>
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                                <span>{cert.verificationCode}</span>
                                <button
                                  onClick={() => handleCopy(cert.verificationCode)}
                                  title="Copy verification code"
                                  className="text-slate-400 hover:text-primary-600 cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                {copiedCode === cert.verificationCode && (
                                  <span className="text-[10px] text-emerald-600 font-sans">
                                    Copied!
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Student */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-900 dark:text-white text-xs">
                                {cert.studentName}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {cert.studentEmail}
                              </p>
                            </div>
                          </td>

                          {/* Internship & Company */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5 max-w-[200px]">
                              <p className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate" title={cert.internshipTitle}>
                                {cert.internshipTitle}
                              </p>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {cert.companyName}
                              </p>
                            </div>
                          </td>

                          {/* Issuing Mentor */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                                {cert.mentorName || 'Assigned Mentor'}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {cert.issuedBy?.email || 'Authorized Issuer'}
                              </p>
                            </div>
                          </td>

                          {/* Issue Date */}
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : 'N/A'}
                          </td>

                          {/* Record Type: Demo vs Real */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isDemo ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                <Sparkles className="w-3 h-3" />
                                DEMO
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <ShieldCheck className="w-3 h-3" />
                                REAL
                              </span>
                            )}
                          </td>

                          {/* Email Status */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              {isSent ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Delivered
                                </span>
                              ) : isFailed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                  <AlertCircle className="w-3 h-3" />
                                  Failed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  <Clock className="w-3 h-3" />
                                  Queued
                                </span>
                              )}
                              <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                {cert.deliveryEmail || cert.studentEmail}
                              </p>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {/* View Details */}
                              <button
                                onClick={() => openCertDetails(cert)}
                                title="Inspect audit details"
                                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Download PDF */}
                              <a
                                href={certificateService.getCertificateDownloadUrl(cert._id, token, true)}
                                download
                                title="Download official PDF"
                                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-600 dark:text-primary-400 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </a>

                              {/* Public Verification */}
                              <Link
                                to={`/verify-certificate/${cert.verificationCode}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open public verification page"
                                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>

                              {/* Resend Email */}
                              <button
                                onClick={() => handleResendEmail(cert._id)}
                                disabled={resendingId === cert._id}
                                title="Resend certificate email"
                                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Bar */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <p>
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total certificates)
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: MENTOR ISSUANCE STATISTICS */}
      {activeTab === 'mentors' && (
        <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800">
            <CardTitle>Mentor Certificate Issuance & Accountability Metrics</CardTitle>
            <CardDescription>
              Track individual mentor activity, certificate issuance volumes, pending intern completion reviews, and delivery health.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingMentors ? (
              <div className="p-8">
                <LoadingState message="Aggregating mentor issuance statistics..." />
              </div>
            ) : mentorStats.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Users}
                  title="No Mentor Data Found"
                  description="Register or seed mentors to track institutional issuance metrics."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Mentor Name & Department</th>
                      <th className="py-3 px-4">Email Address</th>
                      <th className="py-3 px-4 text-center">Total Issued</th>
                      <th className="py-3 px-4 text-center">Issued This Month</th>
                      <th className="py-3 px-4 text-center">Pending Reviews</th>
                      <th className="py-3 px-4 text-center">Delivery Issues</th>
                      <th className="py-3 px-4 text-right">Quick Filter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {mentorStats.map((m) => (
                      <tr
                        key={m.mentorId}
                        className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900 dark:text-white text-xs">
                            {m.mentorName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {m.department}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 font-mono">
                          {m.mentorEmail}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-xs text-slate-900 dark:text-white px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                            {m.totalIssued}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-xs text-blue-600 dark:text-blue-400">
                            {m.issuedThisMonth}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {m.pendingCompletionRequests > 0 ? (
                            <span className="font-bold text-xs text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                              {m.pendingCompletionRequests} Pending
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {m.failedEmailDeliveries > 0 ? (
                            <span className="font-bold text-xs text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                              {m.failedEmailDeliveries}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => filterByMentor(m.mentorId)}
                            className="text-xs"
                          >
                            View Certificates
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DETAIL MODAL: CERTIFICATE AUDIT INSPECTION */}
      {selectedCert && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Certificate Audit Record: ${selectedCert.certificateNumber}`}
          size="lg"
        >
          <div className="space-y-6 text-sm">
            {/* Header Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Verification Code</p>
                <p className="font-mono text-base font-bold text-slate-900 dark:text-white">
                  {selectedCert.verificationCode}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedCert.isDemo ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    DEMO CREDENTIAL
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    OFFICIAL INSTITUTIONAL
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {selectedCert.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Grid Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase">Student Intern</p>
                <p className="font-medium text-slate-900 dark:text-white">{selectedCert.studentName}</p>
                <p className="text-xs text-slate-500 font-mono">{selectedCert.studentEmail}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase">Preferred Delivery Destination</p>
                <p className="font-medium text-primary-600 dark:text-primary-400 font-mono">
                  {selectedCert.deliveryEmail || selectedCert.studentEmail}
                </p>
                <p className="text-xs text-slate-400">
                  Status: {selectedCert.emailDeliveryStatus}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase">Internship Program</p>
                <p className="font-medium text-slate-900 dark:text-white">{selectedCert.internshipTitle}</p>
                <p className="text-xs text-slate-500">{selectedCert.companyName}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase">Issuing Authority</p>
                <p className="font-medium text-slate-900 dark:text-white">{selectedCert.mentorName || 'Mentor'}</p>
                <p className="text-xs text-slate-500">
                  Issuer: {selectedCert.issuedBy?.name || 'Authorized Supervisor'} ({selectedCert.issuedByRole || 'mentor'})
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase">Internship Dates</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {new Date(selectedCert.startDate).toLocaleDateString()} — {new Date(selectedCert.endDate).toLocaleDateString()}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase">Issue Timestamp</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {new Date(selectedCert.issueDate).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Email Delivery Audit Trail */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email Dispatch & Delivery History
              </p>
              {selectedCert.emailDeliveryHistory && selectedCert.emailDeliveryHistory.length > 0 ? (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {selectedCert.emailDeliveryHistory.map((attempt, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <p className="font-mono text-slate-800 dark:text-slate-200">
                          {attempt.recipientEmail}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(attempt.sentAt).toLocaleString()}
                        </p>
                        {attempt.error && (
                          <p className="text-[10px] text-rose-500 font-mono truncate max-w-sm">
                            {attempt.error}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          attempt.status === 'sent' || attempt.status === 'delivered'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-rose-500/10 text-rose-600'
                        }`}
                      >
                        {attempt.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No delivery history recorded.</p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <Link
                to={`/verify-certificate/${selectedCert.verificationCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Public Verification Page
              </Link>
              <div className="flex items-center gap-2">
                <a
                  href={certificateService.getCertificateDownloadUrl(selectedCert._id, token, true)}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* DEMO SEED MODAL */}
      <Modal
        isOpen={isSeedModalOpen}
        onClose={() => setIsSeedModalOpen(false)}
        title="Seed NovaTech Demo Labs Scenario"
        size="md"
      >
        <div className="space-y-4 text-sm">
          <p className="text-slate-600 dark:text-slate-300">
            This administrative utility seeds the fictional <strong>NovaTech Demo Labs</strong> scenario. It prepares a demo student, mentor, and allocation with 3 tasks for project presentation without affecting real user records.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-slate-500">
              Select Demonstration Starting Stage:
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <input
                  type="radio"
                  name="seedStage"
                  value="default"
                  checked={seedStage === 'default'}
                  onChange={(e) => setSeedStage(e.target.value)}
                  className="mt-1 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-xs">
                    Stage 1: Live Task Submission & Review (Default)
                  </p>
                  <p className="text-xs text-slate-500">
                    Tasks 1 & 2 completed; Task 3 ready for student to submit deliverables, then mentor review.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <input
                  type="radio"
                  name="seedStage"
                  value="completed"
                  checked={seedStage === 'completed'}
                  onChange={(e) => setSeedStage(e.target.value)}
                  className="mt-1 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-xs">
                    Stage 2: Ready for Immediate Certificate Issuance
                  </p>
                  <p className="text-xs text-slate-500">
                    All 3 tasks pre-approved and completion verified. Mentor can immediately preview and issue certificate.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {seedResult && (
            <div className="p-3.5 rounded-xl bg-slate-900 text-white font-mono text-xs space-y-1">
              <p className="text-emerald-400 font-bold">✅ Seeded Credentials:</p>
              <p>Student: {seedResult.student.email} / DemoPass123!</p>
              <p>Mentor:  {seedResult.mentor.email} / DemoPass123!</p>
              <p>Company: {seedResult.company.email} / DemoPass123!</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSeedModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Sparkles}
              loading={isSeeding}
              onClick={handleTriggerSeed}
            >
              Execute Demo Seed
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminCertificatesPage;
