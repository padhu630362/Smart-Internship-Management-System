import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  Lock,
  Cookie,
  Radio,
  ExternalLink,
  Sparkles,
  Award,
  Briefcase,
  GraduationCap,
  Building2,
  Users,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Clock,
  LogIn,
  ArrowUpRight,
  Heart,
  User,
  UserPlus,
} from 'lucide-react';
import SimsLogo from './common/SimsLogo';
import PolicyModal from './common/PolicyModal';

export const Footer = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('privacy');

  const openPolicy = (tab = 'privacy') => {
    setModalTab(tab);
    setModalOpen(true);
  };

  const socialLinks = [
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      ),
      hoverClass: 'hover:text-[#0077b5] hover:bg-[#0077b5]/10 hover:border-[#0077b5]/40',
      tooltip: 'Connect on LinkedIn',
    },
    {
      name: 'GitHub',
      url: 'https://github.com/padhu630362/Smart-Internship-Management-System',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
        </svg>
      ),
      hoverClass: 'hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/80 dark:hover:bg-warmdark-700 hover:border-stone-400',
      tooltip: 'View Source Code on GitHub',
    },
    {
      name: 'Twitter / X',
      url: 'https://twitter.com',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      hoverClass: 'hover:text-sky-500 hover:bg-sky-500/10 hover:border-sky-500/40',
      tooltip: 'Follow Announcements on X',
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      ),
      hoverClass: 'hover:text-[#e1306c] hover:bg-[#e1306c]/10 hover:border-[#e1306c]/40',
      tooltip: 'Follow Campus Stories on Instagram',
    },
    {
      name: 'Discord / Community',
      url: 'https://discord.com',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
      hoverClass: 'hover:text-[#5865f2] hover:bg-[#5865f2]/10 hover:border-[#5865f2]/40',
      tooltip: 'Join Student & Mentor Community',
    },
  ];

  return (
    <>
      <footer className="border-t border-champagne-300/80 dark:border-burgundy-900/60 bg-gradient-to-b from-[#fcfaf7] via-white to-champagne-50/50 dark:from-[#12090d] dark:via-[#150d11] dark:to-[#0a0407] text-stone-600 dark:text-stone-400 text-xs transition-colors mt-auto">
        {/* Main 5-Column Footer Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
            {/* Column 1: Brand & Social Media (Spans 2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <SimsLogo size="md" />
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed max-w-sm">
                Next-generation institutional internship governance unifying students, host employers, faculty mentors,
                and academic coordinators with intelligent AI resume screening, attendance logging, and verifiable certificates.
              </p>

              {/* Social Media Accounts with Highlighting & Hover Effects */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-stone-900 dark:text-white uppercase tracking-wider block">
                  Connect & Social Channels
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {socialLinks.map((s) => (
                    <a
                      key={s.name}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={s.tooltip}
                      className={`p-2 rounded-xl border border-stone-200 dark:border-warmdark-750 bg-white dark:bg-warmdark-850 text-stone-600 dark:text-stone-300 transition-all duration-200 shadow-2xs hover:scale-110 hover:shadow-md ${s.hoverClass}`}
                      aria-label={s.name}
                    >
                      {s.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Quick Access & Portals */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                Portals & Login
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/login"
                    className="group inline-flex items-center gap-1.5 hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-stone-400 group-hover:text-burgundy-600 dark:group-hover:text-champagne-400" />
                    <span>Login</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="group inline-flex items-center gap-1.5 hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-stone-400 group-hover:text-burgundy-600 dark:group-hover:text-champagne-400" />
                    <span>Sign Up</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/verify-certificate"
                    className="group inline-flex items-center gap-1.5 hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors"
                  >
                    <Award className="w-3.5 h-3.5 text-champagne-600" />
                    <span>Verify Certificate</span>
                  </Link>
                </li>
                <li>
                  <a
                    href="/#contact"
                    className="group inline-flex items-center gap-1.5 hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-stone-400 group-hover:text-burgundy-600 dark:group-hover:text-champagne-400" />
                    <span>Contact Support</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Live Feeds & AI Modules */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                Live Feeds & AI
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/internships"
                    className="group inline-flex items-center gap-1.5 hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-stone-400 group-hover:text-burgundy-600 dark:group-hover:text-champagne-400" />
                    <span>Internships Directory</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/external-jobs"
                    className="group inline-flex items-center gap-1.5 hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors"
                  >
                    <Radio className="w-3.5 h-3.5 text-burgundy-600" />
                    <span>LinkedIn & Tech Radar</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/chat"
                    className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors"
                  >
                    Direct & Group Chat
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Administration */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-stone-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-burgundy-600 dark:text-champagne-400" />
                <span>Contact & Administration</span>
              </h4>
              <ul className="space-y-2 text-stone-600 dark:text-stone-400 text-xs">
                <li className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>
                    Arshad:{' '}
                    <a href="mailto:arshad@gmail.com" className="hover:text-burgundy-700 dark:hover:text-champagne-300 font-medium">
                      arshad@gmail.com
                    </a>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>
                    Padmavathi:{' '}
                    <a href="mailto:padhu@gmail.com" className="hover:text-burgundy-700 dark:hover:text-champagne-300 font-medium">
                      padhu@gmail.com
                    </a>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>
                    Phone:{' '}
                    <a href="tel:9030787884" className="hover:text-burgundy-700 dark:hover:text-champagne-300 font-medium">
                      9030787884
                    </a>
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Copyright, Policies & Status */}
          <div className="border-t border-champagne-200/90 dark:border-warmdark-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <div className="text-stone-500 flex items-center gap-1.5">
              <span>© {new Date().getFullYear()} <strong>InternHub</strong>.</span>
              <span className="hidden sm:inline">Built with</span>
              <Heart className="w-3 h-3 text-burgundy-600 fill-burgundy-600 hidden sm:inline" />
              <span className="hidden sm:inline">for Career & Academic Growth.</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-stone-500">
              <button
                type="button"
                onClick={() => openPolicy('privacy')}
                className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors"
              >
                Privacy
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => openPolicy('terms')}
                className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors"
              >
                Terms
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => openPolicy('security')}
                className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors"
              >
                Security
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => openPolicy('cookies')}
                className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors"
              >
                Cookies
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Modal for Full Policies Reading */}
      <PolicyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTab={modalTab}
      />
    </>
  );
};

export default Footer;
