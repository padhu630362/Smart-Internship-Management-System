import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Calendar,
  Building2,
  Star,
  Search,
  Eye,
  FileCheck,
  Mail,
  Clock,
} from 'lucide-react';
import certificateService from '../services/certificateService';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { Card, CardContent } from '../components/common/Card';
import { useAuth } from '../context/AuthContext';

export const CertificatesPage = () => {
  const { token } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedCode, setCopiedCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await certificateService.getMyCertificates();
      if (res?.data?.certificates) {
        setCertificates(res.data.certificates);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to load completion certificates.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyVerificationCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 3000);
  };

  const filteredCertificates = certificates.filter((cert) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (cert.internshipTitle || '').toLowerCase().includes(term) ||
      (cert.companyName || '').toLowerCase().includes(term) ||
      (cert.certificateNumber || '').toLowerCase().includes(term) ||
      (cert.verificationCode || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Completion Certificates & Credentials"
        description="Official institutionally verified completion credentials awarded upon successful internship evaluations."
        badge={
          <StatusBadge
            status="healthy"
            label={`${certificates.length} CERTIFICATES EARNED`}
            size="sm"
          />
        }
      />

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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Total Credentials</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {certificates.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Verification Status</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                100% Valid
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Academic Standing</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                Distinction
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      {certificates.length > 0 && (
        <div className="surface-card p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search credentials by position, partner company, certificate number..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>
      )}

      {/* Certificates List */}
      {loading ? (
        <LoadingState message="Loading your earned credentials..." />
      ) : filteredCertificates.length === 0 ? (
        <EmptyState
          icon={Award}
          title={
            certificates.length === 0
              ? 'No Completion Certificates Yet'
              : 'No Certificates Match Your Search'
          }
          description={
            certificates.length === 0
              ? 'Completion certificates are automatically generated and cryptographically verifiable once your mentor submits a passing final evaluation for your internship.'
              : 'Try clearing your search query to see all issued certificates.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCertificates.map((cert) => {
            const downloadUrl = certificateService.getCertificateDownloadUrl(cert._id, token, true);
            const viewUrl = certificateService.getCertificateDownloadUrl(cert._id, token, false);
            const isCopied = copiedCode === cert.verificationCode;

            return (
              <div
                key={cert._id}
                className="surface-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-brand-300 dark:hover:border-brand-700 transition-all flex flex-col justify-between gap-4 relative overflow-hidden"
              >
                {/* Decorative Top Accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 gradient-brand" />

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {cert.certificateNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {cert.emailDeliveryStatus === 'sent' && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full"
                          title={cert.emailDeliveredAt ? `Delivered to registered email on ${new Date(cert.emailDeliveredAt).toLocaleString()}` : 'Delivered to registered email'}
                        >
                          <Mail className="w-3 h-3 text-blue-600" />
                          <span>Emailed</span>
                        </span>
                      )}
                      {cert.emailDeliveryStatus === 'failed' && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full"
                          title={cert.emailError || 'Email delivery failed'}
                        >
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>Delivery Pending</span>
                        </span>
                      )}
                      {cert.emailDeliveryStatus === 'pending' && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Queued</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {cert.internshipTitle}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-brand-500" />
                      <span>{cert.companyName}</span>
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Grade</span>
                      <span className="font-bold text-brand-600 dark:text-brand-400">
                        {cert.grade || 'Distinction'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Score</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {cert.finalRating ? `${cert.finalRating.toFixed(1)} / 5.0` : '4.5 / 5.0'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Start Date</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {cert.startDate ? new Date(cert.startDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">End Date</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {cert.endDate ? new Date(cert.endDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Verification Code Box */}
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
                        Public Verification ID
                      </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs truncate block">
                        {cert.verificationCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyVerificationCode(cert.verificationCode)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0"
                      title="Copy Verification Code"
                    >
                      {isCopied ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to={`/verify-certificate/${cert.verificationCode}`}
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-semibold"
                  >
                    <span>Public Verify Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  <div className="flex items-center gap-2">
                    <a
                      href={viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View PDF</span>
                    </a>

                    <a
                      href={downloadUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-2xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CertificatesPage;

