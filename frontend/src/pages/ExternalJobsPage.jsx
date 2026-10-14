import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  Sparkles,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  RefreshCw,
  Globe,
  MapPin,
  Clock,
  Building2,
  Award,
  ChevronRight,
  X,
  Share2,
  FileEdit,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import externalJobService from '../services/externalJobService';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import LoadingState from '../components/common/LoadingState';

export const ExternalJobsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const isStudent = user?.role === 'student';

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'recommended' | 'saved' | 'applied'
  const [jobs, setJobs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [availableSources, setAvailableSources] = useState([]);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('');
  const [selectedRemote, setSelectedRemote] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [selectedJobDetail, setSelectedJobDetail] = useState(null);
  const [notesJob, setNotesJob] = useState(null);
  const [notesText, setNotesText] = useState('');

  // Fetch standard jobs list
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 12,
        q: searchQuery || undefined,
        jobType: selectedJobType || undefined,
        isRemote: selectedRemote !== '' ? selectedRemote : undefined,
        source: selectedSource || undefined,
      };

      if (activeTab === 'saved') params.savedOnly = 'true';
      if (activeTab === 'applied') params.appliedOnly = 'true';

      const res = await externalJobService.getExternalJobs(params);
      if (res?.success) {
        setJobs(res.data.jobs || []);
        setAvailableSources(res.data.sources || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalCount(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch external jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedJobType, selectedRemote, selectedSource, activeTab]);

  // Fetch student personalized recommendations
  const fetchRecommendations = useCallback(async () => {
    if (!isAuthenticated || !isStudent) return;
    try {
      setLoading(true);
      const res = await externalJobService.getRecommendations({ limit: 12 });
      if (res?.success) {
        setRecommendations(res.data.recommendations || []);
      }
    } catch (err) {
      console.error('Failed to fetch AI recommendations:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isStudent]);

  // Fetch saved & applied interactions
  const fetchInteractions = useCallback(async () => {
    if (!isAuthenticated || !isStudent) return;
    try {
      const res = await externalJobService.getMyInteractions();
      if (res?.success) {
        setSavedJobs(res.data.bookmarked || []);
        setAppliedJobs(res.data.applied || []);
      }
    } catch (err) {
      console.error('Failed to fetch user job interactions:', err);
    }
  }, [isAuthenticated, isStudent]);

  useEffect(() => {
    if (activeTab === 'recommended') {
      fetchRecommendations();
    } else {
      fetchJobs();
    }
    if (isAuthenticated && isStudent) {
      fetchInteractions();
    }
  }, [activeTab, fetchJobs, fetchRecommendations, fetchInteractions, isAuthenticated, isStudent]);

  // Handle manual sync
  const handleSyncFeeds = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      const res = await externalJobService.syncJobs(true);
      if (res?.success) {
        setSyncMessage(`Synced ${res.data.newCount} new opportunities!`);
        fetchJobs();
        if (isStudent) fetchRecommendations();
      }
    } catch (err) {
      setSyncMessage('Sync check completed with current feeds.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  // Toggle bookmark action
  const handleToggleBookmark = async (jobId) => {
    if (!isAuthenticated) {
      alert('Please log in as a student to bookmark opportunities.');
      return;
    }
    try {
      const res = await externalJobService.toggleBookmark(jobId);
      if (res?.success) {
        const isBookmarked = res.data.isBookmarked;
        setJobs((prev) =>
          prev.map((j) => (j._id === jobId ? { ...j, isBookmarked } : j))
        );
        setRecommendations((prev) =>
          prev.map((j) => (j._id === jobId ? { ...j, isBookmarked } : j))
        );
        fetchInteractions();
      }
    } catch (err) {
      console.error('Bookmark error:', err);
    }
  };

  // Toggle applied action
  const handleToggleApplied = async (jobId) => {
    if (!isAuthenticated) {
      alert('Please log in as a student to track applications.');
      return;
    }
    try {
      const res = await externalJobService.toggleApplied(jobId);
      if (res?.success) {
        const isApplied = res.data.isApplied;
        const appliedAt = res.data.appliedAt;
        setJobs((prev) =>
          prev.map((j) => (j._id === jobId ? { ...j, isApplied, appliedAt } : j))
        );
        setRecommendations((prev) =>
          prev.map((j) => (j._id === jobId ? { ...j, isApplied, appliedAt } : j))
        );
        fetchInteractions();
      }
    } catch (err) {
      console.error('Apply toggle error:', err);
    }
  };

  // Save notes
  const handleSaveNotes = async () => {
    if (!notesJob) return;
    try {
      await externalJobService.updateJobNotes(notesJob._id, notesText);
      setNotesJob(null);
      fetchInteractions();
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  const displayedList = activeTab === 'recommended' ? recommendations : jobs;

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Header with Burgundy + Champagne Glow */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-burgundy-900 via-burgundy-700 to-champagne-700 p-8 sm:p-10 text-white shadow-xl shadow-burgundy-900/20">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-champagne-300/40 text-xs font-bold tracking-wide uppercase text-champagne-200">
            <Sparkles className="w-3.5 h-3.5 text-champagne-300 animate-pulse" />
            <span>Real-Time Job & Internship Radar</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Discover Live Opportunities & Cross-Check on LinkedIn
          </h1>

          <p className="text-sm sm:text-base text-champagne-100 leading-relaxed max-w-2xl font-normal">
            Aggregated from verified authorized tech career networks and matched to your academic skill set using Google Gemini AI. Every opportunity includes deep links directly into LinkedIn’s official job ecosystem.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSyncFeeds}
              disabled={syncing}
              icon={RefreshCw}
              className={`bg-champagne-100 hover:bg-white text-stone-900 border-champagne-300 shadow-md ${
                syncing ? 'animate-pulse' : ''
              }`}
            >
              {syncing ? 'Syncing Live Feeds...' : 'Sync Opportunities Now'}
            </Button>

            {syncMessage && (
              <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-500/80 text-white backdrop-blur-md">
                {syncMessage}
              </span>
            )}
          </div>
        </div>

        {/* Ambient Decorative Shapes */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-champagne-400/10 blur-2xl pointer-events-none" />
        <div className="absolute right-20 -bottom-16 w-80 h-80 rounded-full bg-burgundy-600/30 blur-3xl pointer-events-none" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-peach-200/80 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-stone-600 hover:text-stone-900 hover:bg-peach-50 dark:text-stone-400 dark:hover:bg-warmdark-850'
            }`}
          >
            All Live Positions ({totalCount})
          </button>

          {isStudent && (
            <button
              type="button"
              onClick={() => setActiveTab('recommended')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'recommended'
                  ? 'bg-gradient-to-r from-burgundy-700 to-champagne-600 text-white shadow-md shadow-champagne-500/25'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-champagne-50 dark:text-stone-400 dark:hover:bg-warmdark-850'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-champagne-300" />
              <span>AI Match Recommendations</span>
            </button>
          )}

          {isStudent && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('saved');
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'bg-champagne-600 text-stone-900 shadow-md shadow-champagne-500/25'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-champagne-50 dark:text-stone-400 dark:hover:bg-warmdark-850'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved ({savedJobs.length})</span>
            </button>
          )}

          {isStudent && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('applied');
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'applied'
                  ? 'bg-burgundy-700 text-white shadow-md shadow-burgundy-900/25'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-champagne-50 dark:text-stone-400 dark:hover:bg-warmdark-850'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Applied Tracker ({appliedJobs.length})</span>
            </button>
          )}
        </div>

        <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
          Source: Verified Authorizations (Arbeitnow & RemoteOK)
        </div>
      </div>

      {/* Filter and Search Bar (only in 'all' view) */}
      {activeTab === 'all' && (
        <div className="surface-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by role title, technologies (React, Python, Node), or company..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-peach-200/90 dark:border-stone-700 bg-white dark:bg-warmdark-850 text-stone-800 dark:text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all placeholder:text-stone-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Job Type Filter */}
              <select
                value={selectedJobType}
                onChange={(e) => {
                  setSelectedJobType(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2.5 rounded-xl border border-peach-200/90 dark:border-stone-700 bg-white dark:bg-warmdark-850 text-stone-800 dark:text-stone-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">All Job Types</option>
                <option value="internship">Internship Only</option>
                <option value="entry-level">Entry-Level / Junior</option>
                <option value="full-time">Full-Time</option>
                <option value="contract">Contract</option>
              </select>

              {/* Remote Filter */}
              <select
                value={selectedRemote}
                onChange={(e) => {
                  setSelectedRemote(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2.5 rounded-xl border border-peach-200/90 dark:border-stone-700 bg-white dark:bg-warmdark-850 text-stone-800 dark:text-stone-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">Workplace: All</option>
                <option value="true">100% Remote Only</option>
                <option value="false">Onsite / Hybrid</option>
              </select>

              {/* Provider Source */}
              {availableSources.length > 1 && (
                <select
                  value={selectedSource}
                  onChange={(e) => {
                    setSelectedSource(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2.5 rounded-xl border border-peach-200/90 dark:border-stone-700 bg-white dark:bg-warmdark-850 text-stone-800 dark:text-stone-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <option value="">Source: All</option>
                  {availableSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid of Job Cards */}
      {loading ? (
        <LoadingState message="Fetching live opportunities and computing AI match scores..." />
      ) : displayedList.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={
            activeTab === 'saved'
              ? 'No saved jobs yet'
              : activeTab === 'applied'
              ? 'No applied positions tracked yet'
              : 'No opportunities found'
          }
          description="Try broadening your search query or click 'Sync Opportunities Now' to fetch recent openings."
          actionText={activeTab !== 'all' ? 'Browse All Opportunities' : 'Sync Feeds'}
          onAction={activeTab !== 'all' ? () => setActiveTab('all') : handleSyncFeeds}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedList.map((job) => {
            const hasScore = typeof job.matchScore === 'number';
            const score = job.matchScore || 0;

            return (
              <div
                key={job._id}
                className="surface-card p-6 flex flex-col justify-between hover:border-peach-400 hover:shadow-peach transition-all duration-200 group relative"
              >
                {/* Top Meta Bar */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {/* Source Attribution Badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-peach-50 dark:bg-peach-950/60 text-peach-700 dark:text-peach-300 border border-peach-200/80 dark:border-peach-800/40">
                      <Globe className="w-2.5 h-2.5" />
                      {job.source}
                    </span>

                    {/* AI Match Score Badge (for students) */}
                    {hasScore && (
                      <button
                        type="button"
                        onClick={() => setSelectedJobDetail(job)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs transition-transform hover:scale-105 ${
                          score >= 75
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                            : score >= 50
                            ? 'bg-gradient-to-r from-peach-500 to-brand-500 text-white'
                            : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                        }`}
                        title="Click to view AI Match Explanation"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{score}% Match</span>
                      </button>
                    )}
                  </div>

                  {/* Title & Company */}
                  <h3 className="text-base font-bold text-stone-900 dark:text-white line-clamp-2 group-hover:text-brand-600 transition-colors">
                    {job.title}
                  </h3>

                  <div className="flex items-center gap-2 mt-1.5 text-xs text-stone-600 dark:text-stone-300 font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>{job.company}</span>
                  </div>

                  {/* Location & Remote Tag */}
                  <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs text-stone-500 dark:text-stone-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      {job.location}
                    </span>
                    {job.isRemote && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium text-[10px]">
                        Remote
                      </span>
                    )}
                    <span className="capitalize px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-medium">
                      {job.jobType}
                    </span>
                  </div>

                  {/* Snippet */}
                  <p className="mt-3 text-xs text-stone-600 dark:text-stone-300 line-clamp-3 leading-relaxed">
                    {job.snippet || 'Click to view full role description, prerequisites, and technical matching.'}
                  </p>

                  {/* Tech Tags */}
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {job.tags.slice(0, 4).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-peach-50/70 text-peach-800 dark:bg-warmdark-800 dark:text-peach-200 border border-peach-100 dark:border-stone-800"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Actions and Deep-Search Links */}
                <div className="mt-6 pt-4 border-t border-peach-100 dark:border-stone-850 space-y-2.5">
                  {/* LinkedIn Official Deep Search Button */}
                  <a
                    href={job.linkedInSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-white bg-[#0a66c2] hover:bg-[#004182] transition-colors shadow-xs"
                    title="Search and verify this job opening on LinkedIn"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    <span>Search on LinkedIn</span>
                  </a>

                  {/* Actions Row: Details, Save, Apply */}
                  <div className="flex items-center gap-2">
                    {/* View Details / AI Match Breakdown */}
                    <button
                      type="button"
                      onClick={() => setSelectedJobDetail(job)}
                      className="flex-1 py-1.5 px-3 rounded-xl border border-peach-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-peach-50 dark:hover:bg-warmdark-850 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>Analysis</span>
                      <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                    </button>

                    {/* Direct Apply Button */}
                    <a
                      href={job.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3 rounded-xl gradient-brand text-white text-xs font-semibold flex items-center justify-center gap-1 hover:opacity-95 shadow-xs transition-all"
                      title="Open source application page"
                    >
                      <span>Apply</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    {/* Bookmark Toggle (Student) */}
                    {isStudent && (
                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(job._id)}
                        className={`p-2 rounded-xl border transition-colors ${
                          job.isBookmarked
                            ? 'bg-peach-50 border-peach-300 text-peach-600 dark:bg-peach-950/40 dark:text-peach-300'
                            : 'border-peach-200 text-stone-400 hover:text-stone-700 dark:border-stone-700'
                        }`}
                        title={job.isBookmarked ? 'Remove bookmark' : 'Save opportunity'}
                      >
                        {job.isBookmarked ? (
                          <BookmarkCheck className="w-4 h-4 fill-current text-peach-500" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Mark as Applied Toggle (Student) */}
                    {isStudent && (
                      <button
                        type="button"
                        onClick={() => handleToggleApplied(job._id)}
                        className={`p-2 rounded-xl border transition-colors ${
                          job.isApplied
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-peach-200 text-stone-400 hover:text-stone-700 dark:border-stone-700'
                        }`}
                        title={job.isApplied ? 'Applied' : 'Mark as applied'}
                      >
                        <CheckCircle2
                          className={`w-4 h-4 ${job.isApplied ? 'text-emerald-600' : ''}`}
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {activeTab === 'all' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 px-3">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

      {/* Detailed Inspection & AI Fit Modal */}
      {selectedJobDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-in fade-in-50 duration-150">
          <div className="surface-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedJobDetail(null)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-warmdark-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-peach-50 text-peach-700 border border-peach-200">
                  {selectedJobDetail.source}
                </span>
                <span className="text-xs text-stone-400 font-medium">
                  Posted {new Date(selectedJobDetail.publishedAt).toLocaleDateString()}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white">
                {selectedJobDetail.title}
              </h2>
              <p className="text-sm font-semibold text-brand-600 mt-1">
                {selectedJobDetail.company} &bull; {selectedJobDetail.location} ({selectedJobDetail.jobType})
              </p>
            </div>

            {/* Gemini AI Fit Breakdown (if student has score) */}
            {selectedJobDetail.matchRationale && (
              <div className="rounded-2xl p-5 bg-gradient-to-br from-peach-50/90 via-white to-blush-50/90 dark:from-warmdark-850 dark:via-warmdark-900 dark:to-warmdark-850 border border-peach-200/80 dark:border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-500" />
                    <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                      Personalized AI Match Analysis
                    </h4>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold text-white bg-gradient-to-r from-peach-500 to-blush-500">
                    {selectedJobDetail.matchRationale.matchScore}% &bull; {selectedJobDetail.matchRationale.recommendationLevel}
                  </span>
                </div>

                <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
                  {selectedJobDetail.matchRationale.fitReason}
                </p>

                {/* Skills Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-white/80 dark:bg-stone-900/60 border border-emerald-200/60 dark:border-emerald-900/40">
                    <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Matched Skills
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedJobDetail.matchRationale.matchedSkills?.length > 0 ? (
                        selectedJobDetail.matchRationale.matchedSkills.map((s, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-100"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-stone-400">Broad technical foundation</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/80 dark:bg-stone-900/60 border border-blush-200/60 dark:border-blush-900/40">
                    <p className="text-[11px] font-bold text-blush-700 dark:text-blush-400 mb-1.5 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      Target Skills to Highlight
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedJobDetail.matchRationale.missingSkills?.length > 0 ? (
                        selectedJobDetail.matchRationale.missingSkills.map((s, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-blush-50 text-blush-800 border border-blush-100"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-stone-400">All key skills matched!</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-stone-400 flex items-center justify-between pt-1">
                  <span>Engine: {selectedJobDetail.matchRationale.engine || 'Google Gemini 1.5 Flash'}</span>
                  <span>Evaluated specifically against your student profile</span>
                </div>
              </div>
            )}

            {/* Role Full Description */}
            <div className="space-y-2">
              <h4 className="font-bold text-sm text-stone-900 dark:text-white">Role Overview</h4>
              <div className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed max-h-60 overflow-y-auto pr-2 space-y-2">
                <p>{selectedJobDetail.description}</p>
              </div>
            </div>

            {/* Action Bar inside modal */}
            <div className="pt-4 border-t border-peach-200/80 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
              <a
                href={selectedJobDetail.linkedInSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl flex items-center gap-2 text-xs font-bold text-white bg-[#0a66c2] hover:bg-[#004182] transition-colors"
              >
                <span>Search on LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedJobDetail(null)}
                >
                  Close
                </Button>
                <a
                  href={selectedJobDetail.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-4 rounded-xl gradient-brand text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-95"
                >
                  <span>Apply Now</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalJobsPage;
