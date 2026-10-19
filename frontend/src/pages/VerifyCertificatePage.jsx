import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Award,
  ShieldCheck,
  XCircle,
  Search,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  GraduationCap,
  Star,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import certificateService from '../services/certificateService';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';

export const VerifyCertificatePage = () => {
  const { code: paramCode } = useParams();
  const [inputCode, setInputCode] = useState(paramCode || '');
  const [certificateData, setCertificateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (paramCode) {
      setInputCode(paramCode);
      verifyCode(paramCode);
    }
  }, [paramCode]);

  const verifyCode = async (codeToVerify) => {
    const trimmed = (codeToVerify || inputCode).trim();
    if (!trimmed) {
      setErrorMsg('Please enter a valid certificate number or verification code.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setSearched(true);
      const res = await certificateService.verifyCertificate(trimmed);

      if (res?.valid && res.data) {
        setCertificateData(res.data);
      } else {
        setCertificateData(null);
        setErrorMsg(res?.message || 'Certificate credential could not be verified.');
      }
    } catch (err) {
      setCertificateData(null);
      setErrorMsg(
        err.response?.data?.message ||
          'No authentic credential was found matching this code.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    verifyCode(inputCode);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Portal</span>
          </Link>
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Public Credential Verification Ledger
          </span>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl gradient-brand text-white shadow-md mb-2">
            <Award className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Verify Internship Completion Credential
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Validate the authenticity of official completion certificates issued by InternHub and accredited partner organizations.
          </p>
        </div>

        {/* Verification Input Form */}
        <div className="surface-card p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter Certificate Number (e.g. CERT-2026-...) or Verification Code..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-sm shrink-0"
            >
              {loading ? 'Verifying...' : 'Verify Credential'}
            </Button>
          </form>
        </div>

        {/* Results Section */}
        {loading ? (
          <LoadingState message="Querying institutional verification registry..." />
        ) : certificateData ? (
          <div className="surface-card rounded-3xl p-6 sm:p-8 border border-emerald-200 dark:border-emerald-800/80 shadow-md space-y-6 relative overflow-hidden animate-fade-in">
            {/* Top Verified Banner */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Official Authentic Credential Verified
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  This certificate has been issued and attested by an authorized academic institution and industry partner.
                </p>
              </div>
            </div>

            {/* Recipient & Program Info */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                  Recipient Candidate
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {certificateData.studentName}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Internship Placement
                  </span>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {certificateData.internshipTitle}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Partner Enterprise
                  </span>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-brand-500" />
                    <span>{certificateData.companyName}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Supervising Mentor
                  </span>
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    {certificateData.mentorName || 'Academic Supervisor'}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Verified Tenure & Dates
                  </span>
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    {certificateData.startDate && certificateData.endDate ? (
                      <span>
                        {new Date(certificateData.startDate).toLocaleDateString()} to{' '}
                        {new Date(certificateData.endDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span>{certificateData.duration || 'Standard Term'}</span>
                    )}
                    <span className="text-slate-400 block text-xs mt-0.5">
                      Issued {new Date(certificateData.issueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Scores */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Final Grade</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {certificateData.grade || 'Distinction'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Rating</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {certificateData.finalRating ? `${certificateData.finalRating.toFixed(1)} / 5.0` : '4.5 / 5.0'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Ledger Status</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400 text-sm uppercase">
                    {certificateData.status || 'Active'}
                  </span>
                </div>
              </div>

              {/* Metadata IDs */}
              <div className="pt-2 text-xs font-mono text-slate-500 space-y-1">
                <div>Certificate Serial: <strong>{certificateData.certificateNumber}</strong></div>
                <div>Verification Code: <strong>{certificateData.verificationCode}</strong></div>
              </div>
            </div>
          </div>
        ) : searched && errorMsg ? (
          <div className="surface-card rounded-3xl p-6 sm:p-8 border border-rose-200 dark:border-rose-800 text-center space-y-3 animate-fade-in">
            <div className="inline-flex p-3 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600">
              <XCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Verification Failed
            </h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mx-auto">
              {errorMsg}
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Please double check the certificate serial number or 16-character alphanumeric verification code and try again.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VerifyCertificatePage;

