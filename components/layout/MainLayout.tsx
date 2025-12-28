import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

interface MainLayoutProps {
  children: React.ReactNode;
  taskCount: number;
  onOpenAddLead: () => void;
  onOpenUpload: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  taskCount,
  onOpenAddLead,
  onOpenUpload,
}) => {
  // Listen for sidebar collapse state changes from localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('op_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('op_sidebar_collapsed');
      setSidebarCollapsed(saved ? JSON.parse(saved) : false);
    };

    // Listen for storage events from other tabs
    window.addEventListener('storage', handleStorageChange);

    // Poll for changes in same tab (localStorage doesn't trigger events in same tab)
    const interval = setInterval(() => {
      const saved = localStorage.getItem('op_sidebar_collapsed');
      const newValue = saved ? JSON.parse(saved) : false;
      if (newValue !== sidebarCollapsed) {
        setSidebarCollapsed(newValue);
      }
    }, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [sidebarCollapsed]);

  return (
    <div
      className={`min-h-screen bg-slate-50 pb-24 md:pb-0 transition-all duration-500 ${
        sidebarCollapsed ? 'md:pl-24' : 'md:pl-64'
      } flex flex-col`}
    >
      <Sidebar
        taskCount={taskCount}
        onOpenAddLead={onOpenAddLead}
        onOpenUpload={onOpenUpload}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-12">{children}</main>

      <MobileNav taskCount={taskCount} />
    </div>
  );
};

export default MainLayout;
