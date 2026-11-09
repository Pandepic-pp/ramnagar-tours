import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LogOut, Menu, Route as RouteIcon, X } from 'lucide-react';
import { useAuth } from '@/state/AuthContext';
import { brand } from '@/config';
import { Logo } from './art';

const links = [
  { to: '/#destinations', label: 'Destinations' },
  { to: '/#fleet', label: 'Fleet' },
  { to: '/#pricing', label: 'Fares' },
  { to: '/#faq', label: 'FAQ' },
];

const initials = (name: string | null, phone: string): string => {
  const source = (name ?? '').trim();
  if (source) return source.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return phone.slice(-2);
};

export function Header() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const overHero = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); setAccountOpen(false); }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e: MouseEvent) => { if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAccountOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [accountOpen]);

  const solid = scrolled || !overHero || menuOpen;

  const signOut = async () => {
    await logout();
    setAccountOpen(false);
    navigate('/');
  };

  return (
    <header className={`site-header${solid ? ' is-solid' : ''}`}>
      <div className="container site-header-inner">
        <Link to="/" className="brand" aria-label={`${brand.name}, home`}>
          <Logo />
          <span className="brand-name">{brand.name}</span>
        </Link>

        <nav className="nav-desktop" aria-label="Main">
          {links.map((l) => <Link key={l.to} to={l.to} className="nav-link">{l.label}</Link>)}
        </nav>

        <div className="header-actions">
          {user ? (
            <div className="account" ref={accountRef}>
              <button
                type="button"
                className="account-btn"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={() => setAccountOpen((o) => !o)}
              >
                <span className="avatar" aria-hidden="true">{initials(user.name, user.phone)}</span>
                <span className="account-name">{user.name?.split(' ')[0] ?? 'Account'}</span>
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {accountOpen && (
                <div className="menu" role="menu">
                  <div className="menu-head">
                    <strong>{user.name ?? 'Welcome'}</strong>
                    <span className="muted">+91 {user.phone.slice(-10)}</span>
                  </div>
                  <NavLink to="/trips" role="menuitem" className="menu-item"><RouteIcon size={18} aria-hidden="true" /> My trips</NavLink>
                  {user.role === 'admin' && (
                    <NavLink to="/admin" role="menuitem" className="menu-item"><LayoutDashboard size={18} aria-hidden="true" /> Dispatch board</NavLink>
                  )}
                  <button type="button" role="menuitem" className="menu-item" onClick={signOut}><LogOut size={18} aria-hidden="true" /> Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-ghost btn-sm header-signin">Sign in</Link>
          )}
          <Link to="/book" className="btn btn-primary btn-sm header-cta">Book a ride</Link>
          <button type="button" className="icon-btn burger" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="nav-mobile" aria-label="Mobile">
          {links.map((l) => <Link key={l.to} to={l.to} className="nav-mobile-link">{l.label}</Link>)}
          {user && <Link to="/trips" className="nav-mobile-link">My trips</Link>}
          {user?.role === 'admin' && <Link to="/admin" className="nav-mobile-link">Dispatch board</Link>}
          {user ? (
            <button type="button" className="nav-mobile-link" onClick={signOut}>Sign out</button>
          ) : (
            <Link to="/login" className="nav-mobile-link">Sign in</Link>
          )}
          <Link to="/book" className="btn btn-primary btn-lg btn-block">Book a ride</Link>
        </nav>
      )}
    </header>
  );
}
