import React, { memo, useCallback, useState } from 'react';
import {
  Users,
  LayoutDashboard,
  Plus,
  Rocket,
  Zap,
  PieChart,
  ChevronLeft,
  Menu,
  UserPlus,
  SearchCode,
  CheckSquare,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation, View } from '../../contexts/NavigationContext';

interface SidebarProps {
  taskCount: number;
  onOpenAddLead: () => void;
  onOpenUpload: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ taskCount, onOpenAddLead, onOpenUpload }) => {
  const { profile, signOut } = useAuth();
  const { currentView, navigate } = useNavigation();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('op_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem('op_sidebar_collapsed', JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 bg-white border-r border-slate-200 z-50 transition-all duration-500 ${isCollapsed ? 'w-24' : 'w-64'
        } shadow-2xl shadow-slate-200/50`}
    >
      {/* Header */}
      <div className="p-8 border-b border-slate-100 flex items-center justify-between">
        {!isCollapsed && (
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-3 animate-in fade-in tracking-tighter">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Rocket size={20} className="text-white fill-white" />
            </div>
            OutreachPilot
          </h1>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-xl hover:bg-slate-50 text-slate-400 transition-all ${isCollapsed ? 'mx-auto' : ''
            }`}
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-5 space-y-3">
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'dashboard'}
          onClick={() => navigate('dashboard')}
          icon={<LayoutDashboard size={20} />}
          label="Overview"
          color="indigo"
        />
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'leads'}
          onClick={() => navigate('leads')}
          icon={<Users size={20} />}
          label="Pipeline"
          color="emerald"
        />
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'finder'}
          onClick={() => navigate('finder')}
          icon={<SearchCode size={20} />}
          label="Find Leads"
          color="amber"
        />
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'queue'}
          onClick={() => navigate('queue')}
          icon={<CheckSquare size={20} />}
          label="Daily Tasks"
          color="rose"
          badge={taskCount > 0 ? taskCount : undefined}
        />
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'reporting'}
          onClick={() => navigate('reporting')}
          icon={<PieChart size={20} />}
          label="Reporting"
          color="blue"
        />
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'strategies'}
          onClick={() => navigate('strategies')}
          icon={<Zap size={20} />}
          label="Strategies"
          color="purple"
        />
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'profile'}
          onClick={() => navigate('profile')}
          icon={<Users size={20} />}
          label="Profile"
          color="slate"
        />
      </nav>

      {/* Actions */}
      <div className="p-6 space-y-3">
        <button
          onClick={onOpenAddLead}
          className={`w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 font-black py-4 rounded-2xl transition-all shadow-sm ${isCollapsed ? 'px-0' : 'px-4'
            }`}
        >
          <UserPlus size={20} />
          {!isCollapsed && (
            <span className="animate-in fade-in text-xs uppercase tracking-widest">
              New Lead
            </span>
          )}
        </button>
        <button
          onClick={onOpenUpload}
          className={`w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 ${isCollapsed ? 'px-0' : 'px-4'
            }`}
        >
          <Plus size={20} />
          {!isCollapsed && (
            <span className="animate-in fade-in text-xs uppercase tracking-widest">
              Import CSV
            </span>
          )}
        </button>
      </div>

      {/* User info & sign out */}
      <div className="p-6 border-t border-slate-100">
        {!isCollapsed && profile && (
          <div className="mb-3 text-xs text-slate-500 truncate">{profile.email}</div>
        )}
        <button
          onClick={signOut}
          className={`w-full flex items-center justify-center gap-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-medium py-3 rounded-xl transition-all ${isCollapsed ? 'px-0' : 'px-4'
            }`}
          title={isCollapsed ? 'Sign out' : undefined}
        >
          <LogOut size={18} />
          {!isCollapsed && (
            <span className="text-xs uppercase tracking-widest">Sign Out</span>
          )}
        </button>
      </div>
    </aside>
  );
};

// Sidebar collapsed state hook for MainLayout
export function useSidebarCollapsed() {
  const [isCollapsed] = useState(() => {
    const saved = localStorage.getItem('op_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  return isCollapsed;
}

interface NavItemProps {
  collapsed: boolean;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  color: string;
}

const NavItem = memo<NavItemProps>(
  ({ collapsed, active, onClick, icon, label, badge, color }) => {
    const colorClasses: Record<string, string> = {
      indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      amber: 'text-amber-600 bg-amber-50 border-amber-100',
      rose: 'text-rose-600 bg-rose-50 border-rose-100',
      blue: 'text-blue-600 bg-blue-50 border-blue-100',
      purple: 'text-purple-600 bg-purple-50 border-purple-100',
      slate: 'text-slate-600 bg-slate-50 border-slate-100',
    };

    const iconColors: Record<string, string> = {
      indigo: 'text-indigo-500',
      emerald: 'text-emerald-500',
      amber: 'text-amber-500',
      rose: 'text-rose-500',
      blue: 'text-blue-500',
      purple: 'text-purple-500',
      slate: 'text-slate-500',
    };

    return (
      <button
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={`w-full group flex items-center px-5 py-4 rounded-[1.5rem] font-black transition-all relative border ${active
          ? colorClasses[color]
          : 'text-slate-500 border-transparent hover:bg-slate-50'
          } ${collapsed ? 'justify-center' : 'justify-between'}`}
      >
        <div className="flex items-center gap-4">
          <span
            className={`transition-all duration-500 group-hover:scale-125 ${active ? iconColors[color] : 'text-slate-300'
              }`}
          >
            {icon}
          </span>
          {!collapsed && (
            <span className="animate-in fade-in tracking-tight text-sm">{label}</span>
          )}
        </div>
        {!collapsed && badge !== undefined && (
          <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg shadow-rose-200">
            {badge}
          </span>
        )}
        {collapsed && badge !== undefined && (
          <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>
    );
  }
);

NavItem.displayName = 'NavItem';

export default Sidebar;
