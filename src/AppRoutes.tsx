import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SearchPage } from '@/features/search/SearchPage';
import { loadCreatePinPage } from '@/features/create/lazy';
import { AppHeader } from '@/ui/AppHeader';
import { Toaster } from '@/ui/Toaster';

// CreatePinPage pulls in the canvas-based image pipeline (variant generation,
// dominant-color sampling). Defer it until the user navigates to /create so
// the initial search bundle stays lean.
const CreatePinPage = lazy(() =>
  loadCreatePinPage().then((m) => ({ default: m.CreatePinPage })),
);

function RouteFallback() {
  return (
    <p role="status" aria-live="polite" style={{ padding: 24, textAlign: 'center' }}>
      Loading…
    </p>
  );
}

export function AppRoutes() {
  return (
    <>
      <AppHeader />
      <main id="main" tabIndex={-1}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/create" element={<CreatePinPage />} />
          </Routes>
        </Suspense>
      </main>
      <Toaster />
    </>
  );
}
