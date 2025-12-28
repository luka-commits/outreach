import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type View = 'dashboard' | 'leads' | 'queue' | 'detail' | 'strategies' | 'reporting' | 'finder' | 'profile' | 'pricing';

interface NavigationContextType {
  currentView: View;
  selectedLeadId: string | null;
  navigate: (view: View, leadId?: string) => void;
  navigateToLead: (leadId: string) => void;
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [history, setHistory] = useState<View[]>([]);

  const navigate = useCallback((view: View, leadId?: string) => {
    setHistory((prev) => [...prev, currentView]);
    setCurrentView(view);
    if (leadId) {
      setSelectedLeadId(leadId);
    } else if (view !== 'detail') {
      setSelectedLeadId(null);
    }
  }, [currentView]);

  const navigateToLead = useCallback((leadId: string) => {
    setHistory((prev) => [...prev, currentView]);
    setSelectedLeadId(leadId);
    setCurrentView('detail');
  }, [currentView]);

  const goBack = useCallback(() => {
    const previous = history[history.length - 1] || 'dashboard';
    setHistory((prev) => prev.slice(0, -1));
    setCurrentView(previous);
    if (previous !== 'detail') {
      setSelectedLeadId(null);
    }
  }, [history]);

  const value = useMemo(() => ({
    currentView,
    selectedLeadId,
    navigate,
    navigateToLead,
    goBack,
  }), [currentView, selectedLeadId, navigate, navigateToLead, goBack]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};
