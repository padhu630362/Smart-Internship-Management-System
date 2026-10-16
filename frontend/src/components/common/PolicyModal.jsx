import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  Lock,
  Cookie,
  X,
  CheckCircle2,
  ExternalLink,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';
import Button from './Button';

export const PolicyModal = ({ isOpen, onClose, initialTab = 'privacy' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  const tabs = [
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
    { id: 'terms', label: 'Terms of Service', icon: FileText },
    { id: 'security', label: 'Security & Compliance', icon: Lock },
    { id: 'cookies', label: 'Cookie & Data Policy', icon: Cookie },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl surface-card border border-champagne-300 dark:border-burgundy-900/60 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-champagne-200/90 dark:border-warmdark-800 bg-champagne-50/50 dark:bg-warmdark-850">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-burgundy-50 dark:bg-burgundy-950/60 text-burgundy-700 dark:text-champagne-300 border border-burgundy-200 dark:border-burgundy-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                Legal, Privacy & Governance Center
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Official policies governing the InternHub Platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-champagne-100 dark:hover:bg-warmdark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-champagne-200/80 dark:border-warmdark-800 bg-white/50 dark:bg-warmdark-900 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-burgundy-600 text-white shadow-burgundy'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-champagne-50 dark:hover:bg-warmdark-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
          {activeTab === 'privacy' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-burgundy-50/60 dark:bg-burgundy-950/40 border border-burgundy-200 dark:border-burgundy-900/60 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-burgundy-600 dark:text-champagne-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-white text-xs">
                    InternHub Student & User Privacy Standard
                  </h4>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">
                    Your personal information, uploaded resumes, authentication credentials, and internship application records are stored securely and never sold, shared with third-party advertisers, or used for commercial profiling.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">1. Data Collected & Purpose</h3>
                <p>
                  InternHub collects only information necessary to facilitate internship allocations, credit verification, and candidate evaluation:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-stone-600 dark:text-stone-400">
                  <li><strong>Student Profiles:</strong> Full name, verified email, academic department, CGPA, graduation year, and uploaded CV/resumes.</li>
                  <li><strong>Attendance Logs:</strong> Daily check-in/out timestamps, remote/on-site status, and accomplishment summaries.</li>
                  <li><strong>Employer Postings:</strong> Company details, contact representatives, and job descriptions.</li>
                  <li><strong>Evaluation Rubrics:</strong> Faculty mentor performance ratings, structured feedback, and completion certificate records.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">2. AI Resume Screening & Matching Engine</h3>
                <p>
                  When students upload resumes or apply for opportunities, InternHub utilizes secure AI models to analyze keyword relevance against job descriptions.
                  Resume text sent for analysis is processed via transient, encrypted backend API calls and is never used to train public foundational models.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">3. Information Sharing & Isolation</h3>
                <p>
                  Company recruiters can only view applications specifically submitted to their organization. Faculty mentors are granted access strictly to their assigned student cohorts.
                  System administrators retain oversight strictly for accreditation, credit compliance, and audit logging.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">4. Data Retention & Deletion</h3>
                <p>
                  Academic records and completion certificate cryptographic hashes are retained to support transcript verifications.
                  Students can request account deactivation and resume removal through their profile settings at any time.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-5 animate-in fade-in">
              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">1. Acceptance of Terms</h3>
                <p>
                  By accessing InternHub, you agree to comply with institutional academic regulations,
                  student honor codes, and applicable employment nondiscrimination guidelines.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">2. Stakeholder Responsibilities</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl border border-champagne-200 dark:border-warmdark-700 bg-white/70 dark:bg-warmdark-850">
                    <span className="font-bold text-stone-900 dark:text-white block mb-1">Students & Interns</span>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400">
                      Must provide accurate resume credentials, log honest daily attendance hours, fulfill assigned workplace tasks, and uphold institutional integrity.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-champagne-200 dark:border-warmdark-700 bg-white/70 dark:bg-warmdark-850">
                    <span className="font-bold text-stone-900 dark:text-white block mb-1">Host Employers</span>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400">
                      Must post genuine internship opportunities, provide constructive mentorship, honor agreed stipends, and submit objective end-of-term evaluations.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">3. Academic Credit & Certification</h3>
                <p>
                  Completion certificates issued by InternHub require meeting minimum attendance thresholds (standard 80%) and satisfactory faculty mentor approval.
                  Falsification of attendance logs or deliverable submissions is subject to disciplinary action under institutional policies.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">4. Account Termination</h3>
                <p>
                  Administrators reserve the right to suspend or revoke access for any user violating workplace safety standards, harassment policies, or engaging in credential falsification.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-white text-xs">
                    Multi-Layered Enterprise Defense
                  </h4>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">
                    Every API request is guarded by stateless HS256 JWT authorization, NoSQL injection sanitizers, Helmet security headers, and immutable audit trails.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">1. Cryptographic Authentication</h3>
                <p>
                  Passwords are encrypted using native scrypt with individual salt keys. Authentication tokens are issued as tamper-evident JSON Web Tokens (JWT) with strict expiration limits.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">2. Immutable Audit Logging</h3>
                <p>
                  All administrative actions, grade/status adjustments, and attendance corrections are permanently recorded in the system audit log with timestamps, IP addresses, and user identifiers.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">3. Public Certificate Verification</h3>
                <p>
                  Digital certificates generate a unique SHA-256 verification hash and code. Third parties can verify authenticity in real time without exposing internal student records.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-5 animate-in fade-in">
              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">1. How We Use Cookies & Local Storage</h3>
                <p>
                  InternHub uses strictly necessary storage mechanisms required for platform operation:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-stone-600 dark:text-stone-400">
                  <li><strong>Authentication Token:</strong> Stored in encrypted browser storage (<code className="font-mono">sims_auth_token</code>) to preserve your logged-in session.</li>
                  <li><strong>Theme Preferences:</strong> Stores dark/light mode preference without tracking personal identities.</li>
                  <li><strong>Push Notification Tokens:</strong> Created only when you explicitly grant browser push notification permission.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">2. No Third-Party Tracking</h3>
                <p>
                  InternHub contains zero marketing pixels, zero advertising trackers, and zero behavioral monitoring scripts. Your activity stays entirely within our secure database cluster.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-champagne-200/90 dark:border-warmdark-800 bg-champagne-50/40 dark:bg-warmdark-850 flex items-center justify-between text-[11px] text-stone-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Effective Date: Academic Year 2026–2027</span>
          </div>
          <Button variant="champagne" size="sm" onClick={onClose} className="text-xs font-bold">
            Close & Acknowledge
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PolicyModal;

