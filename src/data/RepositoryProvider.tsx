import { createContext, useContext, type ReactNode } from 'react';
import type { PinRepository } from './PinRepository';

const RepositoryContext = createContext<PinRepository | null>(null);

export function RepositoryProvider({
  repo,
  children,
}: {
  repo: PinRepository;
  children: ReactNode;
}) {
  return <RepositoryContext.Provider value={repo}>{children}</RepositoryContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRepository(): PinRepository {
  const ctx = useContext(RepositoryContext);
  if (!ctx) throw new Error('useRepository must be used within <RepositoryProvider>');
  return ctx;
}
