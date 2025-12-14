// ProtectedRoute - Route Guard for Authentication
// Requires user to be logged in (and optionally verified) to access route

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/infra/auth/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresVerification?: boolean;
}

export const ProtectedRoute = ({
  children,
  requiresVerification = false,
}: ProtectedRouteProps) => {
  const { user, isVerified, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f35 100%)',
          color: 'white',
          fontSize: '1.2rem',
        }}
      >
        ⏳ Loading...
      </div>
    );
  }

  // Not logged in → Redirect to login
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Logged in but requires verification and not verified → Show verification message
  if (requiresVerification && !isVerified) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f35 100%)',
          color: 'white',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          📧 Email-Verifizierung erforderlich
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
          Du musst deine E-Mail-Adresse verifizieren, um auf diesen Bereich zuzugreifen.
          <br />
          Bitte überprüfe dein Postfach und klicke auf den Bestätigungslink.
        </p>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '0.875rem 2rem',
            background: 'linear-gradient(135deg, #4a90e2, #357abd)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontSize: '1rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ← Zurück zur Galaxy Map
        </button>
      </div>
    );
  }

  // All checks passed → Render protected content
  return <>{children}</>;
};

