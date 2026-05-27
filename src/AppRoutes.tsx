import { Routes, Route } from 'react-router-dom';
import { SearchPage } from '@/features/search/SearchPage';
import { CreatePinPage } from '@/features/create/CreatePinPage';
import { AppHeader } from '@/ui/AppHeader';
import { Toaster } from '@/ui/Toaster';

export function AppRoutes() {
  return (
    <>
      <AppHeader />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/create" element={<CreatePinPage />} />
        </Routes>
      </main>
      <Toaster />
    </>
  );
}
