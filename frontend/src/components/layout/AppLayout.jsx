import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import PublicNavbar from './PublicNavbar';
import Footer from '../Footer';

export const AppLayout = ({ children, healthStatus, onOpenLogin }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isHome = location.pathname === '/';
  const isAuthPage = ['/login', '/admin/login', '/register'].includes(location.pathname);

  // If this is the minimal public landing page
  if (isHome) {
    return (
      <div className="min-h-screen bg-[#fcfaf7] dark:bg-[#12090d] text-stone-900 dark:text-stone-100 flex flex-col transition-colors duration-200">
        {/* Sleek Minimal Public Navigation Bar */}
        <PublicNavbar />

        {/* Full-width Landing Page Content */}
        <main className="flex-1 w-full">
          {children}
        </main>

        {/* Enhanced Footer with Social Media & Contact */}
        <Footer healthStatus={healthStatus} />
      </div>
    );
  }

  // If this is an authentication page (User Login, Admin Login, Register)
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-[#fcfaf7] dark:bg-[#12090d] text-stone-900 dark:text-stone-100 flex flex-col transition-colors duration-200">
        <main className="w-full flex-1">
          {children}
        </main>
      </div>
    );
  }

  // Standard Internal Platform & Dashboard Layout with Sidebar
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Workspace Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        healthStatus={healthStatus}
      />

      {/* Main Workspace Area with Sidebar Offset */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-0">
        {/* Workspace Top Navbar */}
        <TopNavbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          healthStatus={healthStatus}
          onOpenLogin={onOpenLogin}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Platform Footer */}
        <Footer healthStatus={healthStatus} />
      </div>
    </div>
  );
};

export default AppLayout;
