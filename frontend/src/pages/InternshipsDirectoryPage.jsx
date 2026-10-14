import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Search,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Users,
  GraduationCap,
  Building2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Filter,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import internshipService from '../services/internshipService';
import applicationService from '../services/applicationService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';

export const InternshipsDirectoryPage = () => {
  const { user, isAuthenticated } = useAuth();

  const [opportunities, setOpportunities] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [workMode, setWorkMode] = useState('all');
  const [hasStipend, setHasStipend] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [errorMessage, setErrorMessage] = useState('');

  // Selected Opportunity Detail Modal
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [aiFitScore, setAiFitScore] = useState(null);
  const [isLoadingAiFit, setIsLoadingAiFit] = useState(false);
  const [aiFitError, setAiFitError] = useState('');

  // Application Submission Modal & Flow
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [applyErrorMessage, setApplyErrorMessage] = useState('');
  const [applySuccessMessage, setApplySuccessMessage] = useState('');

  const handleOpenApplyModal = (opportunity) => {
    setSelectedOpportunity(opportunity);
    setCoverLetter('');
    setApplyErrorMessage('');
    setApplySuccessMessage('');
    setIsApplyModalOpen(true);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedOpportunity) return;

    if (!user?.profile?.studentDetails?.resumeUrl) {
      setApplyErrorMessage(
        'A verified student resume is required to apply. Please upload your resume in the My Profile tab first.'
      );
      return;
    }

    try {
      setIsSubmittingApp(true);
      setApplyErrorMessage('');
      const res = await applicationService.applyToInternship({
        internshipId: selectedOpportunity._id,
        coverLetter: coverLetter.trim(),
        resumeFileName: user?.profile?.studentDetails?.resumeFileName,
      });

      if (res?.success) {
        setApplySuccessMessage('Application submitted successfully! Track your status under My Applications.');
      }
    } catch (err) {
      setApplyErrorMessage(
        err.response?.data?.error?.message || 'Failed to submit internship application.'
      );
    } finally {
      setIsSubmittingApp(false);
    }
  };

  useEffect(() => {
    fetchInternships(1);
  }, [workMode, hasStipend, sortBy]);

  const fetchInternships = async (page = pagination.page) => {
    try {
      setLoading(true);
      setErrorMessage('');
      const params = {
        page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        workMode: workMode !== 'all' ? workMode : undefined,
        hasStipend: hasStipend ? 'true' : undefined,
        sortBy: sortBy === 'newest' ? 'createdAt' : sortBy,
      };

      const res = await internshipService.getPublicInternships(params);
      if (res?.data) {
        setOpportunities(res.data.opportunities || []);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to fetch internship opportunities.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInternships(1);
  };

  const handleOpenDetail = (opportunity) => {
    setSelectedOpportunity(opportunity);
    setAiFitScore(null);
    setAiFitError('');
    setIsDetailOpen(true);
  };

  const handleCheckAiFit = async (internshipId) => {
    try {
      setIsLoadingAiFit(true);
      setAiFitError('');
      const res = await internshipService.getMatchScore(internshipId);
      if (res?.data) {
        setAiFitScore(res.data);
      }
    } catch (err) {
      setAiFitError(err.response?.data?.message || 'Failed to calculate AI skill match.');
    } finally {
      setIsLoadingAiFit(false);
    }
  };

  // Helper to format deadline days remaining
  const getDeadlineBadge = (deadlineStr) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          Application Closed
        </span>
      );
    }
    if (diffDays <= 5) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
          Closing in {diffDays} {diffDays === 1 ? 'day' : 'days'}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        Closes in {diffDays} days
      </span>
    );
  };

  // Work Mode Badges
  const getWorkModeBadge = (mode) => {
    switch (mode) {
      case 'remote':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            Remote
          </span>
        );
      case 'hybrid':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
            Hybrid
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            On-Site
          </span>
        );
    }
  };

  // Student Profile Match Check
  const studentCgpa = user?.profile?.studentDetails?.cgpa || 0;
  const studentDept = user?.profile?.studentDetails?.department || '';
  const studentYear = user?.profile?.studentDetails?.graduationYear;
  const hasResume = Boolean(user?.profile?.studentDetails?.resumeUrl);

  const isCgpaEligible =
    !selectedOpportunity?.eligibility?.minCgpa ||
    studentCgpa >= selectedOpportunity.eligibility.minCgpa;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="surface-card rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 relative overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 text-xs font-semibold border border-brand-200/60 dark:border-brand-800/60 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Verified Industry Placements</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Explore Internship Opportunities
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            Discover internships verified by university coordinators. Browse positions, verify eligibility criteria, and review prerequisites.
          </p>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="surface-card p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by role, company name, required skill, or location..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-slate-400"
            />
          </div>
          <Button type="submit" variant="primary" size="sm" className="shadow-xs">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          {/* Work Mode Toggle Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium mr-1 hidden sm:inline">Mode:</span>
            {[
              { id: 'all', label: 'All Modes' },
              { id: 'remote', label: 'Remote' },
              { id: 'hybrid', label: 'Hybrid' },
              { id: 'on-site', label: 'On-Site' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setWorkMode(mode.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  workMode === mode.id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {mode.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setHasStipend(!hasStipend)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ml-2 ${
                hasStipend
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Paid Stipend Only
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-hidden"
            >
              <option value="newest">Newest Added</option>
              <option value="deadline">Closing Soonest</option>
              <option value="stipend">Highest Stipend</option>
              <option value="oldest">Earliest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Opportunities Cards Grid */}
      {loading ? (
        <div className="py-20">
          <LoadingState message="Discovering published internship opportunities..." />
        </div>
      ) : opportunities.length === 0 ? (
        <div className="py-16">
          <EmptyState
            icon={Briefcase}
            title="No internship opportunities match your criteria"
            description="Try loosening your filters, changing the work mode, or clearing search keywords."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setWorkMode('all');
                  setHasStipend(false);
                  setSortBy('newest');
                  fetchInternships(1);
                }}
              >
                Reset All Filters
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {opportunities.map((opp) => (
            <div
              key={opp._id}
              className="surface-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: Company & Work Mode */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-brand text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {opp.companyName?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                        {opp.companyName}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[160px]">{opp.location}</span>
                      </p>
                    </div>
                  </div>

                  {getWorkModeBadge(opp.workMode)}
                </div>

                {/* Opportunity Title */}
                <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 mt-1">
                  {opp.title}
                </h3>

                {/* Brief description */}
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                  {opp.description}
                </p>

                {/* Compensation & Duration Meta */}
                <div className="flex flex-wrap items-center gap-2.5 mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>
                      {opp.stipend?.hasStipend && opp.stipend?.amount > 0
                        ? `${opp.stipend.currency} ${opp.stipend.amount.toLocaleString()} / ${opp.stipend.periodicity || 'mo'}`
                        : 'Academic Credit'}
                    </span>
                  </div>

                  <span className="text-slate-300 dark:text-slate-700">•</span>

                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{opp.duration}</span>
                  </div>

                  <span className="text-slate-300 dark:text-slate-700">•</span>

                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{opp.openings} {opp.openings === 1 ? 'opening' : 'openings'}</span>
                  </div>
                </div>

                {/* Required Skills Chips */}
                {opp.requiredSkills && opp.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {opp.requiredSkills.slice(0, 3).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"
                      >
                        {skill}
                      </span>
                    ))}
                    {opp.requiredSkills.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] text-slate-400 font-semibold">
                        +{opp.requiredSkills.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer: Deadline & Action */}
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                {getDeadlineBadge(opp.applicationDeadline)}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDetail(opp)}
                  className="font-semibold text-xs shadow-2xs"
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {!loading && pagination.total > 0 && (
        <div className="surface-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
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
            opportunities
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={ChevronLeft}
              disabled={pagination.page <= 1}
              onClick={() => fetchInternships(pagination.page - 1)}
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
              onClick={() => fetchInternships(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detailed Opportunity Modal / Drawer */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedOpportunity?.title || 'Internship Opportunity Details'}
        subtitle={`Hosted by ${selectedOpportunity?.companyName} • ${selectedOpportunity?.location}`}
        size="lg"
      >
        {selectedOpportunity && (
          <div className="space-y-5">
            {/* Top Snapshot Bar */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Work Arrangement</p>
                <p className="font-bold text-slate-900 dark:text-white capitalize mt-0.5">
                  {selectedOpportunity.workMode}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Stipend / Honorarium</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {selectedOpportunity.stipend?.hasStipend && selectedOpportunity.stipend?.amount > 0
                    ? `${selectedOpportunity.stipend.currency} ${selectedOpportunity.stipend.amount} / ${selectedOpportunity.stipend.periodicity}`
                    : 'Academic Credit'}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Duration</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedOpportunity.duration}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Available Openings</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedOpportunity.openings} positions
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                Position Overview & Deliverables
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {selectedOpportunity.description}
              </p>
            </div>

            {/* Skills Required */}
            {selectedOpportunity.requiredSkills?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                  Required Competencies & Tools
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedOpportunity.requiredSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Eligibility & Candidate Match Check */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                Eligibility & Academic Criteria
              </h4>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Minimum CGPA Required:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedOpportunity.eligibility?.minCgpa > 0
                      ? `${selectedOpportunity.eligibility.minCgpa} / 10.0`
                      : 'None (Open to all grades)'}
                  </span>
                </div>

                {selectedOpportunity.eligibility?.allowedDepartments?.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Allowed Departments:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedOpportunity.eligibility.allowedDepartments.join(', ')}
                    </span>
                  </div>
                )}

                {selectedOpportunity.eligibility?.allowedGraduationYears?.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Target Graduation Years:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedOpportunity.eligibility.allowedGraduationYears.join(', ')}
                    </span>
                  </div>
                )}

                {selectedOpportunity.eligibility?.otherRequirements && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Additional Criteria: </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {selectedOpportunity.eligibility.otherRequirements}
                    </span>
                  </div>
                )}
              </div>

              {/* Candidate Verification Card for Authenticated Students */}
              {isAuthenticated && user?.role === 'student' && (
                <div className="mt-3 p-3.5 rounded-xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-800/60 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-brand-800 dark:text-brand-200">
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                    <span>Your Profile Readiness Status</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {isCgpaEligible ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                      <span>
                        CGPA: <strong>{studentCgpa || 'Not set'}</strong> (Req:{' '}
                        {selectedOpportunity.eligibility?.minCgpa || '0'})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasResume ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      )}
                      <span>
                        Official Resume:{' '}
                        {hasResume ? (
                          <strong className="text-emerald-700">Uploaded</strong>
                        ) : (
                          <Link to="/profile" className="text-brand-600 underline font-bold">
                            Missing (Upload in Profile)
                          </Link>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* AI Fit Compatibility Evaluation */}
                  <div className="pt-2.5 border-t border-brand-200/60 dark:border-brand-800/60">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        Smart AI Skill Fit Analysis:
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckAiFit(selectedOpportunity._id)}
                        disabled={isLoadingAiFit}
                        className="text-[11px] py-1 px-2.5 h-auto border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300"
                      >
                        <Sparkles className={`w-3 h-3 mr-1 text-brand-600 ${isLoadingAiFit ? 'animate-spin' : ''}`} />
                        {isLoadingAiFit ? 'Analyzing Fit...' : aiFitScore ? 'Re-Evaluate Fit' : 'Check My AI Fit'}
                      </Button>
                    </div>

                    {aiFitError && (
                      <p className="text-rose-600 dark:text-rose-400 text-[11px] mt-1.5">{aiFitError}</p>
                    )}

                    {aiFitScore && (
                      <div className="mt-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                              aiFitScore.matchScore >= 75 ? 'bg-emerald-500' : aiFitScore.matchScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            }`} />
                            Match Score: {aiFitScore.matchScore}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {aiFitScore.engine}
                          </span>
                        </div>

                        {aiFitScore.matchedSkills?.length > 0 && (
                          <div className="text-[11px]">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              Matched Skills:
                            </span>{' '}
                            <span className="text-slate-600 dark:text-slate-300">
                              {aiFitScore.matchedSkills.join(', ')}
                            </span>
                          </div>
                        )}

                        {aiFitScore.missingSkills?.length > 0 && (
                          <div className="text-[11px]">
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              Recommended to Learn:
                            </span>{' '}
                            <span className="text-slate-600 dark:text-slate-300">
                              {aiFitScore.missingSkills.join(', ')}
                            </span>
                          </div>
                        )}

                        {aiFitScore.strengths?.length > 0 && (
                          <div className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                            💡 {aiFitScore.strengths[0]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                Deadline: {new Date(selectedOpportunity.applicationDeadline).toLocaleDateString()}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailOpen(false)}
                >
                  Close
                </Button>

                {isAuthenticated && user?.role === 'student' ? (
                  <Button
                    variant="primary"
                    icon={Briefcase}
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleOpenApplyModal(selectedOpportunity);
                    }}
                    className="shadow-sm font-semibold"
                  >
                    Apply for Internship
                  </Button>
                ) : !isAuthenticated ? (
                  <Link to="/login">
                    <Button variant="primary" size="sm" icon={ExternalLink}>
                      Sign In to Apply
                    </Button>
                  </Link>
                ) : (
                  <Button variant="secondary" disabled>
                    Viewing as {user?.role}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Application Submission Dialog */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Submit Internship Application"
        subtitle={
          selectedOpportunity
            ? `${selectedOpportunity.title} at ${selectedOpportunity.companyName}`
            : ''
        }
        size="md"
      >
        {selectedOpportunity && (
          <div>
            {applySuccessMessage ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 dark:text-emerald-100">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Application Submitted Successfully!</span>
                  </div>
                  <p>
                    Your application for <strong>{selectedOpportunity.title}</strong> has been
                    registered in the system. The recruiting team will review your snapshot and
                    credentials.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsApplyModalOpen(false)}
                  >
                    Close
                  </Button>
                  <Link to="/my-applications">
                    <Button variant="primary" size="sm" icon={ExternalLink}>
                      View My Applications
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                {applyErrorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{applyErrorMessage}</span>
                  </div>
                )}

                {/* Candidate snapshot preview */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Applicant Profile Snapshot</span>
                    <span className="text-[11px] font-mono text-slate-400">{user?.email}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <div>
                      Name: <strong>{user?.name}</strong>
                    </div>
                    <div>
                      ID: <strong>{user?.profile?.studentDetails?.studentId || 'Not set'}</strong>
                    </div>
                    <div>
                      Dept: <strong>{user?.profile?.studentDetails?.department || 'Not set'}</strong>
                    </div>
                    <div>
                      CGPA: <strong>{user?.profile?.studentDetails?.cgpa || 'Not set'} / 10.0</strong>
                    </div>
                  </div>
                </div>

                {/* Resume Status */}
                <div className="text-xs space-y-1.5">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Official Resume Reference <span className="text-rose-500">*</span>
                  </label>
                  {user?.profile?.studentDetails?.resumeUrl ? (
                    <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-medium truncate max-w-[200px]">
                          {user?.profile?.studentDetails?.resumeFileName || 'Profile_Resume.pdf'}
                        </span>
                      </div>
                      <a
                        href={user?.profile?.studentDetails?.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 underline flex items-center gap-1"
                      >
                        Preview
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>No resume uploaded to your profile</span>
                      </div>
                      <p className="text-[11px]">
                        Please upload your official PDF resume in your profile before submitting an application.
                      </p>
                      <Link
                        to="/profile"
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline pt-0.5"
                      >
                        <span>Go to My Profile to Upload Resume</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Statement of Interest / Cover Letter */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Cover Letter / Statement of Interest (Optional)
                  </label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Describe why you are interested in this position and how your skills align with the requirements..."
                    rows={4}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsApplyModalOpen(false)}
                    disabled={isSubmittingApp}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    icon={Briefcase}
                    loading={isSubmittingApp}
                    disabled={!user?.profile?.studentDetails?.resumeUrl}
                    className="font-semibold"
                  >
                    Confirm & Submit Application
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InternshipsDirectoryPage;
