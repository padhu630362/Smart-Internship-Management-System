import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  Lock,
  Cookie,
  Activity,
  Radio,
  Clock,
  ExternalLink,
  Terminal,
  Cpu,
  Database,
  Server,
  Sparkles,
  Award,
  Briefcase,
  GraduationCap,
  Building2,
  Users,
  CheckCircle2,
} from 'lucide-react';
import SimsLogo from './common/SimsLogo';
import PolicyModal from './common/PolicyModal';
import { useSocket } from '../context/SocketContext';

export const Footer = ({ healthStatus }) => {
  const { isConnected } = useSocket();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('privacy');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Live real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const openPolicy = (tab = 'privacy') => {
    setModalTab(tab);
    setModalOpen(true);
  };

  const isDbConnected = healthStatus?.database?.connected !== false;

  return (
    <>
      <footer className="border-t border-champagne-300/80 dark:border-burgundy-900/60 bg-gradient-to-b from-[#fcfaf7] to-white dark:from-[#12090d] dark:to-[#0a0407] text-stone-600 dark:text-stone-400 text-xs transition-colors mt-auto">
        {/* Real-Time Live Telemetry Bar */}
        <div className="border-b border-champagne-200/80 dark:border-warmdark-800 bg-champagne-50/70 dark:bg-warmdark-900/80 py-2.5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px]">
            {/* Live Socket Status */}
            <div className="flex items-center gap-2 font-medium">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {isConnected ? 'Real-Time WebSocket Connected' : 'Real-Time Telemetry Active'}
              </span>
              <span className="text-stone-400 hidden sm:inline">•</span>
              <span className="text-stone-500 hidden sm:inline">Socket.IO Push Daemon Online</span>
            </div>

            {/* Server Health & Live Ticking Clock */}
            <div className="flex items-center gap-4 font-mono text-[11px] text-stone-500 dark:text-stone-400">
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-burgundy-600 dark:text-champagne-400" />
                <span>API: <strong className="text-stone-700 dark:text-stone-300">Port 5001</strong></span>
              </div>

              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>DB: <strong className={isDbConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}>
                  {isDbConnected ? 'Active' : 'Standby'}
                </strong></span>
              </div>

              <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
                <Clock className="w-3.5 h-3.5 text-champagne-600" />
                <span>{currentDateTime.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main 4-Column Footer Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
            {/* Column 1: Brand & Mission (Spans 2 cols) */}
            <div className="lg:col-span-2 space-y-3.5">
              <SimsLogo size="md" />
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed max-w-sm">
                Next-generation institutional internship governance unifying students, host employers, faculty mentors,
                and academic coordinators with Gemini AI resume screening, attendance logging, and verifiable certificates.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-burgundy-50 dark:bg-burgundy-950/60 text-burgundy-800 dark:text-champagne-300 border border-burgundy-200 dark:border-burgundy-900/60 text-[10px] font-semibold">
                  <Sparkles className="w-3 h-3 text-burgundy-600 dark:text-champagne-400" />
                  <span>Burgundy + Champagne UI System</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-champagne-100/70 dark:bg-warmdark-800 text-stone-700 dark:text-champagne-300 border border-champagne-300 dark:border-warmdark-700 text-[10px] font-mono font-medium">
                  v1.0.0
                </span>
              </div>
            </div>

            {/* Column 2: Portals & Workspaces */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                Workspaces
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/my-applications" className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-stone-400" />
                    <span>Student Portal</span>
                  </Link>
                </li>
                <li>
                  <Link to="/company/applications" className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Employer Pipeline</span>
                  </Link>
                </li>
                <li>
                  <Link to="/manage/attendance" className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    <span>Mentor Workspace</span>
                  </Link>
                </li>
                <li>
                  <Link to="/admin/users" className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                    <span>Coordinator Console</span>
                  </Link>
                </li>
                <li>
                  <Link to="/verify-certificate" className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-champagne-600" />
                    <span>Verify Credentials</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Opportunities & Real-Time Feeds */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                Live Feeds & AI
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/internships" className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-stone-400" />
                    <span>Internships Directory</span>
                  </Link>
                </li>
                <li>
                  <Link to="/external-jobs" className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-burgundy-600" />
                    <span>LinkedIn & Remote Jobs</span>
                  </Link>
                </li>
                <li>
                  <Link to="/notifications" className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors">
                    Real-Time Alerts & Sync
                  </Link>
                </li>
                <li>
                  <Link to="/chat" className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors">
                    Live Mentor Chat Channels
                  </Link>
                </li>
                <li>
                  <Link to="/roadmap" className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors">
                    6-Phase Architecture Roadmap
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Privacy, Governance & Policies */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-stone-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-burgundy-600" />
                <span>Privacy & Governance</span>
              </h4>
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => openPolicy('privacy')}
                    className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors text-left flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-stone-400" />
                    <span>Privacy Policy</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openPolicy('terms')}
                    className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors text-left flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-stone-400" />
                    <span>Terms of Service</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openPolicy('security')}
                    className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors text-left flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-stone-400" />
                    <span>Security & Compliance</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openPolicy('cookies')}
                    className="hover:text-burgundy-700 dark:hover:text-champagne-300 transition-colors text-left flex items-center gap-1.5"
                  >
                    <Cookie className="w-3.5 h-3.5 text-stone-400" />
                    <span>Cookie Policy</span>
                  </button>
                </li>
                <li>
                  <Link to="/policies" className="text-burgundy-700 dark:text-champagne-300 font-semibold hover:underline flex items-center gap-1 pt-1 text-[11px]">
                    <span>View Full Policy Center</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Copyright, Links & Operational Status */}
          <div className="border-t border-champagne-200/90 dark:border-warmdark-800 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
            <div className="text-stone-500">
              © {new Date().getFullYear()} <strong>Smart Internship Management System (SIMS)</strong>. All rights reserved.
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
