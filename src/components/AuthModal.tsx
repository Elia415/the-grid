import React, { useState, useEffect } from 'react';
import { X, User, LogOut, ShieldCheck } from 'lucide-react';
import { loginUser, registerUser, logoutUser, isFirebaseConfigured } from '../services/firebase';
import { isValidEmail, validatePasswordStrength, sanitizeInput } from '../services/security';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUserChange: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserChange,
}) => {
  const [activeMode, setActiveMode] = useState<'login' | 'register'>('login');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isLoggedIn = user !== null && Boolean(user.uid) && !user.uid.startsWith('guest_');

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      if (!cleanEmail || !isValidEmail(cleanEmail)) {
        throw new Error('Inserisci un indirizzo email valido.');
      }
      if (!password) {
        throw new Error('Inserisci la password.');
      }

      const loggedUser = await loginUser(cleanEmail, password);
      onUserChange(loggedUser);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante l\'accesso.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration with Double Check Password
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const cleanName = sanitizeInput(name.trim(), 60);
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanName) {
        throw new Error('Inserisci il tuo nome o pseudonimo.');
      }
      if (!cleanEmail || !isValidEmail(cleanEmail)) {
        throw new Error('Inserisci un indirizzo email valido (es. nome@dominio.com).');
      }

      const passCheck = validatePasswordStrength(password);
      if (!passCheck.isValid) {
        throw new Error(passCheck.error || 'La password deve contenere almeno 6 caratteri.');
      }

      if (password !== confirmPassword) {
        throw new Error('Le password non coincidono. Verifica e reinserisci la conferma password.');
      }

      const newUser = await registerUser(cleanEmail, password, cleanName);
      onUserChange(newUser);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante la registrazione.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onUserChange(null as any);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '92vw',
          maxWidth: '420px',
          maxHeight: '94vh',
          overflowY: 'auto',
          background: '#070709',
          border: '1px solid #ffffff',
          padding: 'clamp(1.2rem, 3vw, 2rem)',
          position: 'relative',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.8rem',
          marginBottom: '1.2rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={15} color="#ffffff" />
            <h2 style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: 0,
            }}>
              {isLoggedIn ? 'PROFILO CURATORE' : activeMode === 'login' ? 'ACCESSO' : 'REGISTRAZIONE'}
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.25rem' }}
            aria-label="Chiudi"
          >
            <X size={18} />
          </button>
        </div>

        {/* LOGGED IN VIEW */}
        {isLoggedIn ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            <div style={{
              background: '#0c0c0e',
              border: '1px solid var(--border-subtle)',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.2rem',
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '2px',
                background: '#1a1a20',
                border: '1px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '1.2rem',
                color: '#ffffff',
              }}>
                {(user?.displayName || 'C')[0].toUpperCase()}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: '#ffffff',
                }}>
                  {user?.displayName || 'Curatore Ufficiale'}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  {user?.email}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.75rem',
              background: isFirebaseConfigured ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${isFirebaseConfigured ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              color: isFirebaseConfigured ? '#00ff88' : 'rgba(255, 255, 255, 0.6)',
              letterSpacing: '0.04em',
            }}>
              <ShieldCheck size={13} color={isFirebaseConfigured ? '#00ff88' : '#ffffff'} />
              <span>
                {isFirebaseConfigured
                  ? 'SINCRONIZZAZIONE CLOUD ATTIVA (PC & SMARTPHONE)'
                  : 'MODALITÀ LOCALE ATTIVA (CONFIGURA FIREBASE PER CLOUD SYNC)'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="btn-grid"
              style={{ padding: '0.85rem', justifyContent: 'center', gap: '0.5rem' }}
            >
              <LogOut size={14} />
              <span>DISCONNETTI SESSIONE</span>
            </button>
          </div>
        ) : (
          /* LOGIN / REGISTRATION FORMS */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            {/* Segmented Mode Selector */}
            <div style={{
              display: 'flex',
              border: '1px solid var(--border-subtle)',
              background: '#000000',
            }}>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('login');
                  setErrorMsg('');
                }}
                style={{
                  flex: 1,
                  padding: '0.65rem 0',
                  background: activeMode === 'login' ? '#ffffff' : 'transparent',
                  color: activeMode === 'login' ? '#000000' : 'rgba(255,255,255,0.5)',
                  border: 'none',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  fontWeight: activeMode === 'login' ? 800 : 500,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
              >
                ACCEDI
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMode('register');
                  setErrorMsg('');
                }}
                style={{
                  flex: 1,
                  padding: '0.65rem 0',
                  background: activeMode === 'register' ? '#ffffff' : 'transparent',
                  color: activeMode === 'register' ? '#000000' : 'rgba(255,255,255,0.5)',
                  border: 'none',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  fontWeight: activeMode === 'register' ? 800 : 500,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
              >
                REGISTRATI
              </button>
            </div>

            {errorMsg && (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: '#ff4d4d',
                background: 'rgba(255, 77, 77, 0.1)',
                padding: '0.6rem 0.8rem',
                border: '1px solid rgba(255, 77, 77, 0.4)',
                lineHeight: 1.4,
              }}>
                {errorMsg}
              </div>
            )}

            {/* TAB 1: LOGIN */}
            {activeMode === 'login' && (
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                  <label style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    color: 'rgba(255,255,255,0.5)',
                    display: 'block',
                    marginBottom: '0.35rem',
                    letterSpacing: '0.04em',
                  }}>
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="latua@email.com"
                    required
                    style={{
                      width: '100%',
                      background: '#040404',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      padding: '0.65rem 0.8rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    color: 'rgba(255,255,255,0.5)',
                    display: 'block',
                    marginBottom: '0.35rem',
                    letterSpacing: '0.04em',
                  }}>
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      background: '#040404',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      padding: '0.65rem 0.8rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-grid btn-grid-active"
                  style={{
                    padding: '0.85rem',
                    justifyContent: 'center',
                    marginTop: '0.4rem',
                    fontSize: '0.78rem',
                    letterSpacing: '0.08em',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <span>{loading ? 'ACCESSO IN CORSO...' : 'ACCEDI'}</span>
                </button>
              </form>
            )}

            {/* TAB 2: REGISTRATION WITH DOUBLE CHECK PASSWORD */}
            {activeMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                  <label style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    color: 'rgba(255,255,255,0.5)',
                    display: 'block',
                    marginBottom: '0.35rem',
                    letterSpacing: '0.04em',
                  }}>
                    NOME / PSEUDONIMO
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Mario Rossi"
                    required
                    style={{
                      width: '100%',
                      background: '#040404',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      padding: '0.65rem 0.8rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    color: 'rgba(255,255,255,0.5)',
                    display: 'block',
                    marginBottom: '0.35rem',
                    letterSpacing: '0.04em',
                  }}>
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="latua@email.com"
                    required
                    style={{
                      width: '100%',
                      background: '#040404',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      padding: '0.65rem 0.8rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    color: 'rgba(255,255,255,0.5)',
                    display: 'block',
                    marginBottom: '0.35rem',
                    letterSpacing: '0.04em',
                  }}>
                    PASSWORD (MIN. 6 CARATTERI)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      background: '#040404',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      padding: '0.65rem 0.8rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    color: 'rgba(255,255,255,0.5)',
                    display: 'block',
                    marginBottom: '0.35rem',
                    letterSpacing: '0.04em',
                  }}>
                    CONFERMA PASSWORD (DOUBLE CHECK)
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      background: '#040404',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      padding: '0.65rem 0.8rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginTop: '0.2rem',
                }}>
                  <ShieldCheck size={14} color="#00ff88" style={{ flexShrink: 0 }} />
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.62rem',
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.3,
                  }}>
                    Protezione crittografica avanzata con hashing PBKDF2 / SHA-256 e zero password in chiaro.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-grid btn-grid-active"
                  style={{
                    padding: '0.85rem',
                    justifyContent: 'center',
                    marginTop: '0.4rem',
                    fontSize: '0.78rem',
                    letterSpacing: '0.08em',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <span>{loading ? 'REGISTRAZIONE IN CORSO...' : 'CREA ACCOUNT PROTETTO'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
