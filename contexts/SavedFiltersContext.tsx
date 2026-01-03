import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { SavedFilter } from '../types';
import type { LeadFilters } from '../services/supabase';

interface SavedFiltersContextType {
  // The currently applied saved filter (if any)
  activeSavedFilter: SavedFilter | null;
  // Apply a saved filter - navigates to leads and sets filters
  applySavedFilter: (filter: SavedFilter) => void;
  // Clear the active saved filter
  clearActiveSavedFilter: () => void;
  // Get the current filter state to apply
  pendingFilters: LeadFilters | null;
  // Clear pending filters after they've been applied
  clearPendingFilters: () => void;
}

const SavedFiltersContext = createContext<SavedFiltersContextType | null>(null);

export const useSavedFiltersContext = () => {
  const context = useContext(SavedFiltersContext);
  if (!context) {
    throw new Error('useSavedFiltersContext must be used within SavedFiltersProvider');
  }
  return context;
};

interface SavedFiltersProviderProps {
  children: React.ReactNode;
}

export const SavedFiltersProvider: React.FC<SavedFiltersProviderProps> = ({ children }) => {
  const [activeSavedFilter, setActiveSavedFilter] = useState<SavedFilter | null>(null);
  const [pendingFilters, setPendingFilters] = useState<LeadFilters | null>(null);

  const applySavedFilter = useCallback((filter: SavedFilter) => {
    setActiveSavedFilter(filter);
    setPendingFilters(filter.filters as LeadFilters);
  }, []);

  const clearActiveSavedFilter = useCallback(() => {
    setActiveSavedFilter(null);
    setPendingFilters(null);
  }, []);

  const clearPendingFilters = useCallback(() => {
    setPendingFilters(null);
  }, []);

  const value = useMemo(() => ({
    activeSavedFilter,
    applySavedFilter,
    clearActiveSavedFilter,
    pendingFilters,
    clearPendingFilters,
  }), [activeSavedFilter, applySavedFilter, clearActiveSavedFilter, pendingFilters, clearPendingFilters]);

  return (
    <SavedFiltersContext.Provider value={value}>
      {children}
    </SavedFiltersContext.Provider>
  );
};
