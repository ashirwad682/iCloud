import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PhotosPage } from './pages/PhotosPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { RecentsPage } from './pages/RecentsPage';
import { MemoriesPage } from './pages/MemoriesPage';
import { AlbumsPage } from './pages/AlbumsPage';
import { AlbumDetailPage } from './pages/AlbumDetailPage';
import { MediaTypesPage } from './pages/MediaTypesPage';
import { MediaTypeDetailPage } from './pages/MediaTypeDetailPage';
import { VideosPage } from './pages/VideosPage';
import { HiddenPage } from './pages/HiddenPage';
import { TrashPage } from './pages/TrashPage';
import { SharedAlbumsPage } from './pages/SharedAlbumsPage';
import { SharedAlbumDetailPage } from './pages/SharedAlbumDetailPage';
import { SharedAlbumInvitePage } from './pages/SharedAlbumInvitePage';
import { SharedLinksPage } from './pages/SharedLinksPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import { PublicSharePage } from './pages/PublicSharePage';
import { useAuthStore } from './stores/authStore';
import { useUIStore } from './stores/uiStore';

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black text-[#86868B] text-xs font-[-apple-system]">
        Loading CloudVault...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const { theme } = useUIStore();
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Public Sharing Routes */}
          <Route path="/s/:token" element={<PublicSharePage />} />
          <Route path="/shared/:token" element={<PublicSharePage />} />
          <Route path="/shared-albums/invite/:token" element={<SharedAlbumInvitePage />} />

          {/* Protected Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/photos" replace />} />
            
            {/* Photos Category */}
            <Route path="/photos" element={<PhotosPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/recents" element={<RecentsPage />} />

            {/* Collections Category */}
            <Route path="/memories" element={<MemoriesPage />} />
            <Route path="/albums" element={<AlbumsPage />} />
            <Route path="/albums/:id" element={<AlbumDetailPage />} />
            <Route path="/media-types" element={<MediaTypesPage />} />
            <Route path="/media-types/:type" element={<MediaTypeDetailPage />} />
            <Route path="/videos" element={<VideosPage />} />
            <Route path="/hidden" element={<HiddenPage />} />
            <Route path="/trash" element={<TrashPage />} />

            {/* Sharing Category */}
            <Route path="/shared" element={<SharedAlbumsPage />} />
            <Route path="/shared-albums" element={<SharedAlbumsPage />} />
            <Route path="/shared-albums/:id" element={<SharedAlbumDetailPage />} />
            <Route path="/shared-links" element={<SharedLinksPage />} />

            {/* Settings & Admin */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/security" element={<SettingsPage />} />
            <Route path="/settings/storage" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/photos" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
export default App;
