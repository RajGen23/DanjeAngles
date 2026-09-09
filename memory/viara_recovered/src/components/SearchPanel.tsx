import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '@/api';
import { Airport } from '@/types';
import { usePrefs } from '@/i18n';

const plusDays = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface PanelValues {
  origin: string; destination: string; depart: string; ret: string;
  oneWay: boolean; adults: number; children: number; infants: number;
  combine: boolean; directOnly: boolean;
}

export const SearchPanel = ({ initial }: { initial?: Partial<PanelValues> }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = usePrefs();
  const initTab = new URLSearchParams(location.search).get('tab') || 'flights';
  const [tab, setTab] = useState<'flights' | 'hotels' | 'cars'>(initTab as any);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [hv, setHv] = useState({ city: 'Tirana', checkin: plusDays(7), checkout: plusDays(14), guests: 2 });
  const [cv, setCv] = useState({ loc: 'TIA', pickup: plusDays(7), dropoff: plusDays(14) });
  const [v, setV] = useState<PanelValues>({
    origin: 'ZRH', destination: 'TIA', depart: plusDays(7), ret: plusDays(14),
    oneWay: false, adults: 2, children: 0, infants: 0, combine: true, directOnly: false,
    ...initial,
  });
  const [spun, setSpun] = useState(false);
  const [paxOpen, setPaxOpen] = useState(false);
  const paxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTab((new URLSearchParams(location.search).get('tab') || 'flights') as any); }, [location.search]);
  useEffect(() => {
    api.get('/airports').then((r) => setAirports(r.data)).catch(() => {});
    api.get('/hotels/cities').then((r) => setCities(r.data)).catch(() => {});
  }, []);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (paxRef.current && !paxRef.current.contains(e.target as Node)) setPaxOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const set = (patch: Partial<PanelValues>) => setV((prev) => ({ ...prev, ...patch }));
  const paxLabel = `${v.adults} ${t(v.adults > 1 ? 'pax.adults' : 'pax.adult')}${v.children ? `, ${v.children} ${t(v.children > 1 ? 'pax.children' : 'pax.child')}` : ''}${v.infants ? `, ${v.infants} ${t(v.infants > 1 ? 'pax.infants' : 'pax.infant')}` : ''}`;

  const search = () => {
    const q = new URLSearchParams({
      o: v.origin, d: v.destination, dep: v.depart,
      a: String(v.adults), c: String(v.children), i: String(v.infants),
      comb: v.combine ? '1' : '0', dir: v.directOnly ? '1' : '0',
    });
    if (!v.oneWay && v.ret) q.set('ret', v.ret);
    navigate(`/results?${q.toString()}`);
  };

  const Stepper = ({ label, sub, k, min }: { label: string; sub: string; k: 'adults' | 'children' | 'infants'; min: number }) => (
    <div className="pop-item" style={{ cursor: 'default' }}>
      <span>{cap(label)}<span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)' }}>{sub}</span></span>
      <span className="stepper">
        <button data-testid={`pax-${k}-minus`} disabled={v[k] <= min} onClick={() => set({ [k]: v[k] - 1 } as any)}>−</button>
        <span className="n" data-testid={`pax-${k}-count`}>{v[k]}</span>
        <button data-testid={`pax-${k}-plus`} disabled={v[k] >= 9} onClick={() => set({ [k]: v[k] + 1 } as any)}>+</button>
      </span>
    </div>
  );

  const airportOpts = airports.map((a) => (
    <option key={a.iata} value={a.iata}>{a.city} ({a.iata})</option>
  ));

  return (
    <div className="panel" data-testid="search-panel">
      <div className="panel-tabs" role="group" aria-label="What are you searching">
        <button data-testid="panel-tab-flights" aria-pressed={tab === 'flights'} onClick={() => setTab('flights')}>
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 10.5l14-5.2-2.6 4.1 1.3 5.6-2.3-.9-1.6-3-4 2.2-.4 2-1.3-.5.5-3.2L2 10.5z" /></svg>
          {t('nav.flights')}
        </button>
        <button data-testid="panel-tab-hotels" aria-pressed={tab === 'hotels'} onClick={() => setTab('hotels')}>
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 14.5V6l7-3.5L16 6v8.5M6.5 14.5v-4h5v4" /></svg>
          {t('nav.hotels')}
        </button>
        <button data-testid="panel-tab-cars" aria-pressed={tab === 'cars'} onClick={() => setTab('cars')}>
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2.5 11.5h13M4 11.5V14H6v-2.5M12 11.5V14h2v-2.5M3.4 11.5l1.3-4.2A2 2 0 016.6 6h4.8a2 2 0 011.9 1.3l1.3 4.2M5.5 9h7" /></svg>
          {t('nav.cars')}
        </button>
      </div>

      {tab === 'hotels' && (
        <div className="panel-body">
          <div className="panel-row" style={{ gridTemplateColumns: '1.2fr 1fr .6fr auto' }}>
            <label className="field">
              <span className="field-label">{t('panel.city')}</span>
              <span className="field-value">
                <select data-testid="hotel-city-select" value={hv.city} onChange={(e) => setHv({ ...hv, city: e.target.value })}>
                  {(cities.length ? cities : ['Tirana']).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </span>
            </label>
            <div className="dates">
              <label className="field">
                <span className="field-label">{t('panel.checkin')}</span>
                <span className="field-value"><input data-testid="hotel-checkin-input" type="date" value={hv.checkin} min={plusDays(0)} onChange={(e) => setHv({ ...hv, checkin: e.target.value })} /></span>
              </label>
              <label className="field">
                <span className="field-label">{t('panel.checkout')}</span>
                <span className="field-value"><input data-testid="hotel-checkout-input" type="date" value={hv.checkout} min={hv.checkin} onChange={(e) => setHv({ ...hv, checkout: e.target.value })} /></span>
              </label>
            </div>
            <label className="field">
              <span className="field-label">{t('panel.guests')}</span>
              <span className="field-value">
                <select data-testid="hotel-guests-select" value={hv.guests} onChange={(e) => setHv({ ...hv, guests: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </span>
            </label>
            <button className="btn btn-primary" data-testid="search-hotels-button" style={{ paddingInline: 26 }}
              onClick={() => navigate(`/hotels?city=${encodeURIComponent(hv.city)}&in=${hv.checkin}&out=${hv.checkout}&g=${hv.guests}`)}>
              {t('panel.searchHotels')}
            </button>
          </div>
        </div>
      )}

      {tab === 'cars' && (
        <div className="panel-body">
          <div className="panel-row" style={{ gridTemplateColumns: '1.2fr 1fr auto' }}>
            <label className="field">
              <span className="field-label">{t('panel.pickupLoc')}</span>
              <span className="field-value">
                <select data-testid="car-location-select" value={cv.loc} onChange={(e) => setCv({ ...cv, loc: e.target.value })}>
                  {airports.map((a) => <option key={a.iata} value={a.iata}>{a.city} ({a.iata})</option>)}
                </select>
              </span>
            </label>
            <div className="dates">
              <label className="field">
                <span className="field-label">{t('panel.pickup')}</span>
                <span className="field-value"><input data-testid="car-pickup-input" type="date" value={cv.pickup} min={plusDays(0)} onChange={(e) => setCv({ ...cv, pickup: e.target.value })} /></span>
              </label>
              <label className="field">
                <span className="field-label">{t('panel.dropoff')}</span>
                <span className="field-value"><input data-testid="car-dropoff-input" type="date" value={cv.dropoff} min={cv.pickup} onChange={(e) => setCv({ ...cv, dropoff: e.target.value })} /></span>
              </label>
            </div>
            <button className="btn btn-primary" data-testid="search-cars-button" style={{ paddingInline: 26 }}
              onClick={() => navigate(`/cars?loc=${cv.loc}&pu=${cv.pickup}&do=${cv.dropoff}`)}>
              {t('panel.searchCars')}
            </button>
          </div>
        </div>
      )}

      {tab === 'flights' && (
      <div className="panel-body">
        <div className="seg on-light" role="group" aria-label="Trip type" style={{ marginBottom: 14 }}>
          <button data-testid="trip-type-return" aria-pressed={!v.oneWay} onClick={() => set({ oneWay: false })}>{t('panel.return')}</button>
          <button data-testid="trip-type-oneway" aria-pressed={v.oneWay} onClick={() => set({ oneWay: true })}>{t('panel.oneway')}</button>
        </div>

        <div className="panel-row">
          <div className="od">
            <label className="field">
              <span className="field-label">{t('panel.from')}</span>
              <span className="field-value">
                <select data-testid="origin-select" value={v.origin} onChange={(e) => set({ origin: e.target.value })} aria-label="Departure airport">
                  {airportOpts}
                </select>
              </span>
            </label>
            <button className={`swap ${spun ? 'spun' : ''}`} data-testid="swap-button" aria-label="Swap origin and destination"
              onClick={() => { setSpun(!spun); set({ origin: v.destination, destination: v.origin }); }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#0F52BA" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 3v10M4 3L1.8 5.2M4 3l2.2 2.2M12 13V3M12 13l2.2-2.2M12 13l-2.2-2.2" />
              </svg>
            </button>
            <label className="field">
              <span className="field-label">{t('panel.to')}</span>
              <span className="field-value">
                <select data-testid="destination-select" value={v.destination} onChange={(e) => set({ destination: e.target.value })} aria-label="Destination airport">
                  {airportOpts}
                </select>
              </span>
            </label>
          </div>

          <div className={`dates ${v.oneWay ? 'oneway' : ''}`}>
            <label className="field">
              <span className="field-label">{t('panel.depart')}</span>
              <span className="field-value">
                <input data-testid="depart-date-input" type="date" value={v.depart} min={plusDays(0)} onChange={(e) => set({ depart: e.target.value })} />
              </span>
            </label>
            {!v.oneWay && (
              <label className="field">
                <span className="field-label">{t('panel.retDate')}</span>
                <span className="field-value">
                  <input data-testid="return-date-input" type="date" value={v.ret} min={v.depart} onChange={(e) => set({ ret: e.target.value })} />
                </span>
              </label>
            )}
          </div>

          <div className="pop-host" ref={paxRef}>
            <button className="field" data-testid="travellers-button" style={{ height: '100%' }} onClick={() => setPaxOpen(!paxOpen)}>
              <span className="field-label">{t('panel.travellers')}</span>
              <span className="field-value">{paxLabel}</span>
            </button>
            <div className={`pop ${paxOpen ? 'open' : ''}`} style={{ left: 0, right: 'auto', minWidth: 260 }}>
              <p className="pop-title eyebrow">{t('panel.travellers')}</p>
              <Stepper label={t('pax.adults')} sub={t('pax.adultsSub')} k="adults" min={1} />
              <Stepper label={t('pax.children')} sub={t('pax.childrenSub')} k="children" min={0} />
              <Stepper label={t('pax.infants')} sub={t('pax.infantsSub')} k="infants" min={0} />
              <p className="pop-note">{t('pax.note')}</p>
            </div>
          </div>

          <button className="btn btn-primary" data-testid="search-flights-button" style={{ paddingInline: 26 }} onClick={search}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="7" cy="7" r="4.7" /><path d="M10.5 10.5L14 14" />
            </svg>
            {t('panel.search')}
          </button>
        </div>

        <div className="panel-foot">
          <label className="switch">
            <input data-testid="combine-airlines-switch" type="checkbox" checked={v.combine} onChange={(e) => set({ combine: e.target.checked })} />
            <span className="track"></span>
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{t('panel.combine')}</span>
          </label>
          <label className="switch">
            <input data-testid="direct-only-switch" type="checkbox" checked={v.directOnly} onChange={(e) => set({ directOnly: e.target.checked })} />
            <span className="track"></span>
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{t('panel.directOnly')}</span>
          </label>
          <p className="foot-note">{t('panel.note')}</p>
        </div>
      </div>
      )}
    </div>
  );
};
