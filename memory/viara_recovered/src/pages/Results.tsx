import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, fmtDate, fmtDur } from '@/api';
import { usePrefs } from '@/i18n';
import { Journey, SearchResponse, SearchParams, Airline } from '@/types';
import { FlightCard } from '@/components/FlightCard';
import { FilterRail, Filters, timeBucket } from '@/components/FilterRail';

export default function Results() {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const { t, money } = usePrefs();
  const search: SearchParams = {
    origin: sp.get('o') || 'ZRH', destination: sp.get('d') || 'TIA',
    depart_date: sp.get('dep') || '', return_date: sp.get('ret'),
    adults: Number(sp.get('a') || 1), children: Number(sp.get('c') || 0), infants: Number(sp.get('i') || 0),
    combine: sp.get('comb') !== '0', direct_only: sp.get('dir') === '1',
  };

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<'best' | 'cheapest' | 'fastest'>('best');
  const [filters, setFilters] = useState<Filters | null>(null);
  const [airlineNames, setAirlineNames] = useState<Record<string, string>>({});

  useEffect(() => { api.get('/airlines').then((r) => setAirlineNames(Object.fromEntries(r.data.map((a: Airline) => [a.code, a.name])))).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true); setError('');
    api.post('/search', search)
      .then((r) => {
        setData(r.data);
        const js: Journey[] = r.data.journeys;
        const maxP = js.length ? Math.max(...js.map((j) => j.price_total)) : 1000;
        const maxD = js.length ? Math.max(...js.map((j) => j.duration_total)) : 720;
        setFilters({ maxPrice: maxP, stops: new Set([0, 1]), combine: true, times: new Set(), maxDur: maxD, airlines: new Set(), cabinBag: false, checkedBag: false });
      })
      .catch(() => setError(t('res.failed')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const bounds = useMemo(() => {
    const js = data?.journeys || [];
    return {
      minPrice: js.length ? Math.min(...js.map((j) => j.price_total)) : 0,
      maxPrice: js.length ? Math.max(...js.map((j) => j.price_total)) : 1000,
      minDur: js.length ? Math.min(...js.map((j) => j.duration_total)) : 0,
      maxDur: js.length ? Math.max(...js.map((j) => j.duration_total)) : 720,
    };
  }, [data]);

  const filtered = useMemo(() => {
    if (!data || !filters) return [];
    const f = filters;
    let js = data.journeys.filter((j) => {
      if (j.price_total > f.maxPrice) return false;
      if (!f.stops.has(j.outbound.stops) || (j.inbound && !f.stops.has(j.inbound.stops))) return false;
      if (!f.combine && j.self_transfer) return false;
      if (f.times.size > 0 && !f.times.has(timeBucket(j.outbound.dep_time))) return false;
      if (j.duration_total > f.maxDur) return false;
      if (f.airlines.size > 0 && !j.carriers.every((c) => f.airlines.has(c))) return false;
      if (f.cabinBag && !(j.outbound.bags.cabin && (!j.inbound || j.inbound.bags.cabin))) return false;
      if (f.checkedBag && !(j.outbound.bags.checked && (!j.inbound || j.inbound.bags.checked))) return false;
      return true;
    });
    if (sort === 'cheapest') js = [...js].sort((a, b) => a.price_total - b.price_total);
    else if (sort === 'fastest') js = [...js].sort((a, b) => a.duration_total - b.duration_total);
    return js;
  }, [data, filters, sort]);

  const cheapest = filtered.length ? Math.min(...filtered.map((j) => j.price_total)) : null;
  const fastest = filtered.length ? Math.min(...filtered.map((j) => j.duration_total)) : null;
  const combined = (data?.journeys || []).filter((j) => j.self_transfer);
  const cheapestCombined = combined.length ? Math.min(...combined.map((j) => j.price_total)) : null;

  const onSelect = (j: Journey) => {
    api.post('/track/select', { journey_id: j.id, origin: search.origin, destination: search.destination, price_total: j.price_total, self_transfer: j.self_transfer }).catch(() => {});
    sessionStorage.setItem('viara_selected', JSON.stringify({ journey: j, search }));
    navigate('/handoff');
  };

  const setDepart = (date: string) => { sp.set('dep', date); setSp(sp); };

  const badgeFor = (j: Journey) => {
    if (j.price_total === cheapest && j.duration_total === fastest) return t('card.bestBadge');
    if (j.duration_total === fastest) return t('card.fastestBadge');
    return undefined;
  };

  return (
    <section className="view-enter">
      <div className="subbar">
        <div className="wrap subbar-in">
          <div className="trip-summary">
            <span className="trip-route mono" data-testid="trip-route">{search.origin} → {search.destination}</span>
            <span className="trip-detail" data-testid="trip-detail">
              {fmtDate(search.depart_date)}{search.return_date ? ` — ${fmtDate(search.return_date)}` : ''} · {search.adults + search.children} {search.adults + search.children > 1 ? t('res.travellers') : t('res.traveller')} · {search.return_date ? t('res.return') : t('res.oneway')}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" data-testid="edit-search-button" onClick={() => navigate('/')}>{t('res.edit')}</button>
        </div>
      </div>

      <div className="wrap results">
        {filters && data && !data.empty ? (
          <FilterRail journeys={data.journeys} filters={filters} setFilters={setFilters} bounds={bounds}
            airlineNames={airlineNames} hiddenByCombine={combined.length} cheapestCombined={cheapestCombined} />
        ) : <div />}

        <div>
          {data && data.flex.length > 0 && (
            <>
              <p className="eyebrow" style={{ marginBottom: 8 }}>{t('res.flex')}</p>
              <div className="flexdates" role="group" aria-label="Departure date options" data-testid="flex-dates">
                {data.flex.map((fd) => {
                  const low = fd.price != null && fd.price === Math.min(...data.flex.filter((x) => x.price != null).map((x) => x.price as number));
                  return (
                    <button key={fd.date} data-testid={`flex-date-${fd.offset}`} aria-pressed={fd.offset === 0}
                      disabled={fd.price == null} onClick={() => fd.offset !== 0 && setDepart(fd.date)}>
                      <span className="fd-day">{fmtDate(fd.date)}</span>
                      <span className={`fd-price ${low ? 'fd-low' : ''}`}>{fd.price != null ? money(fd.price) : '—'}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {loading && (
            <>{[1, 2, 3].map((i) => (
              <div className="skel" key={i} data-testid="loading-skeleton">
                <div className="bar" style={{ width: '40%' }}></div>
                <div className="bar" style={{ width: '85%' }}></div>
                <div className="bar" style={{ width: '60%', marginBottom: 0 }}></div>
              </div>
            ))}</>
          )}

          {!loading && error && <div className="alertbar" data-testid="search-error"><p>{error}</p></div>}

          {!loading && data && data.empty && (
            <div className="card" data-testid="empty-results" style={{ textAlign: 'center', padding: '36px 24px' }}>
              <h3 className="display" style={{ fontSize: 19, marginBottom: 8 }}>{t('res.noFlights', { date: fmtDate(search.depart_date) })}</h3>
              <p style={{ color: 'var(--ink-2)', marginBottom: 16 }}>{t('res.noFlightsSub')}</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {data.alternatives.map((a) => (
                  <button key={a.date} className="chip" data-testid={`alternative-date-${a.offset}`} onClick={() => setDepart(a.date)}>
                    {fmtDate(a.date)} · {money(a.price as number)}
                  </button>
                ))}
                {data.alternatives.length === 0 && <p style={{ color: 'var(--ink-3)' }}>{t('res.noAlt')}</p>}
              </div>
            </div>
          )}

          {!loading && data && !data.empty && (
            <>
              <div className="sortbar" role="group" aria-label="Sort results">
                <button className="chip" data-testid="sort-best" aria-pressed={sort === 'best'} onClick={() => setSort('best')}>{t('res.best')}</button>
                <button className="chip" data-testid="sort-cheapest" aria-pressed={sort === 'cheapest'} onClick={() => setSort('cheapest')}>{t('res.cheapest')}{cheapest != null ? ` · ${money(cheapest)}` : ''}</button>
                <button className="chip" data-testid="sort-fastest" aria-pressed={sort === 'fastest'} onClick={() => setSort('fastest')}>{t('res.fastest')}{fastest != null ? ` · ${fmtDur(fastest)}` : ''}</button>
                <span className="count" data-testid="results-count">{filtered.length} {filtered.length !== 1 ? t('res.results') : t('res.result')}</span>
              </div>

              {filtered.map((j, idx) => (
                <FlightCard key={j.id} journey={j} search={search} featured={idx === 0 && sort === 'best' && j.savings > 0} badge={badgeFor(j)} onSelect={onSelect} />
              ))}
              {filtered.length === 0 && (
                <div className="alertbar" data-testid="no-filter-matches"><p>{t('res.noFilter')}</p></div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
