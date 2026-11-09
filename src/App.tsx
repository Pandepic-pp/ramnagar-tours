import { lazy, Suspense, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '@/state/AuthContext';
import { Layout } from '@/components/Layout';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';

// The booking flow and the signed-in pages load on demand, so the landing page stays light
const Book = lazy(() => import('@/pages/Book'));
const Trips = lazy(() => import('@/pages/Trips'));
const Admin = lazy(() => import('@/pages/Admin'));

// The server enforces every permission. These guards only decide what to show.
function RequireAuth({ role, children }: { role?: 'admin'; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="container" style={{ paddingBlock: 48 }}><div className="skeleton" style={{ height: 320 }} /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (role && user.role !== role) {
    return (
      <section className="container empty-page">
        <Lock size={44} aria-hidden="true" />
        <h1>Admin access only</h1>
        <p className="muted">This page is for the dispatch team. If you should have access, ask the owner to enable it for your number.</p>
        <Link to="/" className="btn btn-secondary">Back to home</Link>
      </section>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingBlock: 48 }}><div className="skeleton" style={{ height: 320 }} /></div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="book" element={<Book />} />
          <Route path="login" element={<Login />} />
          <Route path="trips" element={<RequireAuth><Trips /></RequireAuth>} />
          <Route path="admin" element={<RequireAuth role="admin"><Admin /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
