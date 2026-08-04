import { HashRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PracticeShadowPage from './pages/PracticeShadowPage';
import SettingsPage from './pages/SettingsPage';
import CollectionsPage from './pages/CollectionsPage';
import CollectionDetailPage from './pages/CollectionDetailPage';
import ShadowPage from './pages/ShadowPage';
import RecallPage from './pages/RecallPage';
import ReviewPage from './pages/ReviewPage';
import FilterPage from './pages/FilterPage';
import UnitPage from './pages/UnitPage';
import LearnPage from './pages/LearnPage';
import NoticePage from './pages/NoticePage';
import ApplyPage from './pages/ApplyPage';
import CommunicatePage from './pages/CommunicatePage';

/**
 * Route definitions extracted so tests can render them inside a
 * MemoryRouter without triggering React Router's "Router inside
 * Router" error (App wraps them in HashRouter at runtime).
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      {/* Phase A pre-stub — kept for the dashboard's "Shadow
          mode" link until Phase B Task 8 replaces it. */}
      <Route path="/practice/shadow" element={<PracticeShadowPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/collections" element={<CollectionsPage />} />
      <Route path="/collections/:id" element={<CollectionDetailPage />} />
      {/* Phase B Task 7 practice surfaces. The unit-scoped
          routes (`/units/:unitId/{shadow,recall}`) accept a
          unit slug from the URL; the unscoped `/practice/review`
          + `/practice/filter` routes query the active CV. */}
      <Route path="/units/:unitId/shadow" element={<ShadowPage />} />
      <Route path="/units/:unitId/recall" element={<RecallPage />} />
      <Route path="/practice/review" element={<ReviewPage />} />
      <Route path="/practice/filter" element={<FilterPage />} />
      {/* Phase B Task 8: six-stage unit loop. The Unit page
          surfaces the loop navigator (with the "Continue →"
          link to the first incomplete stage); the four stage
          pages (Learn/Notice/Apply/Communicate) each render
          their stage's body + a "Mark complete" button that
          POSTs to `/api/unit-progress/:unitId/:stage`. Shadow
          and Recall already exist (Task 7) and are reached
          via the navigator. */}
      <Route path="/units/:unitId" element={<UnitPage />} />
      <Route path="/units/:unitId/learn" element={<LearnPage />} />
      <Route path="/units/:unitId/notice" element={<NoticePage />} />
      <Route path="/units/:unitId/apply" element={<ApplyPage />} />
      <Route path="/units/:unitId/communicate" element={<CommunicatePage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}