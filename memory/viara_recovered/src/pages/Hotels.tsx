import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, fmtDate } from '@/api';
import { usePrefs } from '@/i18n';
import { HotelArt } from '@/components/art';

interface Hotel {
  hid: string; city: string; name: string; area: string; distance: string; amenities: string[];
  room: string; score: number; score_label: string; reviews: number; price_per_night: number;
  total: number; booking_url: string; photos: number; art: number; pin: [number, number];
  free_cancel_until?: string; scarcity?: number;
}

export default function Hotels() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { t, money } = usePrefs();
  const city = sp.get('city') || 'Tirana';
  const checkin = sp.get('in') || '';
  const checkout = sp.get('out') || '';
  const guests = Number(sp.get('g') || 2);

  const [data, setData] = useState<{ hotels: Hotel[]; nights: number } | null>(null);
  const [sort, setSort] = useState<'rec' | 'price' | 'rating' | 'dist'>('rec');
  const [flt, setFlt] = useState({ freeCancel: false, breakfast: false, pool: false, stars: false });
  const [hoverPin, setHoverPin] = useState('');

  useEffect(() => {
    api.get('/hotels', { params: { city, checkin, checkout, adults: guests } })
      .then((r) => setData(r.data)).catch(() => setData({ hotels: [], nights: 0 }));
  }, [city, checkin, checkout, guests]);

  const hotels = useMemo(() => {
    if (!data) return [];
    let hs = data.hotels.filter((h) => {
      if (flt.freeCancel && !h.free_cancel_until) return false;
      if (flt.breakfast && !h.amenities.some((a) => a.toLowerCase().includes('breakfast'))) return false;
      if (flt.pool && !h.amenities.some((a) => a.toLowerCase().includes('pool'))) return false;
      if (flt.stars && h.score < 8.5) return false;
      return true;
    });
    if (sort === 'price') hs = [...hs].sort((a, b) => a.total - b.total);
    else if (sort === 'rating') hs = [...hs].sort((a, b) => b.score - a.score);
    else if (sort === 'rec') hs = [...hs].sort((a, b) => b.score * 10 - b.total / 50 - (a.score * 10 - a.total / 50));
    return hs;
  }, [data, sort, flt]);

  const toggle = (k: keyof typeof flt) => setFlt({ ...flt, [k]: !flt[k] });

  return (
    <section className="view-enter" data-testid="hotels-page">
      <div className="subbar">
        <div className="wrap subbar-in">
          <div className="trip-summary">
            <span className="trip-route">{city}</span>
            <span className="trip-detail" data-testid="hotels-summary">
              {checkin && checkout ? `${fmtDate(checkin)} — ${fmtDate(checkout)} · ${data?.nights ?? ''} ${((data?.nights ?? 2) > 1) ? t('htl.nights') : t('htl.night')} · ` : ''}{guests} {guests > 1 ? t('htl.guests') : t('htl.guest')}, 1 {t('htl.room')}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" data-testid="hotels-edit-search" onClick={() => navigate('/?tab=hotels')}>{t('res.edit')}</button>
        </div>
      </div>

      <div className="wrap">
        <div className="sortbar" style={{ paddingTop: 16, marginBottom: 0 }}>
          <button className="chip" data-testid="hotels-sort-rec" aria-pressed={sort === 'rec'} onClick={() => setSort('rec')}>{t('htl.recommended')}</button>
          <button className="chip" data-testid="hotels-sort-price" aria-pressed={sort === 'price'} onClick={() => setSort('price')}>{t('htl.price')}</button>
          <button className="chip" data-testid="hotels-sort-rating" aria-pressed={sort === 'rating'} onClick={() => setSort('rating')}>{t('htl.rating')}</button>
          <span style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 4px' }}></span>
          <button className="chip" data-testid="hotels-filter-cancel" aria-pressed={flt.freeCancel} onClick={() => toggle('freeCancel')}>{t('htl.freeCancel')}</button>
          <button className="chip" data-testid="hotels-filter-breakfast" aria-pressed={flt.breakfast} onClick={() => toggle('breakfast')}>{t('htl.breakfast')}</button>
          <button className="chip" data-testid="hotels-filter-pool" aria-pressed={flt.pool} onClick={() => toggle('pool')}>{t('htl.pool')}</button>
          <button className="chip" data-testid="hotels-filter-stars" aria-pressed={flt.stars} onClick={() => toggle('stars')}>{t('htl.stars')}</button>
          <span className="count" data-testid="hotels-count">{hotels.length} {hotels.length === 1 ? t('htl.property') : t('htl.properties')}</span>
        </div>

        <div className="split">
          <div className="hlist">
            {data && hotels.length === 0 && <div className="card" data-testid="hotels-empty"><p style={{ color: 'var(--ink-2)' }}>{t('htl.empty')}</p></div>}
            {hotels.map((h, i) => (
              <article className="hcard" key={h.hid} data-testid={`hotel-card-${h.hid}`}
                onMouseEnter={() => setHoverPin(h.hid)} onMouseLeave={() => setHoverPin('')}>
                <div className="photo">
                  <HotelArt variant={h.art} />
                  <span className="photo-count">{h.photos} {t('htl.photos')}</span>
                </div>
                <div className="hcard-body">
                  <h3 className="display">{h.name}</h3>
                  <p className="hloc">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M6 11S1.8 7.6 1.8 4.9a4.2 4.2 0 118.4 0C10.2 7.6 6 11 6 11z" /><circle cx="6" cy="4.9" r="1.4" /></svg>
                    {h.area} · {h.distance}
                  </p>
                  <div className="amen">{h.amenities.map((a) => <span className="chip chip-flat" key={a}>{a}</span>)}</div>
                  <p style={{ marginTop: 11, fontSize: 13, color: 'var(--ink-2)' }}>{h.room}</p>
                  <p style={{ marginTop: 4 }}>
                    {h.free_cancel_until
                      ? <span className="chip chip-save">{t('htl.freeCancelUntil', { date: fmtDate(h.free_cancel_until) })}</span>
                      : h.scarcity ? <span className="chip chip-warn">{t('htl.roomsLeft', { n: h.scarcity })}</span> : null}
                  </p>
                </div>
                <div className="hcard-side">
                  <div className="score">
                    <div className="score-txt"><b>{h.score_label}</b><span style={{ color: 'var(--ink-3)' }}>{h.reviews.toLocaleString()} {t('htl.reviews')}</span></div>
                    <span className="score-num">{h.score.toFixed(1)}</span>
                  </div>
                  <div className="price" style={{ fontSize: 22 }} data-testid={`hotel-price-${h.hid}`}>{money(h.price_per_night)}</div>
                  <div className="price-sub">{t('htl.perNight')} · {money(h.total)} {t('htl.total')}</div>
                  <a className={`btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-ghost'}`} style={{ marginTop: 9 }} data-testid={`hotel-book-${h.hid}`}
                    href={h.booking_url} target="_blank" rel="noopener noreferrer">{t('htl.seeRooms')}</a>
                </div>
              </article>
            ))}
          </div>

          <div className="map">
            <svg viewBox="0 0 400 620" preserveAspectRatio="xMidYMid slice" aria-label={`Map of ${city}`}>
              <rect width="400" height="620" fill="#EAF1F9" />
              <path d="M0 210h400M0 372h400M0 512h400M92 0v620M228 0v620M330 0v620" stroke="#DAE6F3" strokeWidth="12" />
              <path d="M-20 96L420 176" stroke="#DAE6F3" strokeWidth="16" />
              <path d="M228 372L420 250" stroke="#DAE6F3" strokeWidth="10" />
              <rect x="104" y="222" width="112" height="138" fill="#DCEBDF" />
              <rect x="240" y="384" width="78" height="116" fill="#DCEBDF" />
              <path d="M0 560c60-22 120 14 180-6s140-30 220 6v60H0z" fill="#CFE2F5" />
              <g fill="#DFE9F5">
                <rect x="16" y="228" width="62" height="52" /><rect x="16" y="296" width="62" height="46" />
                <rect x="244" y="228" width="70" height="48" /><rect x="244" y="292" width="70" height="52" />
                <rect x="344" y="228" width="44" height="116" />
                <rect x="106" y="392" width="102" height="48" /><rect x="106" y="452" width="102" height="42" />
                <rect x="16" y="392" width="60" height="102" />
                <rect x="106" y="60" width="102" height="56" /><rect x="244" y="60" width="70" height="56" />
              </g>
              {hotels.map((h) => (
                <g key={h.hid} className={`pin ${hoverPin === h.hid ? 'on' : ''}`} transform={`translate(${h.pin[0]},${h.pin[1]})`}
                  onMouseEnter={() => setHoverPin(h.hid)} onMouseLeave={() => setHoverPin('')}>
                  <rect x="-32" y="-15" width="64" height="27" rx="13" strokeWidth="1.2" />
                  <text x="0" y="4" textAnchor="middle">{money(h.price_per_night)}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
