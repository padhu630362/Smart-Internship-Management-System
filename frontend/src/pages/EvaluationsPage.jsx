import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  Star,
  CheckCircle2,
  AlertCircle,
  Users,
  GraduationCap,
  Briefcase,
  Calendar,
  FileCheck2,
  Plus,
  Loader2,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import evaluationService, { EVALUATION_TYPES } from '../services/evaluationService';
import allocationService from '../services/allocationService';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';

export const EvaluationsPage = () => {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  const [evaluations, setEvaluations] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Evaluation Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [evaluationType, setEvaluationType] = useState('mid_term');
  const [ratings, setRatings] = useState({
    technicalSkills: 4,
    communication: 4,
    punctualityAndAttendance: 5,
    initiativeAndLearning: 4,
    qualityOfWork: 4,
  });
  const [strengths, setStrengths] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');
  const [generalComments, setGeneralComments] = useState('');
  const [recommendation, setRecommendation] = useState('recommended');
  const [isPassed, setIsPassed] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Evaluations & Allocations
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const evalRes = await evaluationService.getEvaluations();
      if (evalRes?.data?.evaluations) {
        setEvaluations(evalRes.data.evaluations);
      }

      if (!isStudent) {
        const allocRes = await allocationService.getAllocations({ limit: 100 });
        if (allocRes?.data?.allocations) {
          setAllocations(allocRes.data.allocations);
        }
      }
    } catch (err) {
      console.error('Failed to load evaluation data:', err);
      setError('Could not retrieve evaluation records from server.');
    } finally {
      setLoading(false);
    }
  }, [isStudent]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute live overall rating
  const overallAverage = (
    Object.values(ratings).reduce((a, b) => a + Number(b), 0) / 5
  ).toFixed(1);

  // Handle Form Submission
  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    if (!selectedAllocation) return;

    try {
      setSubmitting(true);
      await evaluationService.createEvaluation({
        allocationId: selectedAllocation._id,
        evaluationType,
        ratings,
        feedback: {
          strengths,
          areasForImprovement,
          generalComments,
        },
        recommendation,
        isPassed,
      });

      setShowModal(false);
      resetForm();
      await fetchData();
    } catch (err) {
      alert(err?.response?.data?.error?.message || 'Failed to submit evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedAllocation(null);
    setEvaluationType('mid_term');
    setRatings({
      technicalSkills: 4,
      communication: 4,
      punctualityAndAttendance: 5,
      initiativeAndLearning: 4,
      qualityOfWork: 4,
    });
    setStrengths('');
    setAreasForImprovement('');
    setGeneralComments('');
    setRecommendation('recommended');
    setIsPassed(true);
  };

  const openEvaluationModal = (alloc, type = 'mid_term') => {
    setSelectedAllocation(alloc);
    setEvaluationType(type);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={isStudent ? 'My Internship Appraisals' : 'Student Internship Evaluations'}
        description={
          isStudent
            ? 'Review formal performance assessments, mentor ratings, and academic feedback.'
            : 'Submit formal mid-term and final performance reviews for assigned interns.'
        }
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Evaluations' }]}
        badge={<StatusBadge status="healthy" label="ACADEMIC APPRAISALS" size="sm" />}
      />

      {loading ? (
        <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          <span>Loading evaluation records...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* MENTOR / COMPANY / COORDINATOR ROSTER VIEW */}
          {/* ======================================================== */}
          {!isStudent && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span>Interns Requiring Evaluation</span>
                    <span className="text-xs text-slate-400 font-normal">
                      {allocations.length} total assigned interns
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Conduct mid-term milestone reviews and final university academic sign-offs
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {allocations.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No active intern allocations found for your account.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                          <tr>
                            <th className="p-3">Student Intern</th>
                            <th className="p-3">Internship Title</th>
                            <th className="p-3">Duration</th>
                            <th className="p-3">Mid-Term Status</th>
                            <th className="p-3">Final Status</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {allocations.map((alloc) => {
                            const allocEvals = evaluations.filter(
                              (e) => (e.allocation?._id || e.allocation) === alloc._id
                            );
                            const midTermDone = allocEvals.some((e) => e.evaluationType === 'mid_term');
                            const finalDone = allocEvals.some((e) => e.evaluationType === 'final');

                            return (
                              <tr key={alloc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                                <td className="p-3">
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {alloc.student?.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    {alloc.student?.email}
                                  </p>
                                </td>
                                <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                  {alloc.internship?.title}
                                </td>
                                <td className="p-3 text-slate-500 font-mono text-[11px]">
                                  {alloc.startDate ? new Date(alloc.startDate).toISOString().split('T')[0] : ''} -{' '}
                                  {alloc.endDate ? new Date(alloc.endDate).toISOString().split('T')[0] : ''}
                                </td>
                                <td className="p-3">
                                  {midTermDone ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Completed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                                      <Clock className="w-3.5 h-3.5" />
                                      Pending
                                    </span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {finalDone ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Completed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                                      <Clock className="w-3.5 h-3.5" />
                                      Pending
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right space-x-1">
                                  {!midTermDone && (
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={() => openEvaluationModal(alloc, 'mid_term')}
                                    >
                                      Submit Mid-Term
                                    </Button>
                                  )}
                                  {!finalDone && (
                                    <Button
                                      size="xs"
                                      onClick={() => openEvaluationModal(alloc, 'final')}
                                    >
                                      Submit Final
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ======================================================== */}
          {/* EVALUATIONS LIST / CARDS VIEW */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isStudent ? 'Evaluations History' : 'Submitted Appraisals Log'}
            </h3>

            {evaluations.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-slate-400 text-xs">
                  <Award className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    No evaluations submitted yet
                  </p>
                  <p className="mt-1">
                    Performance reviews will appear here once mentors or coordinators complete assessments.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evaluations.map((ev) => (
                  <Card key={ev._id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                          {ev.evaluationType === 'mid_term' ? 'Mid-Term Evaluation' : 'Final Evaluation'}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500 font-black text-sm">
                          <Star className="w-4 h-4 fill-amber-500" />
                          <span>{ev.ratings?.overallRating} / 5.0</span>
                        </div>
                      </div>
                      <CardTitle className="text-base font-bold mt-2">
                        {ev.student?.name || 'Intern'}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {ev.internship?.title || 'Internship'} • Evaluator: {ev.evaluator?.name} ({ev.evaluator?.role})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0 text-xs">
                      {/* Rating Pillars Breakdown */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                        <div>
                          <span className="text-slate-400 block">Technical Skills:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {ev.ratings?.technicalSkills} / 5
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Communication:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {ev.ratings?.communication} / 5
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Punctuality:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {ev.ratings?.punctualityAndAttendance} / 5
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Quality of Work:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {ev.ratings?.qualityOfWork} / 5
                          </span>
                        </div>
                      </div>

                      {/* Feedback remarks */}
                      {ev.feedback?.generalComments && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-500 block">
                            Evaluator Comments:
                          </span>
                          <p className="text-slate-700 dark:text-slate-300 italic text-[11px] mt-0.5">
                            "{ev.feedback.generalComments}"
                          </p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          Recommendation: <b className="capitalize text-slate-700 dark:text-slate-300">{ev.recommendation?.replace('_', ' ')}</b>
                        </span>
                        <span className="text-slate-400 font-mono">
                          {ev.submittedAt ? new Date(ev.submittedAt).toISOString().split('T')[0] : ''}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* EVALUATION SUBMISSION MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Submit ${evaluationType === 'mid_term' ? 'Mid-Term' : 'Final'} Internship Appraisal`}
        description={`Performance review for ${selectedAllocation?.student?.name} (${selectedAllocation?.internship?.title})`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitEvaluation} className="space-y-4">
          {/* Live Overall Score Banner */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Calculated Overall Rating
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Automatic average across all 5 evaluation competency criteria
              </p>
            </div>
            <div className="text-2xl font-black text-amber-500 flex items-center gap-1">
              <Star className="w-6 h-6 fill-amber-500" />
              <span>{overallAverage} / 5.0</span>
            </div>
          </div>

          {/* Rating Sliders */}
          <div className="space-y-3">
            {[
              { id: 'technicalSkills', label: 'Technical Competence & Execution' },
              { id: 'communication', label: 'Communication & Team Collaboration' },
              { id: 'punctualityAndAttendance', label: 'Punctuality, Reliability & Attendance' },
              { id: 'initiativeAndLearning', label: 'Problem Solving & Initiative' },
              { id: 'qualityOfWork', label: 'Quality of Deliverables & Accuracy' },
            ].map((pillar) => (
              <div key={pillar.id} className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1">
                  {pillar.label}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={ratings[pillar.id]}
                    onChange={(e) =>
                      setRatings((prev) => ({ ...prev, [pillar.id]: parseInt(e.target.value, 10) }))
                    }
                    className="w-32 accent-brand-600 cursor-pointer"
                  />
                  <span className="w-8 text-center text-xs font-black text-brand-600 dark:text-brand-400">
                    {ratings[pillar.id]} / 5
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Written Feedback Comments */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Key Strengths (Optional)
            </label>
            <textarea
              rows={2}
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="Notable strengths exhibited during internship term..."
              maxLength={1000}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              General Appraisal Remarks & Recommendations
            </label>
            <textarea
              rows={3}
              value={generalComments}
              onChange={(e) => setGeneralComments(e.target.value)}
              placeholder="Overall performance appraisal, project completion remarks..."
              maxLength={2000}
              required
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-hidden"
            />
          </div>

          {/* Recommendation & Academic Credit Pass */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Final Recommendation
              </label>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-hidden"
              >
                <option value="highly_recommended">Highly Recommended (Top Tier)</option>
                <option value="recommended">Recommended (Proficient)</option>
                <option value="satisfactory">Satisfactory (Meets Requirements)</option>
                <option value="needs_improvement">Needs Improvement</option>
                <option value="not_recommended">Not Recommended</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isPassed}
                  onChange={(e) => setIsPassed(e.target.checked)}
                  className="rounded-sm border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>Sign off for university academic credits</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Official Appraisal'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EvaluationsPage;
