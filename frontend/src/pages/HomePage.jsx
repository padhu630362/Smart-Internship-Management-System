import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  LogIn,
  UserPlus,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  Building2,
  Users,
  Brain,
  CalendarCheck,
  Award,
  MessageSquare,
  Search,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Phone,
  Mail,
  Clock,
  Send,
  Check,
  User,
  Radio,
  FileCheck2,
  Share2,
} from 'lucide-react';
import Button from '../components/common/Button';
import internshipService from '../services/internshipService';
import { useAuth } from '../context/AuthContext';

export const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [recentInternships, setRecentInternships] = useState([]);
  const [loadingInternships, setLoadingInternships] = useState(true);
  const [quickCertCode, setQuickCertCode] = useState('');
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState('all');

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    role: 'student',
    subject: '',
    message: '',
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSending, setContactSending] = useState(false);

  useEffect(() => {
    const fetchLiveInternships = async () => {
      setLoadingInternships(true);
      try {
        const res = await internshipService.getPublicInternships({ limit: 4, page: 1 });
        if (res?.data?.internships) {
          setRecentInternships(res.data.internships);
        }
      } catch {
        // Degraded fallback
      } finally {
        setLoadingInternships(false);
      }
    };
    fetchLiveInternships();
  }, []);

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    if (!quickCertCode.trim()) return;
    navigate(`/verify-certificate/${encodeURIComponent(quickCertCode.trim())}`);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactForm.email || !contactForm.message) return;
    setContactSending(true);
    setTimeout(() => {
      setContactSending(false);
      setContactSubmitted(true);
      setContactForm({
        name: '',
        email: '',
        role: 'student',
        subject: '',
        message: '',
      });
      setTimeout(() => setContactSubmitted(false), 6000);
    }, 700);
  };

  const features = [
    {
      id: 'ai-matching',
      icon: Brain,
      title: 'AI Resume Screening & Fit Radar',
      description:
        'Intelligent semantic parsing analyzes student CVs against job criteria with match percentage scores and keyword gap identification.',
      badge: 'Smart AI',
      link: '/internships',
      colorClass: 'from-burgundy-900/10 to-champagne-500/10 dark:from-burgundy-900/30 dark:to-champagne-600/20',
      borderHover: 'hover:border-champagne-400 dark:hover:border-burgundy-600',
      iconBg: 'bg-burgundy-50 dark:bg-burgundy-950/70 text-burgundy-700 dark:text-champagne-300',
    },
    {
      id: 'lifecycle',
      icon: Briefcase,
      title: 'Automated Application & Allocation',
      description:
        'End-to-end recruitment pipelines with applicant tracking, coordinator reviews, status updates, and transparent student allocations.',
      badge: 'Workflow',
      link: '/internships',
      colorClass: 'from-champagne-500/10 to-burgundy-900/10 dark:from-champagne-600/20 dark:to-burgundy-900/30',
      borderHover: 'hover:border-burgundy-400 dark:hover:border-champagne-500',
      iconBg: 'bg-champagne-100 dark:bg-warmdark-800 text-burgundy-900 dark:text-champagne-200',
    },
    {
      id: 'certificates',
      icon: Award,
      title: 'Cryptographic Digital Certificates',
      description:
        'Tamper-proof completion credentials with unique alphanumeric codes, dynamic QR verification, and public validation portals.',
      badge: 'Instant QR Verify',
      link: '/verify-certificate',
      colorClass: 'from-burgundy-900/10 to-champagne-500/10 dark:from-burgundy-900/30 dark:to-champagne-600/20',
      borderHover: 'hover:border-champagne-400 dark:hover:border-burgundy-600',
      iconBg: 'bg-burgundy-50 dark:bg-burgundy-950/70 text-burgundy-700 dark:text-champagne-300',
    },
    {
      id: 'attendance',
      icon: CalendarCheck,
      title: 'Smart Attendance & Task Tracking',
      description:
        'Structured daily check-in logs, work summary timestamps, progress percentages, and multi-tier mentor approval sign-offs.',
      badge: 'Daily Logs',
      link: '/dashboard',
      colorClass: 'from-champagne-500/10 to-burgundy-900/10 dark:from-champagne-600/20 dark:to-burgundy-900/30',
      borderHover: 'hover:border-burgundy-400 dark:hover:border-champagne-500',
      iconBg: 'bg-champagne-100 dark:bg-warmdark-800 text-burgundy-900 dark:text-champagne-200',
    },
    {
      id: 'chat',
      icon: MessageSquare,
      title: 'Real-Time Direct & Group Messaging',
      description:
        'Built-in WebSocket chat for instant, secure communication between students, industry mentors, and university coordinators.',
      badge: 'Socket.IO',
      link: '/chat',
      colorClass: 'from-burgundy-900/10 to-champagne-500/10 dark:from-burgundy-900/30 dark:to-champagne-600/20',
      borderHover: 'hover:border-champagne-400 dark:hover:border-burgundy-600',
      iconBg: 'bg-burgundy-50 dark:bg-burgundy-950/70 text-burgundy-700 dark:text-champagne-300',
    },
    {
      id: 'governance',
      icon: ShieldCheck,
      title: 'Institutional Governance & Audit Trails',
      description:
        'Strict role-based authorization (RBAC), sanitized CSV accreditation exports, and immutable administrative audit logs.',
      badge: 'Enterprise RBAC',
      link: '/admin/login',
      colorClass: 'from-champagne-500/10 to-burgundy-900/10 dark:from-champagne-600/20 dark:to-burgundy-900/30',
      borderHover: 'hover:border-burgundy-400 dark:hover:border-champagne-500',
      iconBg: 'bg-champagne-100 dark:bg-warmdark-800 text-burgundy-900 dark:text-champagne-200',
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Register & Complete Profile',
      desc: 'Students create verified accounts with academic metrics and resume uploads; employers post certified opportunities.',
      icon: GraduationCap,
    },
    {
      step: '02',
      title: 'AI Screening & Matching',
      desc: 'Smart algorithms calculate applicant fit, match skills against criteria, and assist coordinators in fair selection.',
      icon: Brain,
    },
    {
      step: '03',
      title: 'Active Internship & Mentorship',
      desc: 'Interns log daily attendance and milestone tasks while mentors review progress and converse via live chat.',
      icon: CalendarCheck,
    },
    {
      step: '04',
      title: 'Evaluation & Verifiable Certification',
      desc: 'Mid-term and final rubric evaluations generate cryptographically stamped certificates with instant QR verification.',
      icon: Award,
    },
  ];

  const socialAccounts = [
    {
      name: 'LinkedIn',
      handle: 'InternHub Platform',
      url: 'https://www.linkedin.com',
      hoverBorder: 'hover:border-[#0077b5]',
      hoverText: 'group-hover:text-[#0077b5]',
      hoverBg: 'group-hover:bg-[#0077b5]/10',
      badge: 'Professional Network',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      ),
    },
    {
      name: 'GitHub',
      handle: 'padhu630362 / InternHub',
      url: 'https://github.com/padhu630362/Smart-Internship-Management-System',
      hoverBorder: 'hover:border-stone-800 dark:hover:border-stone-300',
      hoverText: 'group-hover:text-stone-900 dark:group-hover:text-white',
      hoverBg: 'group-hover:bg-stone-500/10',
      badge: 'Source Code',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
        </svg>
      ),
    },
    {
      name: 'Twitter / X',
      handle: '@InternHub_Platform',
      url: 'https://twitter.com',
      hoverBorder: 'hover:border-sky-500',
      hoverText: 'group-hover:text-sky-500',
      hoverBg: 'group-hover:bg-sky-500/10',
      badge: 'Live Updates',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: 'Instagram',
      handle: '@internhub.campus',
      url: 'https://instagram.com',
      hoverBorder: 'hover:border-[#e1306c]',
      hoverText: 'group-hover:text-[#e1306c]',
      hoverBg: 'group-hover:bg-[#e1306c]/10',
      badge: 'Campus Stories',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      ),
    },
    {
      name: 'Discord',
      handle: 'InternHub Community Server',
      url: 'https://discord.com',
      hoverBorder: 'hover:border-[#5865f2]',
      hoverText: 'group-hover:text-[#5865f2]',
      hoverBg: 'group-hover:bg-[#5865f2]/10',
      badge: 'Community',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-24 py-6 sm:py-10 animate-in fade-in duration-300">
      {/* 1. Minimal & Focused Hero Section */}
      <section id="hero" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden border border-champagne-300/80 dark:border-burgundy-900/60 bg-gradient-to-b from-white via-champagne-50/40 to-white dark:from-[#170d11] dark:via-[#140b0e] dark:to-[#170d11] p-8 sm:p-14 lg:p-20 shadow-xl shadow-burgundy-950/5">
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-burgundy-600/10 dark:bg-burgundy-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-champagne-400/20 dark:bg-champagne-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-3xl mx-auto text-center space-y-6">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-champagne-100/90 dark:bg-burgundy-950/80 border border-champagne-300 dark:border-burgundy-800 text-xs font-semibold text-burgundy-900 dark:text-champagne-200 shadow-sm transition-transform duration-200 hover:scale-105">
              <Sparkles className="w-3.5 h-3.5 text-champagne-600 dark:text-champagne-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>InternHub Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl font-black text-stone-900 dark:text-white tracking-tight leading-[1.1]">
              Empowering Careers Through{' '}
              <span className="gradient-brand-text">Intelligent Governance</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-lg text-stone-600 dark:text-stone-300 leading-relaxed font-normal max-w-2xl mx-auto">
              A unified digital ecosystem connecting <strong>Students</strong>, <strong>Host Employers</strong>,{' '}
              <strong>Faculty Mentors</strong>, and <strong>Academic Coordinators</strong> with AI resume screening,
              daily attendance logging, real-time messaging, and verifiable digital certificates.
            </p>

            {/* Action Buttons: Clear User vs Admin Differentiation */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard">
                    <Button
                      variant="gradient"
                      size="lg"
                      icon={ArrowRight}
                      iconPosition="right"
                      className="font-bold text-sm shadow-md hover:scale-105 transition-transform"
                    >
                      Go to {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''} Dashboard
                    </Button>
                  </Link>
                  <Link to="/internships">
                    <Button variant="secondary" size="lg" icon={Briefcase} className="text-sm font-semibold hover:scale-105 transition-transform">
                      Browse Internships
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  {/* User Login CTA */}
                  <Link to="/login" id="hero-user-login-cta">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-burgundy-700 via-burgundy-800 to-burgundy-900 hover:from-burgundy-600 hover:to-burgundy-800 shadow-md shadow-burgundy-950/20 hover:shadow-lg hover:scale-105 transition-all duration-200"
                    >
                      <User className="w-4 h-4 text-champagne-300" />
                      <span>User Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>

                  {/* Admin Login CTA */}
                  <Link to="/admin/login" id="hero-admin-login-cta">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-champagne-200 bg-gradient-to-r from-burgundy-950 via-[#3a131e] to-burgundy-950 hover:from-burgundy-900 hover:to-burgundy-850 border border-champagne-400/50 shadow-md shadow-burgundy-950/40 hover:shadow-lg hover:scale-105 transition-all duration-200"
                    >
                      <ShieldCheck className="w-4 h-4 text-champagne-300" />
                      <span>Admin Portal</span>
                    </button>
                  </Link>

                  {/* Register Free */}
                  <Link to="/register">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold text-stone-700 dark:text-stone-200 bg-white/90 dark:bg-warmdark-800 border border-stone-300 dark:border-stone-700 hover:border-burgundy-600 hover:bg-champagne-50/70 transition-all duration-200 hover:scale-105"
                    >
                      <UserPlus className="w-4 h-4 text-burgundy-600 dark:text-champagne-400" />
                      <span>Create Account</span>
                    </button>
                  </Link>
                </>
              )}
            </div>

            {/* Quick Metrics Strip */}
            <div className="pt-8 border-t border-champagne-200/80 dark:border-warmdark-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="group p-2 rounded-xl transition-all hover:bg-champagne-100/50 dark:hover:bg-warmdark-800/50">
                <div className="text-xl sm:text-2xl font-black text-burgundy-800 dark:text-champagne-300 group-hover:scale-105 transition-transform">
                  4 Roles
                </div>
                <div className="text-[11px] text-stone-500 font-medium">Students, Mentors, Companies, Admins</div>
              </div>
              <div className="group p-2 rounded-xl transition-all hover:bg-champagne-100/50 dark:hover:bg-warmdark-800/50">
                <div className="text-xl sm:text-2xl font-black text-burgundy-800 dark:text-champagne-300 group-hover:scale-105 transition-transform">
                  Smart AI
                </div>
                <div className="text-[11px] text-stone-500 font-medium">Resume Match & Skill Gap Radar</div>
              </div>
              <div className="group p-2 rounded-xl transition-all hover:bg-champagne-100/50 dark:hover:bg-warmdark-800/50">
                <div className="text-xl sm:text-2xl font-black text-burgundy-800 dark:text-champagne-300 group-hover:scale-105 transition-transform">
                  Verified QR
                </div>
                <div className="text-[11px] text-stone-500 font-medium">Cryptographic Digital Certificates</div>
              </div>
              <div className="group p-2 rounded-xl transition-all hover:bg-champagne-100/50 dark:hover:bg-warmdark-800/50">
                <div className="text-xl sm:text-2xl font-black text-burgundy-800 dark:text-champagne-300 group-hover:scale-105 transition-transform">
                  Real-Time
                </div>
                <div className="text-[11px] text-stone-500 font-medium">Live Attendance & WebSocket Chat</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Animated Features Section with Rich Hover Options & Dynamic Color Changing */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-burgundy-50 dark:bg-burgundy-950/60 text-burgundy-800 dark:text-champagne-300 text-xs font-bold border border-burgundy-200 dark:border-burgundy-900/60 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-champagne-600 dark:text-champagne-400" />
            <span>Animated Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white tracking-tight">
            Engineered for Modern Internship Excellence
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            Hover over any capability or select a focus below to explore dynamic workflow tools with real-time response.
          </p>
        </div>

        {/* Interactive Feature Exploration Tabs with Dynamic Color Change */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {[
            { id: 'all', label: 'All Capabilities' },
            { id: 'ai-matching', label: 'AI Screening' },
            { id: 'lifecycle', label: 'Workflows' },
            { id: 'certificates', label: 'QR Certificates' },
            { id: 'attendance', label: 'Attendance' },
            { id: 'chat', label: 'Live Chat' },
            { id: 'governance', label: 'Audit Governance' },
          ].map((pill) => {
            const isSelected = selectedFeature === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedFeature(pill.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-burgundy-900 via-burgundy-800 to-burgundy-900 text-champagne-200 border-champagne-400/60 shadow-md shadow-burgundy-950/30 scale-105'
                    : 'bg-champagne-100/60 dark:bg-warmdark-800/70 text-stone-700 dark:text-stone-300 border-champagne-200/80 dark:border-stone-750 hover:bg-champagne-200/80 hover:text-burgundy-800 dark:hover:text-champagne-200'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Feature Cards Grid with Lift, Glow & Dynamic Color Changing Button on Hover/Explore */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features
            .filter((f) => selectedFeature === 'all' || f.id === selectedFeature)
            .map((feat, idx) => {
              const Icon = feat.icon;
              const isHovered = activeFeatureIndex === idx;
              const isSelectedFeature = selectedFeature === feat.id;

              return (
                <Link
                  to={feat.link}
                  key={feat.id}
                  onMouseEnter={() => setActiveFeatureIndex(idx)}
                  onMouseLeave={() => setActiveFeatureIndex(null)}
                  className={`group relative rounded-3xl p-7 border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between ${
                    isHovered || isSelectedFeature
                      ? 'transform -translate-y-2.5 shadow-2xl shadow-burgundy-950/15 border-champagne-400 dark:border-burgundy-600 bg-white dark:bg-[#1a1114]'
                      : 'border-champagne-200/90 dark:border-warmdark-800 bg-white/90 dark:bg-[#150d10]/90 shadow-soft'
                  }`}
                >
                  {/* Background Gradient Accent on Hover */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feat.colorClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                  />

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                      {/* Animated Icon Container */}
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm ${feat.iconBg}`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-all duration-300 border ${
                          isHovered || isSelectedFeature
                            ? 'bg-champagne-300/90 text-burgundy-950 border-champagne-400 shadow-xs'
                            : 'bg-champagne-100/90 dark:bg-warmdark-800 text-burgundy-900 dark:text-champagne-300 border-champagne-300/80 dark:border-stone-700'
                        }`}
                      >
                        {feat.badge}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-stone-900 dark:text-white group-hover:text-burgundy-700 dark:group-hover:text-champagne-300 transition-colors">
                      {feat.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed font-normal">
                      {feat.description}
                    </p>
                  </div>

                  {/* Button with Color Changing when on that feature / exploring it */}
                  <div className="relative z-10 pt-4 mt-4 border-t border-champagne-200/60 dark:border-warmdark-800/80">
                    <div
                      className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-between transition-all duration-300 ${
                        isHovered || isSelectedFeature
                          ? 'bg-gradient-to-r from-burgundy-700 via-burgundy-850 to-burgundy-900 text-champagne-100 border-champagne-400/60 shadow-md shadow-burgundy-950/20 scale-[1.02]'
                          : 'bg-champagne-50/80 dark:bg-warmdark-800/60 text-stone-700 dark:text-stone-300 border-champagne-200/80 dark:border-stone-700 hover:border-burgundy-500'
                      }`}
                    >
                      <span>Explore {feat.badge}</span>
                      <ArrowRight
                        className={`w-4 h-4 transition-transform duration-300 ${
                          isHovered || isSelectedFeature ? 'translate-x-1 text-champagne-300' : 'text-stone-400'
                        }`}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>
      </section>

      {/* 3. How It Works (4-Step Lifecycle with Hover Glow) */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-champagne-100/80 dark:bg-warmdark-800 text-stone-800 dark:text-champagne-300 text-xs font-bold border border-champagne-300 dark:border-warmdark-700">
            <CalendarCheck className="w-3.5 h-3.5 text-champagne-600 dark:text-champagne-400" />
            <span>Step-by-Step Execution</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white tracking-tight">
            How The System Works
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            From registration and AI screening to active attendance and verifiable completion.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {workflowSteps.map((stepItem, idx) => {
            const StepIcon = stepItem.icon;
            return (
              <div
                key={idx}
                className="group p-6 rounded-3xl border border-champagne-200/80 dark:border-warmdark-800 bg-white/95 dark:bg-[#170d11]/90 shadow-soft hover:shadow-card hover:border-champagne-400 transition-all duration-300 space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black font-mono text-champagne-400 dark:text-burgundy-800/80 group-hover:text-burgundy-600 transition-colors">
                    {stepItem.step}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-champagne-50 dark:bg-burgundy-950/60 text-burgundy-700 dark:text-champagne-300 flex items-center justify-center border border-champagne-200 dark:border-burgundy-900">
                    <StepIcon className="w-5 h-5" />
                  </div>
                </div>

                <h3 className="font-bold text-base text-stone-900 dark:text-white group-hover:text-burgundy-700 dark:group-hover:text-champagne-300 transition-colors">
                  {stepItem.title}
                </h3>

                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  {stepItem.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Live Featured Internships Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-burgundy-700 dark:text-champagne-300">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Active Industry Openings</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight">
              Featured Opportunities
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Directly fetched from the live database. Apply instantly using your profile & resume.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/internships">
              <Button variant="secondary" size="sm" icon={ExternalLink} iconPosition="right" className="text-xs font-semibold">
                Explore All Internships
              </Button>
            </Link>
            <Link to="/external-jobs">
              <Button variant="champagne" size="sm" icon={Search} className="text-xs font-semibold">
                Live Tech Radar
              </Button>
            </Link>
          </div>
        </div>

        {loadingInternships ? (
          <div className="p-8 text-center rounded-2xl border border-champagne-200/80 bg-white dark:bg-[#1a1114] text-xs text-stone-500">
            Fetching active listings from database...
          </div>
        ) : recentInternships.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentInternships.map((opp) => (
              <div
                key={opp._id}
                className="group p-5 rounded-2xl border border-champagne-200/90 dark:border-warmdark-750 bg-white dark:bg-[#1a1114] hover:border-champagne-400 dark:hover:border-burgundy-700 shadow-soft hover:shadow-card transition-all duration-200 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-champagne-100 dark:bg-warmdark-800 text-stone-700 dark:text-champagne-300">
                      {opp.workMode || 'Hybrid'}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">
                      {opp.openings} opening{opp.openings > 1 ? 's' : ''}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-white line-clamp-1 group-hover:text-burgundy-700 dark:group-hover:text-champagne-300 transition-colors">
                    {opp.title}
                  </h4>
                  <div className="text-stone-600 dark:text-stone-400 font-medium text-xs">
                    {opp.companyName}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-stone-500">
                    <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                    <span className="truncate">{opp.location || 'Flexible'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-champagne-200/60 dark:border-warmdark-800 flex items-center justify-between">
                  <div className="font-bold font-mono text-burgundy-800 dark:text-champagne-300 text-xs">
                    {opp.stipend?.amount ? `₹${opp.stipend.amount}/mo` : 'Stipend based'}
                  </div>
                  <Link to={`/internships`}>
                    <Button variant="primary" size="sm" className="text-xs px-3 py-1">
                      Apply
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl border border-champagne-200/80 bg-white dark:bg-[#1a1114] space-y-2 text-xs text-stone-500">
            <p>No active postings found in this instance yet.</p>
            <Link to="/register?role=company">
              <Button variant="champagne" size="sm" icon={Building2}>
                Post Company Opening
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* 5. Public Certificate Verification Quick Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-champagne-300 dark:border-burgundy-900/60 p-8 sm:p-10 bg-gradient-to-r from-champagne-50/70 via-white to-burgundy-50/40 dark:from-[#170d11] dark:via-[#150d10] dark:to-[#170d11] shadow-card">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-burgundy-800 dark:text-champagne-300">
                <Award className="w-4 h-4 text-champagne-600" />
                <span>Public Verification Gateway</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
                Verify an Issued Internship Certificate
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Employers, universities, and regulatory authorities can instantly validate credential authenticity
                using the alphanumeric certificate code.
              </p>
            </div>

            <form onSubmit={handleVerifySubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5 w-full lg:w-auto">
              <input
                type="text"
                placeholder="e.g. IH-2026-A1B2C3"
                value={quickCertCode}
                onChange={(e) => setQuickCertCode(e.target.value)}
                className="p-3 rounded-2xl border border-champagne-300 dark:border-warmdark-700 bg-white dark:bg-warmdark-900 text-xs font-mono tracking-wider text-stone-900 dark:text-white min-w-[240px] focus:ring-2 focus:ring-burgundy-500 focus:outline-none"
              />
              <Button type="submit" variant="gradient" size="md" icon={ShieldCheck} className="text-xs font-semibold whitespace-nowrap shadow-sm">
                Verify Credential
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* 6. Dedicated Contact & Social Media Section */}
      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-champagne-100/80 dark:bg-warmdark-800 text-stone-800 dark:text-champagne-300 text-xs font-bold border border-champagne-300 dark:border-warmdark-700">
            <Phone className="w-3.5 h-3.5 text-champagne-600 dark:text-champagne-400" />
            <span>Connect & Support</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white tracking-tight">
            Get in Touch & Social Channels
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            Reach our institutional helpdesk or connect across all official social media platforms.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Contact Cards & Social Accounts (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Contact Information Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="group p-5 rounded-2xl border border-champagne-200/90 dark:border-warmdark-800 bg-white dark:bg-[#1a1114] shadow-soft hover:shadow-card hover:border-champagne-400 transition-all duration-200 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-burgundy-50 dark:bg-burgundy-950/60 text-burgundy-700 dark:text-champagne-300 flex items-center justify-center border border-burgundy-200 dark:border-burgundy-800">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">System Administrator</div>
                <div className="text-sm font-bold text-stone-900 dark:text-white">
                  Arshad:{' '}
                  <a href="mailto:arshad@gmail.com" className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors">
                    arshad@gmail.com
                  </a>
                </div>
                <div className="text-[11px] text-stone-500">Official administration & inquiries</div>
              </div>

              <div className="group p-5 rounded-2xl border border-champagne-200/90 dark:border-warmdark-800 bg-white dark:bg-[#1a1114] shadow-soft hover:shadow-card hover:border-champagne-400 transition-all duration-200 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-burgundy-50 dark:bg-burgundy-950/60 text-burgundy-700 dark:text-champagne-300 flex items-center justify-center border border-burgundy-200 dark:border-burgundy-800">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">System Administrator</div>
                <div className="text-sm font-bold text-stone-900 dark:text-white">
                  Padmavathi:{' '}
                  <a href="mailto:padhu@gmail.com" className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors">
                    padhu@gmail.com
                  </a>
                </div>
                <div className="text-[11px] text-stone-500">Official administration & inquiries</div>
              </div>

              <div className="group p-5 rounded-2xl border border-champagne-200/90 dark:border-warmdark-800 bg-white dark:bg-[#1a1114] shadow-soft hover:shadow-card hover:border-champagne-400 transition-all duration-200 space-y-2 sm:col-span-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-champagne-100 dark:bg-warmdark-800 text-burgundy-900 dark:text-champagne-300 flex items-center justify-center border border-champagne-300 dark:border-stone-700 shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Direct Helpline</div>
                    <div className="text-base font-bold text-stone-900 dark:text-white font-mono">
                      Phone:{' '}
                      <a href="tel:9030787884" className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors">
                        9030787884
                      </a>
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      Direct contact phone for support and institutional inquiries
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media Channel Cards with Interactive Hover Animations */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-burgundy-600 dark:text-champagne-400" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                  Official Social Accounts & Channels
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {socialAccounts.map((account) => (
                  <a
                    key={account.name}
                    href={account.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group p-3.5 rounded-2xl border border-stone-200 dark:border-warmdark-800 bg-white dark:bg-[#1a1114] shadow-2xs hover:shadow-md transition-all duration-200 flex items-center justify-between ${account.hoverBorder}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl border border-stone-200 dark:border-warmdark-700 text-stone-600 dark:text-stone-300 transition-all duration-200 ${account.hoverText} ${account.hoverBg}`}
                      >
                        {account.icon}
                      </div>
                      <div>
                        <div className={`text-xs font-bold text-stone-900 dark:text-white ${account.hoverText} transition-colors`}>
                          {account.name}
                        </div>
                        <div className="text-[11px] text-stone-500 truncate max-w-[150px]">
                          {account.handle}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-champagne-100/70 dark:bg-warmdark-800 text-stone-600 dark:text-stone-300 border border-champagne-200 dark:border-stone-750">
                      {account.badge}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Feedback & Inquiry Form (5 Cols) */}
          <div className="lg:col-span-5 rounded-3xl p-6 sm:p-8 border border-champagne-300/80 dark:border-burgundy-900/60 bg-white dark:bg-[#1a1114] shadow-card space-y-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-burgundy-800 dark:text-champagne-300">
                <Send className="w-3.5 h-3.5 text-champagne-600" />
                <span>Instant Inquiry</span>
              </div>
              <h3 className="text-xl font-black text-stone-900 dark:text-white">
                Send Us a Message
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Have a question regarding internship allocation, company registration, or credit verification?
              </p>
            </div>

            {contactSubmitted ? (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900 text-center space-y-2 animate-in fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                  Message Dispatched Successfully!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Thank you for reaching out. Our academic coordinator desk will reply to your registered email shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-warmdark-700 bg-stone-50/50 dark:bg-warmdark-850 text-xs text-stone-900 dark:text-white focus:ring-2 focus:ring-burgundy-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@university.edu or name@company.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-warmdark-700 bg-stone-50/50 dark:bg-warmdark-850 text-xs text-stone-900 dark:text-white focus:ring-2 focus:ring-burgundy-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Your Role
                    </label>
                    <select
                      value={contactForm.role}
                      onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-warmdark-700 bg-stone-50/50 dark:bg-warmdark-850 text-xs text-stone-900 dark:text-white focus:ring-2 focus:ring-burgundy-500 focus:outline-none"
                    >
                      <option value="student">Student / Intern</option>
                      <option value="company">Employer / Recruiter</option>
                      <option value="mentor">Faculty Mentor</option>
                      <option value="coordinator">Academic Coordinator</option>
                      <option value="other">Other / Verification Agency</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      placeholder="Topic of inquiry"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-warmdark-700 bg-stone-50/50 dark:bg-warmdark-850 text-xs text-stone-900 dark:text-white focus:ring-2 focus:ring-burgundy-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Message
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe your inquiry or support request..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-warmdark-700 bg-stone-50/50 dark:bg-warmdark-850 text-xs text-stone-900 dark:text-white focus:ring-2 focus:ring-burgundy-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={contactSending}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-burgundy-700 to-burgundy-850 hover:bg-burgundy-800 transition-all duration-200 shadow-sm flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{contactSending ? 'Dispatching Message...' : 'Send Message to Coordinator'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
