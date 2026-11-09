import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <section className="container empty-page">
      <Compass size={48} aria-hidden="true" />
      <h1>This road does not lead anywhere</h1>
      <p className="muted">The page you were looking for is not here. Let us get you back on the route.</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Link to="/" className="btn btn-secondary">Go home</Link>
        <Link to="/book" className="btn btn-primary">Book a ride</Link>
      </div>
    </section>
  );
}
