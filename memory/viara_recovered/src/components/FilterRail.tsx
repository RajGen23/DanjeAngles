import { useState } from 'react';
import { Journey } from '@/types';
import { fmtDur } from '@/api';
import { usePrefs } from '@/i18n';

export interface Filters {
  maxPrice: number; stops: Set<number>; combine: boolean;
  times: Set<string>; maxDur: number; airlines: Set<string>;
  cabinBag: boolean; checkedBag: boolean;
}

export const timeBucket = (dep: string): string => {
  const h = parseInt(dep.slice(0, 2), 10);
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18) return 'evening';
  return 'night';
};

const BUCKETS = [
  { id: 'morning', sub: '06:00–12:00' },
  { id: 'afternoon', sub: '12:00–18:00' },
  { id: 'evening', sub: '18:00–00:00' },
  { id: 'night', sub: '00:00–06:00' },
];

export const FilterRail = ({ journeys, filters, setFilters, bounds, airlineNames, hiddenByCombine, cheapestCombined }: {
  journeys: Journey[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  bounds: { minPrice: number; maxPrice: number; minDur: number; maxDur: number };
  airlineNames: Record<string, string>;
  hiddenByCombine: number;
  cheapestCombined: number | null;
}) => {
  const [collapsed, setCollapsed] = useState(window.innerWidth <= 1080);
  const { t, money } = usePrefs();
  const f = filters;
  const set = (patch: Partial<Filters>) => setFilters({ ...f, ...patch });

  const minBy = (pred: (j: Journey) => boolean) => {
    const m = journeys.filter(pred).map((j) => j.price_total);
    return m.length ? money(Math.min(...m)) : '—';
  };
  const allAirlines = Array.from(new Set(journeys.flatMap((j) => j.carriers))).sort();
  const toggleSet = <T,>(s: Set<T>, v: T) => { const n = new Set(s); n.has(v) ? n.delete(v) : n.add(v); return n; };
  const pricePct = bounds.maxPrice > bounds.minPrice ? ((f.maxPrice - bounds.minPrice) / (bounds.maxPrice - bounds.minPrice)) * 100 : 100;
  const durPct = bounds.maxDur > bounds.minDur ? ((f.maxDur - bounds.minDur) / (bounds.maxDur - bounds.minDur)) * 100 : 100;

  return (
    <aside className={`rail ${collapsed ? 'collapsed' : ''}`} aria-label="Filters" data-testid="filter-rail">
      <div className="rail-head">
        <h3 style={{ fontSize: 14, fontFamily: 'var(--body)', letterSpacing: 0 }}>{t('fil.title')}</h3>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button className="btn-quiet" data-testid="filters-reset-button" style={{ fontSize: 12.5, fontWeight: 600, padding: '4px 8px' }}
            onClick={() => setFilters({ maxPrice: bounds.maxPrice, stops: new Set([0, 1]), combine: true, times: new Set(), maxDur: bounds.maxDur, airlines: new Set(), cabinBag: false, checkedBag: false })}>
            {t('fil.reset')}
          </button>
          <button className="rail-toggle" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? 'Show' : 'Hide'}</button>
        </span>
      </div>

      <div className="fgroup">
        <h4>{t('fil.price')}</h4>
        <input data-testid="filter-price-range" type="range" min={bounds.minPrice} max={bounds.maxPrice} value={f.maxPrice}
          style={{ ['--fill' as any]: `${pricePct}%` }}
          onChange={(e) => set({ maxPrice: Number(e.target.value) })} aria-label="Maximum price" />
        <div className="fgroup-row"><span>{money(bounds.minPrice)}</span><span>{t('fil.upTo')} {money(f.maxPrice)}</span></div>
      </div>

      <div className="fgroup">
        <h4>{t('fil.stops')}</h4>
        <label className="check"><input data-testid="filter-stops-direct" type="checkbox" checked={f.stops.has(0)} onChange={() => set({ stops: toggleSet(f.stops, 0) })} /> {t('fil.direct')} <span className="amt">{minBy((j) => j.outbound.stops === 0)}</span></label>
        <label className="check"><input data-testid="filter-stops-1" type="checkbox" checked={f.stops.has(1)} onChange={() => set({ stops: toggleSet(f.stops, 1) })} /> {t('fil.oneStop')} <span className="amt">{minBy((j) => j.outbound.stops === 1)}</span></label>
      </div>

      <div className="fgroup">
        <h4>{t('fil.combined')}</h4>
        <label className="switch" style={{ justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: 13.5 }}>{t('fil.combinedSub')}</span>
          <input data-testid="filter-combine-switch" type="checkbox" checked={f.combine} onChange={(e) => set({ combine: e.target.checked })} />
          <span className="track"></span>
        </label>
        {f.combine && hiddenByCombine > 0 && cheapestCombined != null && (
          <p className="hint">{t('fil.hint', { n: hiddenByCombine, p: money(cheapestCombined) })}</p>
        )}
      </div>

      <div className="fgroup">
        <h4>{t('fil.depTime')}</h4>
        <div className="timegrid" role="group">
          {BUCKETS.map((b) => (
            <button key={b.id} data-testid={`filter-time-${b.id}`} aria-pressed={f.times.has(b.id)} onClick={() => set({ times: toggleSet(f.times, b.id) })}>
              {t(`fil.${b.id}`)}<small>{b.sub}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="fgroup">
        <h4>{t('fil.duration')}</h4>
        <input data-testid="filter-duration-range" type="range" min={bounds.minDur} max={bounds.maxDur} value={f.maxDur}
          style={{ ['--fill' as any]: `${durPct}%` }}
          onChange={(e) => set({ maxDur: Number(e.target.value) })} aria-label="Maximum duration" />
        <div className="fgroup-row"><span>{fmtDur(bounds.minDur)}</span><span>{t('fil.upTo')} {fmtDur(f.maxDur)}</span></div>
      </div>

      <div className="fgroup">
        <h4>{t('fil.airlines')}</h4>
        {allAirlines.map((code) => (
          <label className="check" key={code}>
            <input data-testid={`filter-airline-${code}`} type="checkbox"
              checked={f.airlines.size === 0 || f.airlines.has(code)}
              onChange={() => {
                const base = f.airlines.size === 0 ? new Set(allAirlines) : new Set(f.airlines);
                base.has(code) ? base.delete(code) : base.add(code);
                set({ airlines: base.size === allAirlines.length ? new Set() : base });
              }} />
            {airlineNames[code] || code} <span className="amt">{minBy((j) => j.carriers.includes(code))}</span>
          </label>
        ))}
      </div>

      <div className="fgroup">
        <h4>{t('fil.baggage')}</h4>
        <label className="check"><input data-testid="filter-cabin-bag" type="checkbox" checked={f.cabinBag} onChange={(e) => set({ cabinBag: e.target.checked })} /> {t('fil.cabin')}</label>
        <label className="check"><input data-testid="filter-checked-bag" type="checkbox" checked={f.checkedBag} onChange={(e) => set({ checkedBag: e.target.checked })} /> {t('fil.checked')}</label>
      </div>
    </aside>
  );
};
