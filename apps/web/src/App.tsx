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

export default function App(): JSX.Element {
  return (
    <HashRouter>
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
      </Routes>
    </HashRouter>
  );
}