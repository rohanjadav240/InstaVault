import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingLayout } from './components/layout/LandingLayout';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { UploadPage } from './pages/UploadPage';
import { ProcessingPage } from './pages/ProcessingPage';
import { DashboardPage } from './pages/DashboardPage';
import { SavedReelsPage } from './pages/SavedReelsPage';
import { SavedPostsPage } from './pages/SavedPostsPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { CreatorsPage } from './pages/CreatorsPage';
import { LikesPage } from './pages/LikesPage';
import { CommentsPage } from './pages/CommentsPage';
import { FollowersPage } from './pages/FollowersPage';
import { FollowingPage } from './pages/FollowingPage';
import { MessagesPage } from './pages/MessagesPage';
import { StoriesPage } from './pages/StoriesPage';
import { LinkExplorerPage } from './pages/LinkExplorerPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BackupManagerPage } from './pages/BackupManagerPage';
import { ExportCenterPage } from './pages/ExportCenterPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing and Public Flows */}
        <Route element={<LandingLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Route>

        {/* Dashboard and Authenticated / Local Archive Explorer */}
        <Route element={<AppLayout />}>
          <Route path="/processing" element={<ProcessingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reels" element={<SavedReelsPage />} />
          <Route path="/posts" element={<SavedPostsPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/creators" element={<CreatorsPage />} />
          <Route path="/likes" element={<LikesPage />} />
          <Route path="/comments" element={<CommentsPage />} />
          <Route path="/followers" element={<FollowersPage />} />
          <Route path="/following" element={<FollowingPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/links" element={<LinkExplorerPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/backups" element={<BackupManagerPage />} />
          <Route path="/export" element={<ExportCenterPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
