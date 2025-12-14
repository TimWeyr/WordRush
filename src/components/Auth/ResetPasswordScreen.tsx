// ResetPasswordScreen - Password Reset UI
// Handles password reset after user clicks email link

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/infra/supabase/client';
import { useToast } from '../Toast/ToastContainer';
import './LoginScreen.css'; // Reuse LoginScreen styles

export const ResetPasswordScreen = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    // Check if we have a valid recovery session
    checkRecoverySession();
  }, []);

  const checkRecoverySession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        setError('Ungültiger oder abgelaufener Reset-Link. Bitte fordere einen neuen an.');
        setIsValidSession(false);
        return;
      }

      setIsValidSession(true);
    } catch (err) {
      console.error('Session check error:', err);
      setError('Fehler beim Überprüfen der Session');
      setIsValidSession(false);
    }
  };

  const validatePassword = (password: string): boolean => {
    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!validatePassword(newPassword)) {
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setError(error.message || 'Fehler beim Zurücksetzen des Passworts');
      } else {
        showToast('Passwort erfolgreich zurückgesetzt! 🎉', 'success');
        // Wait a moment, then redirect to main page
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten');
      console.error('Password reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <h1>Passwort zurücksetzen</h1>
          <p>Gib dein neues Passwort ein 🔐</p>
        </div>

        {!isValidSession ? (
          // Invalid session - show error
          <div className="login-form">
            <div className="login-error" style={{ marginBottom: '1.5rem' }}>
              {error || 'Ungültiger Reset-Link'}
            </div>
            <button
              className="login-submit"
              onClick={() => navigate('/login')}
            >
              ← Zurück zum Login
            </button>
          </div>
        ) : (
          // Valid session - show form
          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="login-error">{error}</div>}

            <div className="login-field">
              <label htmlFor="newPassword">Neues Passwort</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen"
                disabled={loading}
                required
                autoFocus
              />
            </div>

            <div className="login-field">
              <label htmlFor="confirmPassword">Passwort bestätigen</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Passwort wiederholen"
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? '⏳ Wird gespeichert...' : '✅ Passwort speichern'}
            </button>
          </form>
        )}

        {/* Back to Login */}
        <button className="back-to-game" onClick={() => navigate('/login')}>
          ← Zurück zum Login
        </button>
      </div>
    </div>
  );
};

