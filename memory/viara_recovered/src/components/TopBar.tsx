import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePrefs, LANGS, CURRENCIES } from '@/i18n';

const Caret = () => (
  <svg className="caret" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 4l3 3 3-3" /></svg>
);

export const TopBar = () => {
  const { user, logout, openAuth } = useAuth();
  const { lang, setLang, currency, setCurrency, t } = usePrefs();
  const [pop, setPop] = useState('');
  const navigate = useNavigate();
  const togglePop = (p: string) => setPop(pop === p ? '' : p);

  return (
    <header className="topbar">
      <div className="wrap topbar-in">
        <Link to="/" className="brand" data-testid="brand-link">
          <svg className="mark" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d="M3 22C8.5 22 10 6 14 6s5.5 16 11 16" stroke="#0F52BA" strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="14" cy="6" r="3.1" fill="#3B8FE8" />
          </svg>
          <span className="brand-name">Viara</span>
        </Link>
        <nav className="nav" aria-label="Primary">
          <NavLink to="/" end data-testid="nav-flights">{t('nav.flights')}</NavLink>
          <NavLink to="/?tab=hotels" data-testid="nav-hotels">{t('nav.hotels')}</NavLink>
          <NavLink to="/?tab=cars" data-testid="nav-cars">{t('nav.cars')}</NavLink>
          <NavLink to="/trips" data-testid="nav-trips">{t('nav.trips')}</NavLink>
        </nav>
        <div className="topbar-right">
          <div className="pop-host">
            <button className="pill-btn" data-testid="language-button" aria-expanded={pop === 'lang'} onClick={() => togglePop('lang')}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="8" cy="8" r="6.3" /><path d="M1.7 8h12.6M8 1.7c1.7 1.8 2.6 4 2.6 6.3S9.7 12.5 8 14.3C6.3 12.5 5.4 10.3 5.4 8S6.3 3.5 8 1.7z" />
              </svg>
              {LANGS.find((l) => l.code === lang)?.label}
              <Caret />
            </button>
            <div className={`pop ${pop === 'lang' ? 'open' : ''}`} role="listbox" aria-label="Language">
              <p className="pop-title eyebrow">{t('top.language')}</p>
              {LANGS.map((l) => (
                <button key={l.code} className="pop-item" role="option" aria-selected={l.code === lang} data-testid={`lang-option-${l.code}`}
                  onClick={() => { setLang(l.code); setPop(''); }}>
                  {l.label} <span className="sub">{l.sub}</span>
                </button>
              ))}
              <p className="pop-note">{t('top.langNote')}</p>
            </div>
          </div>

          <div className="pop-host">
            <button className="pill-btn" data-testid="currency-button" aria-expanded={pop === 'cur'} onClick={() => togglePop('cur')}>
              {CURRENCIES.find((c) => c.code === currency)?.sub}
              <Caret />
            </button>
            <div className={`pop ${pop === 'cur' ? 'open' : ''}`} role="listbox" aria-label="Currency">
              <p className="pop-title eyebrow">{t('top.currency')}</p>
              {CURRENCIES.map((c) => (
                <button key={c.code} className="pop-item" role="option" aria-selected={c.code === currency} data-testid={`currency-option-${c.code}`}
                  onClick={() => { setCurrency(c.code); setPop(''); }}>
                  {c.label} <span className="sub">{c.sub}</span>
                </button>
              ))}
              <p className="pop-note" data-testid="currency-note">{t('top.curNote')}</p>
            </div>
          </div>

          {user ? (
            <div className="pop-host">
              <button className="avatar" data-testid="user-avatar" onClick={() => togglePop('user')} title={user.email}>
                {user.email.slice(0, 2).toUpperCase()}
              </button>
              <div className={`pop ${pop === 'user' ? 'open' : ''}`}>
                <p className="pop-title eyebrow">{user.email}</p>
                <button className="pop-item" data-testid="menu-my-trips" onClick={() => { setPop(''); navigate('/trips'); }}>{t('nav.trips')}</button>
                <button className="pop-item" data-testid="logout-button" onClick={() => { setPop(''); logout(); }}>{t('top.signout')}</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" data-testid="signin-button" onClick={() => openAuth()}>{t('top.signin')}</button>
          )}
        </div>
      </div>
    </header>
  );
};
