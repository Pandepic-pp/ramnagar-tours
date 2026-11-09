import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { BadgeCheck, MessageSquareText, UserRound } from 'lucide-react';
import { useAuth } from '@/state/AuthContext';
import { OtpLogin } from '@/components/OtpLogin';
import { Scene } from '@/components/art';
import type { Me } from '@/api/types';

// Only same-site paths are honoured, so a crafted ?next=https://evil.example cannot bounce someone off-site
const safeNext = (next: string | null): string | null => (next && next.startsWith('/') && !next.startsWith('//') ? next : null);

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const destination = (me: Me, isNew = false) => next ?? (me.role === 'admin' ? '/admin' : isNew ? '/book' : '/trips');

  if (!loading && user) return <Navigate to={destination(user)} replace />;

  return (
    <div className="login-page">
      <aside className="login-aside on-dark" aria-hidden="false">
        <div className="login-art" aria-hidden="true"><Scene kind="hill" seed={3} /></div>
        <div className="login-aside-body">
          <span className="eyebrow">Welcome</span>
          <h1>The hills are closer than you think.</h1>
          <ul className="assure-list">
            <li><MessageSquareText aria-hidden="true" /> <span><strong>No password.</strong> A text message code is all it takes.</span></li>
            <li><BadgeCheck aria-hidden="true" /> <span><strong>Verified bookings.</strong> We confirm every ride with a real person.</span></li>
            <li><UserRound aria-hidden="true" /> <span><strong>Your driver, by name.</strong> Name, number and car shared before pickup.</span></li>
          </ul>
        </div>
      </aside>

      <section className="login-main">
        <div className="auth-card">
          <OtpLogin onSuccess={(me, isNew) => navigate(destination(me, isNew), { replace: true })} />
        </div>
      </section>
    </div>
  );
}
