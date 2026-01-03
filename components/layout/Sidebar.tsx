import React, { memo, useCallback, useState } from 'react';
import {
  Users,
  Users2,
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
  Filter,
  Bookmark,
  FolderOpen,
  Tag,
  Target,
  Star,
  Inbox,
  Archive,
  Clock,
  MoreHorizontal,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../contexts/NavigationContext';
import { useSavedFiltersContext } from '../../contexts/SavedFiltersContext';
import { useSavedFiltersQuery, useSavedFilterCounts, useDeleteSavedFilter } from '../../hooks/queries';
import { useUserPublicProfileQuery } from '../../hooks/queries/useNetworkingQuery';
import { useSubscription } from '../../hooks/useSubscription';
import { ProBadge } from '../ui/ProBadge';
import type { SavedFilter } from '../../types';

interface SidebarProps {
  taskCount: number;
  onOpenAddLead: () => void;
  onOpenUpload: () => void;
}

// Icon mapping for saved filters
const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  filter: Filter,
  bookmark: Bookmark,
  folder: FolderOpen,
  tag: Tag,
  users: Users,
  target: Target,
  star: Star,
  inbox: Inbox,
  archive: Archive,
  clock: Clock,
};

const Sidebar: React.FC<SidebarProps> = ({ taskCount, onOpenAddLead, onOpenUpload }) => {
  const { user, profile, signOut } = useAuth();
  const { currentView, navigate } = useNavigation();
  const { activeSavedFilter, applySavedFilter, clearActiveSavedFilter } = useSavedFiltersContext();
  const { isPro } = useSubscription();

  // Saved filters queries
  const { data: savedFilters } = useSavedFiltersQuery(user?.id);
  const { data: filterCounts } = useSavedFilterCounts(user?.id, savedFilters);
  const deleteFilter = useDeleteSavedFilter(user?.id);

  // User public profile for avatar/name display
  const { data: publicProfile } = useUserPublicProfileQuery(user?.id);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('op_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [smartListsExpanded, setSmartListsExpanded] = useState(true);
  const [filterMenuOpen, setFilterMenuOpen] = useState<string | null>(null);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem('op_sidebar_collapsed', JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  const handleSmartListClick = useCallback((filter: SavedFilter) => {
    applySavedFilter(filter);
    navigate('leads');
  }, [applySavedFilter, navigate]);

  const handleDeleteFilter = useCallback((filterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFilterMenuOpen(null);
    deleteFilter.mutate(filterId);
    if (activeSavedFilter?.id === filterId) {
      clearActiveSavedFilter();
    }
  }, [deleteFilter, activeSavedFilter, clearActiveSavedFilter]);

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 bg-white border-r border-gray-100 z-50 transition-all duration-150 ${isCollapsed ? 'w-24' : 'w-64'
        }`}
    >
      {/* Header */}
      <div className="p-8 border-b border-gray-100 flex items-center justify-between">
        {!isCollapsed && (
          <h1 className="text-xl font-semibold text-navy flex items-center gap-3 animate-in fade-in tracking-tight">
            <div className="bg-pilot-blue p-2 rounded-lg">
              <Rocket size={20} className="text-white" />
            </div>
            OutboundPilot
          </h1>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors duration-150 ${isCollapsed ? 'mx-auto' : ''
            }`}
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-5 space-y-1">
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'starthere'}
          onClick={() => navigate('starthere')}
          icon={<BookOpen size={18} />}
          label="Start Here"
        />
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'dashboard'}
          onClick={() => navigate('dashboard')}
          icon={<LayoutDashboard size={18} />}
          label="Overview"
        />
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'leads'}
          onClick={() => navigate('leads')}
          icon={<Users size={18} />}
          label="Pipeline"
        />
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'finder'}
          onClick={() => navigate('finder')}
          icon={<SearchCode size={18} />}
          label="Find Leads"
        />
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'queue'}
          onClick={() => navigate('queue')}
          icon={<CheckSquare size={18} />}
          label="Daily Tasks"
          badge={taskCount > 0 ? taskCount : undefined}
        />
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'reporting'}
          onClick={() => navigate('reporting')}
          icon={<PieChart size={18} />}
          label="Reporting"
          proBadge={!isPro}
        />
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'networking'}
          onClick={() => navigate('networking')}
          icon={<Users2 size={18} />}
          label="Networking"
        />
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'strategies'}
          onClick={() => navigate('strategies')}
          icon={<Zap size={18} />}
          label="Strategies"
        />
        <NavItem
          collapsed={isCollapsed}
          active={currentView === 'profile'}
          onClick={() => navigate('profile')}
          icon={<Users size={18} />}
          label="Settings"
        />

        {/* Smart Lists Section */}
        {savedFilters && savedFilters.length > 0 && !isCollapsed && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setSmartListsExpanded(prev => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors duration-150"
            >
              Smart Lists
              {smartListsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {smartListsExpanded && (
              <div className="mt-1 space-y-0.5">
                {savedFilters.map((filter) => {
                  const IconComponent = ICON_MAP[filter.icon] || Filter;
                  const isActive = activeSavedFilter?.id === filter.id && currentView === 'leads';
                  const count = filterCounts?.[filter.id];

                  return (
                    <div key={filter.id} className="relative group">
                      <button
                        onClick={() => handleSmartListClick(filter)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                          isActive
                            ? 'bg-pilot-blue/10 text-pilot-blue font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <IconComponent
                            size={16}
                            className={`flex-shrink-0 ${isActive ? 'text-pilot-blue' : 'text-gray-400'}`}
                          />
                          <span className="truncate">{filter.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {count !== undefined && (
                            <span className="text-xs text-gray-400 tabular-nums">
                              {count}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilterMenuOpen(filterMenuOpen === filter.id ? null : filter.id);
                            }}
                            className="p-1 rounded-lg hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          >
                            <MoreHorizontal size={14} className="text-gray-400" />
                          </button>
                        </div>
                      </button>

                      {/* Dropdown menu */}
                      {filterMenuOpen === filter.id && (
                        <div className="absolute right-2 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200/60 py-1 z-50 min-w-[120px]">
                          <button
                            onClick={(e) => handleDeleteFilter(filter.id, e)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors duration-150 rounded-lg mx-1"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Collapsed smart lists indicator */}
        {savedFilters && savedFilters.length > 0 && isCollapsed && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
            <div
              className="p-2 rounded-lg bg-gray-50 text-gray-400"
              title={`${savedFilters.length} Smart Lists`}
            >
              <Filter size={18} />
            </div>
          </div>
        )}
      </nav>

      {/* Actions */}
      <div className="p-6 space-y-3">
        <button
          onClick={onOpenAddLead}
          className={`w-full flex items-center justify-center gap-3 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-lg transition-all duration-150 ${isCollapsed ? 'px-0' : 'px-4'
            }`}
        >
          <UserPlus size={18} className="text-gray-500" />
          {!isCollapsed && (
            <span className="animate-in fade-in text-sm">
              New Lead
            </span>
          )}
        </button>
        <button
          onClick={onOpenUpload}
          className={`w-full flex items-center justify-center gap-3 bg-pilot-blue hover:bg-pilot-blue/90 text-white font-medium py-3 rounded-lg transition-all duration-150 shadow-sm hover:shadow active:scale-[0.98] ${isCollapsed ? 'px-0' : 'px-4'
            }`}
        >
          <Plus size={18} />
          {!isCollapsed && (
            <span className="animate-in fade-in text-sm">
              Import CSV
            </span>
          )}
        </button>
      </div>

      {/* User info & sign out */}
      <div className="p-6 border-t border-gray-100">
        {/* User profile section */}
        <button
          onClick={() => navigate('profile')}
          className={`w-full flex items-center gap-3 mb-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? (publicProfile?.displayName || profile?.email || 'Profile') : undefined}
        >
          {/* Avatar */}
          {publicProfile?.avatarUrl ? (
            <img
              src={publicProfile.avatarUrl}
              alt={publicProfile.displayName || 'User'}
              className="w-9 h-9 rounded-full object-cover border border-gray-100 flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 bg-pilot-blue/10 rounded-full flex items-center justify-center text-pilot-blue font-semibold text-sm flex-shrink-0 border border-pilot-blue/20">
              {(publicProfile?.displayName || profile?.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}

          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 truncate">
                {publicProfile?.displayName || profile?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
            </div>
          )}

          {!isCollapsed && (
            <Settings size={16} className="text-gray-400 flex-shrink-0" />
          )}
        </button>

        <button
          onClick={signOut}
          className={`w-full flex items-center justify-center gap-3 text-gray-500 hover:text-rose-600 hover:bg-rose-50 font-medium py-3 rounded-lg transition-colors duration-150 ${isCollapsed ? 'px-0' : 'px-4'
            }`}
          title={isCollapsed ? 'Sign out' : undefined}
        >
          <LogOut size={18} />
          {!isCollapsed && (
            <span className="text-sm">Sign Out</span>
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
  proBadge?: boolean;
}

const NavItem = memo<NavItemProps>(
  ({ collapsed, active, onClick, icon, label, badge, proBadge }) => {
    return (
      <button
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={`w-full group flex items-center px-3 py-2.5 rounded-lg font-medium transition-colors duration-150 ${active
          ? 'bg-pilot-blue/10 text-pilot-blue'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          } ${collapsed ? 'justify-center' : 'justify-between'}`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`transition-colors duration-150 ${active ? 'text-pilot-blue' : 'text-gray-400 group-hover:text-gray-600'
              }`}
          >
            {icon}
          </span>
          {!collapsed && (
            <span className="animate-in fade-in text-sm">{label}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!collapsed && proBadge && <ProBadge size="sm" />}
          {!collapsed && badge !== undefined && (
            <span className="bg-pilot-blue text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {collapsed && badge !== undefined && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-pilot-blue rounded-full"></span>
        )}
      </button>
    );
  }
);

NavItem.displayName = 'NavItem';

export default Sidebar;
