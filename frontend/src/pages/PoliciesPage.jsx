import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  Lock,
  Cookie,
  Calendar,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Share2,
  Download,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';

export const PoliciesPage = () => {
  const location = useLocation();

  // Determine active tab from URL path
  const getTabFromPath = () => {
    if (location.pathname.includes('/privacy')) return 'privacy';
    if (location.pathname.includes('/terms')) return 'terms';
    if (location.pathname.includes('/security')) return 'security';
    if (location.pathname.includes('/cookies')) return 'cookies';
    return 'privacy';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath());

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const tabs = [
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck, path: '/privacy' },
    { id: 'terms', label: 'Terms of Service', icon: FileText, path: '/terms' },
    { id: 'security', label: 'Security & Compliance', icon: Lock, path: '/security-policy' },
    { id: 'cookies', label: 'Cookie Policy', icon: Cookie, path: '/cookies' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2 animate-in fade-in">
      <PageHeader
        title="Privacy, Governance & Terms Center"
        description="Comprehensive compliance documentation, student privacy standards, and stakeholder obligations."
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Legal Policies' }]}
        badge={
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-champagne-100 dark:bg-burgundy-950/60 text-burgundy-900 dark:text-champagne-300 border border-champagne-300 dark:border-burgundy-800">
            SECURE PRIVACY STANDARD
          </span>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 space-y-2">
          <div className="surface-card p-3 rounded-2xl border border-champagne-200/90 dark:border-warmdark-700 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={['w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold transition-all text-left', isActive ? 'bg-burgundy-600 text-white shadow-burgundy' : 'text-stone-700 dark:text-stone-300 hover:bg-champagne-50 dark:hover:bg-warmdark-800'].join(' ')}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="surface-card p-4 rounded-2xl border border-champagne-200/80 dark:border-warmdark-700 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-stone-900 dark:text-white font-bold">
              <Calendar className="w-3.5 h-3.5 text-burgundy-600" />
              <span>Effective Period</span>
            </div>
            <p className="text-[11px] text-stone-500">
              Current Version 2.4. Effective across all host partner networks for 2026.
            </p>
          </div>
        </div>

        {/* Content Pane */}
        <div className="md:col-span-3 surface-card p-6 sm:p-8 rounded-3xl border border-champagne-200/90 dark:border-warmdark-700 space-y-6 text-xs text-stone-700 dark:text-stone-300 leading-relaxed shadow-soft">
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="border-b border-champagne-200 dark:border-warmdark-700 pb-4">
                <h2 className="text-xl font-black text-stone-900 dark:text-white">
                  Student & User Privacy Policy
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  How InternHub safeguards personal credentials, resumes, and internship records.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-burgundy-50 dark:bg-burgundy-950/40 border border-burgundy-200 dark:border-burgundy-900/60 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-burgundy-600 dark:text-champagne-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-stone-900 dark:text-white block mb-0.5">
                    Strict Student Data Confidentiality
                  </span>
                  <p className="text-stone-600 dark:text-stone-400 text-[11px]">
                    We treat all student applications, GPA records, and mentor feedback with the highest degree of confidential security. Student data is never sold or used for behavioral ad targeting.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">1. Scope of Data Collection</h3>
                <p>
                  To facilitate internship placements, university credit compliance, and mentor appraisals, the system collects:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-stone-600 dark:text-stone-400">
                  <li><strong>Profile Credentials:</strong> Name, institutional email, phone number, department, CGPA, graduation timeline, and skills.</li>
                  <li><strong>Uploaded Curricula Vitae (CV/Resumes):</strong> Stored securely in dedicated storage folders with restricted access tokens.</li>
                  <li><strong>Daily Attendance Records:</strong> Check-in and check-out timestamps, work logs, and remote vs. on-site tags.</li>
                  <li><strong>Evaluations & Appraisals:</strong> Rubric-based grades, qualitative mentor recommendations, and certificate histories.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">2. Artificial Intelligence & Resume Processing</h3>
                <p>
                  Students opting to use the AI Resume Analysis feature consent to having their uploaded resume text analyzed by secure, enterprise-grade AI algorithms.
                  This analysis extracts skill proficiencies and compares them to employer job requirements.
                  Resume data is transmitted over TLS with zero persistent retention by third-party model trainers.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">3. Role-Based Access Boundaries</h3>
                <p>
                  Access to records is strictly partitioned by role:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-stone-600 dark:text-stone-400">
                  <li><strong>Host Companies:</strong> Can inspect only applications and interns actively assigned to their opportunities.</li>
                  <li><strong>Faculty Mentors:</strong> Restricted to observing and grading their designated student advisees.</li>
                  <li><strong>Institutional Coordinators & Admins:</strong> High-level oversight for compliance, regulatory reports, and audit trail validation.</li>
                </ul>
              </section>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-6">
              <div className="border-b border-champagne-200 dark:border-warmdark-700 pb-4">
                <h2 className="text-xl font-black text-stone-900 dark:text-white">
                  Terms of Service & Code of Conduct
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Binding rules and guidelines governing all platform participants.
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">1. Academic Honesty & Integrity</h3>
                <p>
                  Students are expected to submit truthful resume details, authentic attendance logs, and genuine deliverable progress notes.
                  Fabrication of internship attendance or plagiarism in work summaries constitutes a direct violation of university policy.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">2. Employer Obligations</h3>
                <p>
                  Partner companies must maintain safe, non-discriminatory work environments, provide meaningful professional learning experiences,
                  and deliver evaluations in accordance with institutional accreditation deadlines.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">3. Certificate Issuance & Revocation</h3>
                <p>
                  Digital certificates are officially granted only upon successful completion of required hours and passing mentor ratings.
                  The university administration reserves the right to revoke any certificate obtained through fraudulent representation.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="border-b border-champagne-200 dark:border-warmdark-700 pb-4">
                <h2 className="text-xl font-black text-stone-900 dark:text-white">
                  Security Architecture & Compliance
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Technical defenses and controls safeguarding institutional data.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-stone-900 dark:text-white block mb-0.5">
                    End-to-End Cryptographic Protection
                  </span>
                  <p className="text-stone-600 dark:text-stone-400 text-[11px]">
                    Every communication between frontend, Express backend, and MongoDB is encrypted using industry-standard TLS 1.3.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">1. Authentication Controls</h3>
                <p>
                  Passwords are encrypted with native scrypt key derivation. All session tokens are issued as stateless HS256 JWTs with 7-day lifespans and automatic expiration revoking.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">2. Rate Limiting & DoS Protection</h3>
                <p>
                  Authentication endpoints enforce strict sliding-window rate limiters, preventing brute-force password guessing and token enumeration.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">3. Public Verifiable Credentials</h3>
                <p>
                  Issued certificates embed SHA-256 digital signatures that allow instant verification via public verification links without leaking student records.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-6">
              <div className="border-b border-champagne-200 dark:border-warmdark-700 pb-4">
                <h2 className="text-xl font-black text-stone-900 dark:text-white">
                  Cookie & Browser Storage Policy
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  How browser storage is utilized solely for essential functional operations.
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">1. Necessary Storage Only</h3>
                <p>
                  InternHub does not use any third-party marketing, analytics, or behavioral cookies. We use only strictly necessary local storage:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-stone-600 dark:text-stone-400">
                  <li><code className="font-mono text-burgundy-700 dark:text-champagne-300">sims_auth_token</code>: Authenticated session token.</li>
                  <li><code className="font-mono text-burgundy-700 dark:text-champagne-300">theme</code>: Dark/light mode interface preference.</li>
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoliciesPage;

