import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiErr, fmtDate, fmtDur } from '@/api';
import { usePrefs } from '@/i18n';
import { Journey, Leg, SearchParams } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function Handoff() {
  const navigate = useNavigate();
  const { user, openAuth } = useAuth();
  const { t, money } = usePrefs();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const raw = sessionStorage.getItem('viara_selected');

  if (!raw) {
    return (
      <div className="wrap view-enter" style={{ padding: '48px 24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 className="display" style={{ fontSize: 20, marginBottom: 10 }}>{t('ho.nothing')}</h2>
          <p style={{ color: 'var(--ink-2)', marginBottom: 16 }}>{t('ho.nothingSub')}</p>
          <button className="btn btn-primary" data-testid="handoff-back-home" onClick={() => navigate('/')}>{t('tr.searchFlights')}</button>
        </div>
      </div>
    );
  }

  const { journey, search }: { journey: Journey; search: SearchParams } = JSON.parse(raw);
  const legs: { leg: Leg; direction: string }[] = [
    ...journey.outbound.legs.map((l) => ({ leg: l, direction: 'Outbound' })),
    ...(journey.inbound ? journey.inbound.legs.map((l) => ({ leg: l, direction: 'Return' })) : []),
  ];
  const tickets = new Set(legs.map(({ leg }) => `${leg.airline}-${leg.dep_date}`)).size;

  const doSave = async () => {
    setBusy(true);
    try {
      await api.post('/trips', { journey, search });
      setSaved(true);
      toast.success(t('ho.saved'));
    } catch (e) {
      toast.error(apiErr(e));
    } finally { setBusy(false); }
  };

  const saveTrip = () => { user ? doSave() : openAuth(doSave); };

  return (
    <div className="wrap two view-enter" data-testid="handoff-page">
      <div>
        <div className="card">
          <div className="card-head">
            <div>
              <p className="eyebrow">{t('ho.eyebrow')}</p>
              <h2 className="display" style={{ fontSize: 24, marginTop: 8 }}>
                {journey.outbound.legs[0].from_city} → {journey.outbound.legs[journey.outbound.legs.length - 1].to_city}
              </h2>
              <p style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 5 }}>
                {fmtDate(journey.outbound.dep_date)}{journey.inbound ? ` — ${fmtDate(journey.inbound.dep_date)}` : ''} · {search.adults + search.children} {search.adults + search.children > 1 ? t('res.travellers') : t('res.traveller')}{search.infants ? ` + ${search.infants} ${search.infants > 1 ? t('pax.infants') : t('pax.infant')}` : ''}
              </p>
            </div>
            <p className="ref">{t('ho.indicative')}<br /><b data-testid="handoff-total">{money(journey.price_total)}</b></p>
          </div>

          {journey.separate_tickets && (
            <div className="transfer-note" data-testid="handoff-separate-tickets-warning" style={{ marginTop: 0, marginBottom: 16 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ flex: '0 0 auto', marginTop: 1 }} aria-hidden="true">
                <path d="M8 1.8l6.2 11.4H1.8L8 1.8zM8 6.3v3.1M8 11.4v.1" />
              </svg>
              <span><strong>{t('ho.warnTitle', { n: tickets })}</strong> {t('ho.warnBody')}</span>
            </div>
          )}

          <div>
            {legs.map(({ leg, direction }, i) => (
              <div className="handoff-leg" key={i} data-testid={`handoff-leg-${i}`}>
                <div style={{ display: 'flex', gap: 13, alignItems: 'center', minWidth: 0 }}>
                  <span className="al-badge" style={{ background: leg.airline_color }}>{leg.airline}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14.5 }}>{leg.from} {leg.dep_time} → {leg.to} {leg.arr_time}{leg.arr_day_offset > 0 && <sup style={{ color: 'var(--warn)' }}> +{leg.arr_day_offset}</sup>}</p>
                    <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                      {direction} · {fmtDate(leg.dep_date)} · {leg.airline_name} {leg.flight_no} · {fmtDur(leg.duration_min)} · {money(leg.price)}
                    </p>
                  </div>
                </div>
                <a className="btn btn-primary btn-sm" data-testid={`book-leg-button-${i}`} href={leg.booking_url} target="_blank" rel="noopener noreferrer">
                  {t('ho.book', { name: leg.airline_name })}
                </a>
              </div>
            ))}
          </div>

          <div className="status info" style={{ marginTop: 16 }} data-testid="handoff-price-disclaimer">
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flex: '0 0 auto', marginTop: 1 }} aria-hidden="true">
              <circle cx="9" cy="9" r="7.2" /><path d="M9 5.2v.1M9 8v4.6" />
            </svg>
            <span>{t('ho.disclaimer')}</span>
          </div>
        </div>
      </div>

      <aside>
        <div className="card">
          <h3 className="display" style={{ fontSize: 16, marginBottom: 6 }}>{t('ho.keep')}</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>
            {t('ho.keepSub')}
          </p>
          {saved ? (
            <>
              <div className="status" data-testid="trip-saved-status">
                <span>{t('ho.saved')}</span>
              </div>
              <Link to="/trips" className="btn btn-ghost btn-block" data-testid="go-to-trips-button" style={{ marginTop: 10 }}>{t('ho.goTrips')}</Link>
            </>
          ) : (
            <button className="btn btn-primary btn-block" data-testid="save-trip-button" onClick={saveTrip} disabled={busy}>
              {busy ? t('ho.saving') : user ? t('ho.saveBtn') : t('ho.signinSave')}
            </button>
          )}
        </div>
        <div className="card">
          <h3 className="display" style={{ fontSize: 16, marginBottom: 10 }}>{t('ho.before')}</h3>
          <ul style={{ display: 'grid', gap: 9, fontSize: 13, color: 'var(--ink-2)' }}>
            <li>· {t('ho.tip1')}</li>
            <li>· {t('ho.tip2')}</li>
            <li>· {t('ho.tip3')}</li>
            <li>· <Link to="/terms" data-testid="handoff-terms-link" style={{ textDecoration: 'underline' }}>{t('home.footTerms')}</Link></li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
