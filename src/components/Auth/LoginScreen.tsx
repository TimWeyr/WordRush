// LoginScreen - Authentication UI with Login/Register Toggle
// Handles email/password auth with inline validation and forgot password modal

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/infra/auth/AuthContext';
import { useToast } from '../Toast/ToastContainer';
import './LoginScreen.css';

type TabType = 'login' | 'register';

export const LoginScreen = () => {
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  const { signIn, signUp, resetPassword } = useAuth();
  const { showToast } = useToast();

  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!validateEmail(email)) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein');
      return;
    }

    if (!validatePassword(password)) {
      setError('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'login') {
        // Login
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError.message || 'Login fehlgeschlagen');
        } else {
          showToast('Login erfolgreich! 🎉', 'success');
          navigate(redirectTo);
        }
      } else {
        // Register
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) {
          setError(signUpError.message || 'Registrierung fehlgeschlagen');
        } else {
          showToast(
            'Account erstellt! Bitte überprüfe deine E-Mail zur Verifizierung. 📧',
            'success',
            5000
          );
          // Nach Registrierung kann User freeTier spielen, auch ohne Verifikation
          navigate(redirectTo);
        }
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!validateEmail(resetEmail)) {
      showToast('Bitte gib eine gültige E-Mail-Adresse ein', 'error');
      return;
    }

    const { error } = await resetPassword(resetEmail);
    if (error) {
      showToast(error.message || 'Fehler beim Passwort-Reset', 'error');
    } else {
      showToast(
        'Passwort-Reset-Link wurde gesendet! Bitte prüfe dein E-Mail-Postfach. 📧',
        'success',
        5000
      );
      setShowForgotPassword(false);
      setResetEmail('');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <h1>WordRush</h1>
          <p>Lerne spielend mit dem 2D Shooter Game 🚀</p>
        </div>

        {/* Tab Navigation */}
        <div className="login-tabs">
          <button
            className={`login-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('login');
              setError(null);
            }}
          >
            Login
          </button>
          <button
            className={`login-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('register');
              setError(null);
            }}
          >
            Registrieren
          </button>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          <div className="login-field">
            <label htmlFor="email">E-Mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.de"
              disabled={loading}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mindestens 6 Zeichen"
              disabled={loading}
              required
            />
          </div>

          {activeTab === 'login' && (
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => setShowForgotPassword(true)}
            >
              Passwort vergessen?
            </button>
          )}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading
              ? '⏳ Bitte warten...'
              : activeTab === 'login'
              ? '🔓 Einloggen'
              : '✨ Account erstellen'}
          </button>
        </form>

        {/* Info Text */}
        <div className="login-info">
          {activeTab === 'register' ? (
            <p>
              ℹ️ Nach der Registrierung kannst du sofort freeTier-Content spielen.
              <br />
              Verifiziere deine E-Mail, um vollen Zugriff zu erhalten!
            </p>
          ) : (
            <p>
              💡 Noch kein Account?{' '}
              <button
                type="button"
                className="switch-tab-link"
                onClick={() => {
                  setActiveTab('register');
                  setError(null);
                }}
              >
                Jetzt registrieren
              </button>
            </p>
          )}
        </div>

        {/* Back to Game */}
        <button className="back-to-game" onClick={() => navigate('/')}>
          ← Zurück zur Galaxy Map
        </button>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div
          className="forgot-password-overlay"
          onClick={() => setShowForgotPassword(false)}
        >
          <div
            className="forgot-password-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Passwort zurücksetzen</h2>
            <p>Gib deine E-Mail-Adresse ein. Du erhältst einen Reset-Link.</p>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="deine@email.de"
            />
            <div className="forgot-password-actions">
              <button onClick={() => setShowForgotPassword(false)}>
                Abbrechen
              </button>
              <button
                className="primary"
                onClick={handleForgotPassword}
              >
                Reset-Link senden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

