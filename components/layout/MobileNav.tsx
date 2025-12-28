import React, { memo } from 'react';
import { Users, LayoutDashboard, SearchCode, CheckSquare } from 'lucide-react';
import { useNavigation } from '../../contexts/NavigationContext';

interface MobileNavProps {
  taskCount: number;
}

const MobileNav: React.FC<MobileNavProps> = ({ taskCount }) => {
  const { currentView, navigate } = useNavigation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-5 z-50 shadow-2xl">
      <MobileNavItem
        active={currentView === 'dashboard'}
        onClick={() => navigate('dashboard')}
        icon={<LayoutDashboard size={24} />}
      />
      <MobileNavItem
        active={currentView === 'leads'}
        onClick={() => navigate('leads')}
        icon={<Users size={24} />}
      />
      <MobileNavItem
        active={currentView === 'finder'}
        onClick={() => navigate('finder')}
        icon={<SearchCode size={24} />}
      />
      <MobileNavItem
        active={currentView === 'queue'}
        onClick={() => navigate('queue')}
        icon={<CheckSquare size={24} />}
        badge={taskCount > 0 ? taskCount : undefined}
      />
      <MobileNavItem
        active={currentView === 'profile'}
        onClick={() => navigate('profile')}
        icon={<Users size={24} />}
      />
    </nav>
  );
};

interface MobileNavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  badge?: number;
}

const MobileNavItem = memo<MobileNavItemProps>(({ active, onClick, icon, badge }) => (
  <button
    onClick={onClick}
    className={`p-2 relative transition-all active:scale-125 ${active ? 'text-indigo-600' : 'text-slate-400'
      }`}
  >
    {icon}
    {badge !== undefined && (
      <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black shadow-lg shadow-rose-200">
        {badge}
      </span>
    )}
  </button>
));

MobileNavItem.displayName = 'MobileNavItem';

export default MobileNav;
