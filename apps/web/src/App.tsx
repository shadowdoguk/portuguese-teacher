import { HashRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PracticeShadowPage from './pages/PracticeShadowPage';

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/practice/shadow" element={<PracticeShadowPage />} />
      </Routes>
    </HashRouter>
  );
}