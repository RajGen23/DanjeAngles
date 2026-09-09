import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiErr, fmtDate, fmtDur } from '@/api';
import { usePrefs } from '@/i18n';
import { Trip, Leg } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const tripLegs = (t: Trip): Leg[] => [
  ...t.itinerary_snapshot.outbound.legs,
  ...(t.itinerary_snapshot.inbound ? t.itinerary_snapshot.inbound.legs : []),
];

const BookForm = ({ trip, onDone }: { trip: Trip; onDone: () => void }) => {
  const legs = tripLegs(trip);
  const { t } = usePrefs();
  const [refs, setRefs] = useState<Record<string, string>>(Object.fromEntries(trip.leg_refs.map((r) => [r.flight_no, r.ref])));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.patch(`/trips/${trip.id}/book`, { leg_refs: legs.map((l) => ({ flight_no: l.flight_no, ref: refs[l.flight_no] || '' })) });
      toast.success(t('tr.booked'));
      onDone();
    } catch (e) { toast.error(apiErr(e)); } finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: 12, padding: 14, background: 'var(--mist)', borderRadius: 'var(--r-sm)' }} data-testid={`book-form-${trip.id}`}>
      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t('tr.refTitle')}</p>
      {legs.map((l) => (
        <label className="field" key={l.flight_no} style={{ marginBottom: 8 }}>
          <span className="field-label">{l.airline_name} {l.flight_no} · {l.from}→{l.to}</span>
          <span className="field-value">
            <input data-testid={`ref-input-${l.flight_no}`} placeholder="e.g. K8Q2ZP" value={refs[l.flight_no] || ''}
              onChange={(e) => setRefs({ ...refs, [l.flight_no]: e.target.value.toUpperCase() })} />
          </span>
        </label>
      ))}
      <button className="btn btn-primary btn-sm" data-testid={`confirm-booked-${trip.id}`} onClick={submit} disabled={busy}>
        {busy ? '…' : t('tr.confirm')}
      </button>
    </div>
  );
};

const TripCard = ({ trip, onChanged }: { trip: Trip; onChanged: () => void }) => {
  const [showBook, setShowBook] = useState(false);
  const { t, money } = usePrefs();
  const j = trip.itinerary_snapshot;
  const legs = tripLegs(trip);
  const refFor = (fn: string) => trip.leg_refs.find((r) => r.flight_no === fn)?.ref;

  const remove = async () => {
    try { await api.delete(`/trips/${trip.id}`); toast.success(t('tr.remove')); onChanged(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  return (
    <div className="card" data-testid={`trip-card-${trip.id}`}>
      <div className="card-head">
        <div>
          <p className="eyebrow">
            {trip.status === 'booked' ? t('tr.bookedEyebrow') : t('tr.savedEyebrow')}
          </p>
          <h2 className="display" style={{ fontSize: 22, marginTop: 8 }}>
            {j.outbound.legs[0].from_city} → {j.outbound.legs[j.outbound.legs.length - 1].to_city}
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 5 }}>
            {fmtDate(j.outbound.dep_date)}{j.inbound ? ` — ${fmtDate(j.inbound.dep_date)}` : ''} · {money(j.price_total)} {t('tr.indicative')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }} className="no-print">
          <span className={`chip ${trip.status === 'booked' ? 'chip-save' : 'chip-blue'}`} data-testid={`trip-status-${trip.id}`}>
            {trip.status === 'booked' ? t('tr.booked') : t('tr.saved')}
          </span>
        </div>
      </div>

      {trip.schedule_changed && (
        <div className="status pending" style={{ marginBottom: 14 }} data-testid={`schedule-changed-${trip.id}`}>
          <span><strong>{t('tr.scheduleChanged')}</strong></span>
        </div>
      )}

      <div className="status info" style={{ marginBottom: 16 }}>
        <span>{t('tr.notSeller')}</span>
      </div>

      <div className="tl">
        {legs.map((l, i) => (
          <div className="tl-item" key={i}>
            <span className="tl-dot"></span>
            <p className="tl-when">{fmtDate(l.dep_date).toUpperCase()} · {l.dep_time} — {l.arr_time}{l.arr_day_offset > 0 ? ` (+${l.arr_day_offset})` : ''}</p>
            <p className="tl-title">{l.from_city} ({l.from}) → {l.to_city} ({l.to})</p>
            <p className="tl-sub">
              {l.airline_name} {l.flight_no} · {fmtDur(l.duration_min)}
              {refFor(l.flight_no) && <> · {t('tr.ref')} <b className="mono">{refFor(l.flight_no)}</b></>}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 9, marginTop: 18, flexWrap: 'wrap' }} className="no-print">
        {trip.status !== 'booked' && (
          <button className="btn btn-primary btn-sm" data-testid={`mark-booked-${trip.id}`} onClick={() => setShowBook(!showBook)}>
            {t('tr.iBooked')}
          </button>
        )}
        {trip.status === 'booked' && (
          <button className="btn btn-ghost btn-sm" data-testid={`edit-refs-${trip.id}`} onClick={() => setShowBook(!showBook)}>{t('tr.editRefs')}</button>
        )}
        <button className="btn btn-ghost btn-sm" data-testid={`print-trip-${trip.id}`} onClick={() => window.print()}>{t('tr.print')}</button>
        <button className="btn btn-ghost btn-sm" data-testid={`delete-trip-${trip.id}`} onClick={remove}>{t('tr.remove')}</button>
      </div>
      {showBook && <BookForm trip={trip} onDone={() => { setShowBook(false); onChanged(); }} />}
    </div>
  );
};

export default function Trips() {
  const { user, openAuth } = useAuth();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const load = () => { api.get('/trips').then((r) => setTrips(r.data)).catch(() => setTrips([])); };
  useEffect(() => { if (user) load(); }, [user]);

  if (user === null) return null;
  if (user === false) {
    return (
      <div className="wrap view-enter" style={{ padding: '48px 24px' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
          <h2 className="display" style={{ fontSize: 20, marginBottom: 10 }}>{t('tr.signinTitle')}</h2>
          <p style={{ color: 'var(--ink-2)', marginBottom: 16 }}>{t('tr.signinSub')}</p>
          <button className="btn btn-primary" data-testid="trips-signin-button" onClick={() => openAuth()}>{t('top.signin')}</button>
        </div>
      </div>
    );
  }

  const shown = (trips || []).filter((t) => (tab === 'upcoming' ? t.upcoming : !t.upcoming));

  return (
    <section className="view-enter" data-testid="trips-page">
      <div className="subbar no-print">
        <div className="wrap subbar-in">
          <div className="seg on-light">
            <button data-testid="trips-tab-upcoming" aria-pressed={tab === 'upcoming'} onClick={() => setTab('upcoming')}>{t('tr.upcoming')}</button>
            <button data-testid="trips-tab-past" aria-pressed={tab === 'past'} onClick={() => setTab('past')}>{t('tr.past')}</button>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} data-testid="trips-search-more" onClick={() => navigate('/')}>{t('tr.searchFlights')}</button>
        </div>
      </div>

      <div className="wrap" style={{ padding: '24px 24px 56px', maxWidth: 860 }}>
        {trips === null && <div className="skel"><div className="bar" style={{ width: '50%' }}></div><div className="bar" style={{ width: '80%', marginBottom: 0 }}></div></div>}
        {trips !== null && shown.length === 0 && (
          <div className="card" style={{ textAlign: 'center' }} data-testid="trips-empty">
            <h3 className="display" style={{ fontSize: 18, marginBottom: 8 }}>{t('tr.emptyTitle', { tab: tab === 'upcoming' ? t('tr.upcoming').toLowerCase() : t('tr.past').toLowerCase() })}</h3>
            <p style={{ color: 'var(--ink-2)', marginBottom: 14 }}>{t('tr.emptySub')}</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>{t('tr.searchFlights')}</button>
          </div>
        )}
        {shown.map((t) => <TripCard key={t.id} trip={t} onChanged={load} />)}
      </div>
    </section>
  );
}
