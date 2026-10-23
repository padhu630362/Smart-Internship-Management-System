import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Menu,
  X,
  LayoutDashboard,
  User,
  UserPlus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import SimsLogo from '../common/SimsLogo';
import ThemeToggle from '../common/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

export const PublicNavbar = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  // Track active section as user scrolls through the page
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      const featuresEl = document.getElementById('features');
      const howItWorksEl = document.getElementById('how-it-works');

      const scrollPos = window.scrollY + 220;

      if (howItWorksEl && scrollPos >= howItWorksEl.offsetTop) {
        setActiveSection('how-it-works');
      } else if (featuresEl && scrollPos >= featuresEl.offsetTop) {
        setActiveSection('features');
      } else {
        setActiveSection('hero');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filtered navigation: only Home, Features, How It Works with perfectly balanced spacing
  const navItems = [
    { name: 'Home', id: 'hero' },
    { name: 'Features', id: 'features' },
    { name: 'How It Works', id: 'how-it-works' },
  ];

  const handleNavClick = (id) => {
    setMobileMenuOpen(false);
    setActiveSection(id);
    if (location.pathname === '/') {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 dark:bg-[#12090d]/95 backdrop-blur-md shadow-md shadow-burgundy-950/10 border-b border-champagne-300/80 dark:border-burgundy-900/70'
          : 'bg-white/85 dark:bg-[#12090d]/85 backdrop-blur-sm border-b border-champagne-200/60 dark:border-burgundy-950/50'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3 sm:gap-4">
        {/* 1. Left Column: Brand Logo (Proportionally balanced) */}
        <div className="flex-1 flex items-center justify-start">
          <Link
            to="/"
            className="flex items-center gap-2 group transition-transform duration-200 hover:scale-105"
            aria-label="InternHub Home"
          >
            <SimsLogo size="md" />
          </Link>
        </div>

        {/* 2. Center Column: Evenly Spread Navigation Buttons with Dynamic Color Changing */}
        <nav className="hidden md:flex flex-initial items-center justify-center">
          <div className="flex items-center gap-2 p-1.5 rounded-full bg-champagne-100/70 dark:bg-warmdark-800/80 border border-champagne-200/80 dark:border-stone-750 backdrop-blur-md shadow-2xs">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`relative px-5 py-2 rounded-full text-xs sm:text-sm transition-all duration-300 font-semibold select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-burgundy-900 via-burgundy-850 to-burgundy-900 text-champagne-200 border border-champagne-400/50 shadow-md shadow-burgundy-950/25 scale-105 font-bold'
                      : 'text-stone-700 dark:text-stone-300 hover:text-burgundy-800 dark:hover:text-champagne-200 hover:bg-white/80 dark:hover:bg-warmdark-700 border border-transparent'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="flex items-center gap-1.5">
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-champagne-400 animate-pulse" />
                    )}
                    <span>{item.name}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* 3. Right Column: Theme Toggle, Login & Sign Up */}
        <div className="flex-1 flex items-center justify-end gap-2.5 sm:gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-burgundy-700 to-burgundy-900 hover:from-burgundy-600 hover:to-burgundy-800 shadow-sm shadow-burgundy-950/30 transition-all duration-200 hover:scale-105"
            >
              <LayoutDashboard className="w-4 h-4 text-champagne-300" />
              <span className="hidden sm:inline">My Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Link>
          ) : (
            <div className="hidden sm:flex items-center gap-2.5">
              {/* Login Button */}
              <Link
                to="/login"
                id="public-login-btn"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 bg-white dark:bg-warmdark-850 border border-stone-300/80 dark:border-stone-700 hover:border-burgundy-600 dark:hover:border-champagne-400 hover:text-white hover:bg-gradient-to-r hover:from-burgundy-700 hover:to-burgundy-850 hover:shadow-md transition-all duration-300 shadow-2xs hover:scale-105"
                title="Sign in to your InternHub account"
              >
                <User className="w-4 h-4 text-burgundy-600 dark:text-champagne-400 group-hover:text-white" />
                <span>Login</span>
              </Link>

              {/* Sign Up Button */}
              <Link
                to="/register"
                id="public-signup-btn"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-burgundy-700 to-burgundy-900 hover:from-burgundy-600 hover:to-burgundy-800 shadow-sm shadow-burgundy-950/30 transition-all duration-200 hover:scale-105"
                title="Create a new InternHub account"
              >
                <UserPlus className="w-4 h-4 text-champagne-300" />
                <span>Sign Up</span>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-champagne-100 dark:hover:bg-warmdark-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-champagne-300/80 dark:border-burgundy-900/60 bg-white/98 dark:bg-[#150d11]/98 backdrop-blur-xl px-4 py-5 space-y-4 animate-in slide-in-from-top duration-200 shadow-xl">
          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                    isActive
                      ? 'bg-gradient-to-r from-burgundy-900 to-burgundy-850 text-champagne-200 border border-champagne-400/40 shadow-sm'
                      : 'text-stone-800 dark:text-stone-200 hover:bg-champagne-100/80 dark:hover:bg-warmdark-800'
                  }`}
                >
                  <span>{item.name}</span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-champagne-400" />}
                </button>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-champagne-200 dark:border-warmdark-800 space-y-2.5">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 bg-champagne-50/50 dark:bg-warmdark-800 hover:bg-champagne-100 transition-colors"
                >
                  <User className="w-4 h-4 text-burgundy-600 dark:text-champagne-400" />
                  <span>Login</span>
                </Link>

                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-burgundy-700 to-burgundy-850 hover:bg-burgundy-800 transition-colors shadow-sm"
                >
                  <UserPlus className="w-4 h-4 text-champagne-300" />
                  <span>Sign Up</span>
                </Link>
              </>
            ) : (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-burgundy-800 hover:bg-burgundy-700"
              >
                <LayoutDashboard className="w-4 h-4 text-champagne-300" />
                <span>Go to Dashboard ({user?.role})</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicNavbar;
