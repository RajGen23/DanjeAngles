import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, fmtDate } from '@/api';
import { usePrefs } from '@/i18n';
import { CarArt } from '@/components/art';

interface Car {
  cid: string; location: string; name: string; category: string; transmission: string; mileage: string;
  insurance: string; seats: number; bags: number; provider: string; provider_code: string; desk: string;
  price_per_day: number; total: number; features: string[]; art: number;
  automatic: boolean; unlimited: boolean; full_insurance: boolean; booking_url: string;
}

export default function Cars() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { t, money } = usePrefs();
  const loc = sp.get('loc') || 'TIA';
  const pickup = sp.get('pu') || '';
  const dropoff = sp.get('do') || '';

  const [data, setData] = useState<{ cars: Car[]; days: number; providers: number } | null>(null);
  const [sort, setSort] = useState<'price' | 'size'>('price');
  const [flt, setFlt] = useState({ automatic: false, unlimited: false, fullIns: false });

  useEffect(() => {
    api.get('/cars', { params: { location: loc, pickup, dropoff } })
      .then((r) => setData(r.data)).catch(() => setData({ cars: [], days: 0, providers: 0 }));
  }, [loc, pickup, dropoff]);

  const cars = useMemo(() => {
    if (!data) return [];
    let cs = data.cars.filter((c) => {
      if (flt.automatic && !c.automatic) return false;
      if (flt.unlimited && !c.unlimited) return false;
      if (flt.fullIns && !c.full_insurance) return false;
      return true;
    });
    cs = [...cs].sort((a, b) => sort === 'price' ? a.total - b.total : b.seats * 10 + b.bags - (a.seats * 10 + a.bags));
    return cs;
  }, [data, sort, flt]);

  const toggle = (k: keyof typeof flt) => setFlt({ ...flt, [k]: !flt[k] });

  return (
    <section className="view-enter" data-testid="cars-page">
      <div className="subbar">
        <div className="wrap subbar-in">
          <div className="trip-summary">
            <span className="trip-route">{loc}</span>
            <span className="trip-detail" data-testid="cars-summary">
              {pickup && `${t('car.pickup')} ${fmtDate(pickup)} · ${t('car.dropoff')} ${dropoff ? fmtDate(dropoff) : ''}`}{data ? ` · ${data.days} ${data.days > 1 ? t('car.days') : t('car.day')}` : ''}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" data-testid="cars-edit-search" onClick={() => navigate('/?tab=cars')}>{t('res.edit')}</button>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 56 }}>
        <div className="sortbar" style={{ paddingTop: 18 }}>
          <button className="chip" data-testid="cars-sort-price" aria-pressed={sort === 'price'} onClick={() => setSort('price')}>{t('car.price')}</button>
          <button className="chip" data-testid="cars-sort-size" aria-pressed={sort === 'size'} onClick={() => setSort('size')}>{t('car.size')}</button>
          <span style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 4px' }}></span>
          <button className="chip" data-testid="cars-filter-automatic" aria-pressed={flt.automatic} onClick={() => toggle('automatic')}>{t('car.automatic')}</button>
          <button className="chip" data-testid="cars-filter-unlimited" aria-pressed={flt.unlimited} onClick={() => toggle('unlimited')}>{t('car.unlimited')}</button>
          <button className="chip" data-testid="cars-filter-fullins" aria-pressed={flt.fullIns} onClick={() => toggle('fullIns')}>{t('car.fullIns')}</button>
          <span className="count" data-testid="cars-count">{t('car.count', { n: cars.length, p: data?.providers ?? 0 })}</span>
        </div>

        {data && cars.length === 0 && <div className="card" data-testid="cars-empty"><p style={{ color: 'var(--ink-2)' }}>{t('car.empty')}</p></div>}

        {cars.map((c, i) => (
          <article className="ccard" key={c.cid} data-testid={`car-card-${c.cid}`}>
            <div className="car-art"><CarArt variant={c.art} /></div>
            <div className="ccard-body">
              <h3 className="display" style={{ fontSize: 17 }}>{c.name}</h3>
              <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>{c.category} · {t('car.orSimilar')}</p>
              <dl className="spec">
                <div><dt>{t('car.transmission')}</dt><dd>{c.automatic ? t('car.automatic') : c.transmission}</dd></div>
                <div><dt>{t('car.mileage')}</dt><dd>{c.mileage}</dd></div>
                <div><dt>{t('car.insurance')}</dt><dd>{c.insurance}</dd></div>
                <div><dt>{t('car.capacity')}</dt><dd>{t('car.seatsBags', { s: c.seats, b: c.bags })}</dd></div>
              </dl>
              <div className="carriers" style={{ marginTop: 14 }}>
                <span className="provider"><span className="prov-logo">{c.provider_code}</span> {c.provider} · {c.desk}</span>
                {c.features.map((f) => <span className={`chip ${f.includes('capped') ? 'chip-warn' : f.includes('rated') ? 'chip-blue' : 'chip-flat'}`} key={f}>{f}</span>)}
              </div>
            </div>
            <div className="hcard-side">
              <div className="price" style={{ fontSize: 22 }} data-testid={`car-price-${c.cid}`}>{money(c.price_per_day)}</div>
              <div className="price-sub">{t('car.perDay')} · {money(c.total)} {t('car.total')}</div>
              <a className={`btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-ghost'}`} style={{ marginTop: 9 }} data-testid={`car-book-${c.cid}`}
                href={c.booking_url} target="_blank" rel="noopener noreferrer">{t('car.select')}</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
