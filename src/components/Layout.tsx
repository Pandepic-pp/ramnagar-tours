import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { brand, telHref } from '@/config';
import { Header } from './Header';
import { Logo } from './art';

// React Router does not scroll to #anchors or reset scroll on navigation by itself
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // wait a frame so the target section has rendered after a route change
      const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 60);
      return () => window.clearTimeout(t);
    }
    window.scrollTo({ top: 0 });
  }, [pathname, hash]);
  return null;
}

function Footer() {
  return (
    <footer className="site-footer on-dark">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand brand-light" aria-label={`${brand.name}, home`}>
            <Logo /> <span className="brand-name">{brand.name}</span>
          </Link>
          <p>{brand.tagline}. Clear fares, verified drivers, and a real person on the other end when plans change.</p>
        </div>
        <div>
          <h3 className="footer-h">Explore</h3>
          <ul className="footer-list">
            <li><Link to="/#destinations">Destinations</Link></li>
            <li><Link to="/#fleet">Our fleet</Link></li>
            <li><Link to="/#pricing">How fares work</Link></li>
            <li><Link to="/trips">My trips</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="footer-h">Contact</h3>
          <ul className="footer-list">
            <li className="row"><MapPin size={16} aria-hidden="true" /> Based in {brand.base}</li>
            {brand.phone && <li className="row"><Phone size={16} aria-hidden="true" /> <a href={telHref(brand.phone)}>{brand.phone}</a></li>}
            {brand.email && <li className="row"><Mail size={16} aria-hidden="true" /> <a href={`mailto:${brand.email}`}>{brand.email}</a></li>}
          </ul>
        </div>
      </div>
      <div className="container footer-base">
        <span>© {new Date().getFullYear()} {brand.name}</span>
        <span>Fares are estimates until your driver is assigned. Tolls and parking are billed at actuals.</span>
      </div>
    </footer>
  );
}

export function Layout() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <ScrollManager />
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
