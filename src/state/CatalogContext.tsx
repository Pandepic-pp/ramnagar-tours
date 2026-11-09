import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/api/client';
import type { Catalog, Place, VehicleInfo } from '@/api/types';

type CatalogState = {
  catalog: Catalog | null;
  error: string | null;
  reload: () => void;
  place: (id: string) => Place | undefined;
  vehicle: (id: string) => VehicleInfo | undefined;
};

const CatalogContext = createContext<CatalogState | null>(null);

// Places, vehicles and rules come from the server so the UI never carries a second copy of the rate card
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    api.catalog().then(
      (c) => live && setCatalog(c),
      (e: Error) => live && setError(e.message)
    );
    return () => { live = false; };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo<CatalogState>(() => {
    const places = new Map(catalog?.locations.map((l) => [l.id, l]));
    const vehicles = new Map(catalog?.vehicles.map((v) => [v.id, v]));
    return { catalog, error, reload, place: (id) => places.get(id), vehicle: (id) => vehicles.get(id as never) };
  }, [catalog, error, reload]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogState {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
}
