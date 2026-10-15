import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import Footer from '../Footer';

export const AppLayout = ({ children, healthStatus, onOpenLogin }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 ${
        isLoginPage ? 'h-screen overflow-hidden' : ''
      }`}
    >
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        healthStatus={healthStatus}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col lg:pl-64 ${isLoginPage ? 'h-screen overflow-hidden' : 'min-h-0'}`}>
        {/* Top Navbar */}
        <TopNavbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          healthStatus={healthStatus}
          onOpenLogin={onOpenLogin}
        />

        {/* Dynamic Page Content */}
        <main
          className={`flex-1 max-w-7xl w-full mx-auto ${
            isLoginPage
              ? 'p-2 sm:p-4 flex flex-col justify-center items-center overflow-hidden'
              : 'px-4 sm:px-6 lg:px-8 py-8'
          }`}
        >
          {children}
        </main>

        {/* Real-Time Footer */}
        {!isLoginPage && <Footer healthStatus={healthStatus} />}
      </div>
    </div>
  );
};

export default AppLayout;
