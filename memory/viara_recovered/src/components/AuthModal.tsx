import { useState } from 'react';
import { api, apiErr } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { usePrefs } from '@/i18n';

export const AuthModal = () => {
  const { authOpen, closeAuth, setUser, onAuthSuccess } = useAuth();
  const { t } = usePrefs();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!authOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { data } = await api.post(`/auth/${mode}`, { email, password });
      if (data.access_token) localStorage.setItem('viara_token', data.access_token);
      setUser({ id: data.id, email: data.email, role: data.role });
      closeAuth();
      onAuthSuccess?.();
    } catch (ex) {
      setErr(apiErr(ex));
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-back" onClick={closeAuth} data-testid="auth-modal">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">{t('auth.eyebrow')}</p>
        <h2 className="display" style={{ fontSize: 22, margin: '8px 0 4px' }}>
          {mode === 'login' ? t('auth.welcome') : t('auth.create')}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
          {t('auth.sub')}
        </p>
        {err && <div className="form-err" data-testid="auth-error">{err}</div>}
        <form onSubmit={submit}>
          <label className="field">
            <span className="field-label">{t('auth.email')}</span>
            <span className="field-value">
              <input data-testid="auth-email-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </span>
          </label>
          <label className="field">
            <span className="field-label">{t('auth.password')}</span>
            <span className="field-value">
              <input data-testid="auth-password-input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('auth.passPh')} />
            </span>
          </label>
          <button data-testid="auth-submit-button" className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? t('auth.wait') : mode === 'login' ? t('auth.signin') : t('auth.createBtn')}
          </button>
        </form>
        <p style={{ fontSize: 13, marginTop: 14, textAlign: 'center', color: 'var(--ink-2)' }}>
          {mode === 'login' ? t('auth.new') : t('auth.have')}{' '}
          <button data-testid="auth-switch-mode" className="btn-quiet" style={{ padding: '2px 6px', fontWeight: 600 }}
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
            {mode === 'login' ? t('auth.switchCreate') : t('auth.switchSignin')}
          </button>
        </p>
      </div>
    </div>
  );
};
