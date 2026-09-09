import { useState } from 'react';
import { Journey, Itinerary, SearchParams } from '@/types';
import { Ribbon } from '@/components/Ribbon';
import { fmtDur, fmtDate } from '@/api';
import { usePrefs } from '@/i18n';

const LegRow = ({ itin, label }: { itin: Itinerary; label: string }) => {
  const { t } = usePrefs();
  return (
  <div className="leg">
    <div>
      <div className="leg-time">{itin.dep_time}</div>
      <div className="leg-code">{itin.legs[0].from}</div>
    </div>
    <div className="leg-mid">
      <div className="leg-topline">
        <span>{label} · {fmtDate(itin.dep_date)}</span>
        <span className="leg-dur">{fmtDur(itin.duration_min)} · {itin.stops === 0 ? t('card.direct') : t('card.stop')}</span>
      </div>
      <Ribbon itin={itin} />
    </div>
    <div style={{ textAlign: 'right' }}>
      <div className="leg-time">{itin.arr_time}{itin.arr_day_offset > 0 && <sup>+{itin.arr_day_offset}</sup>}</div>
      <div className="leg-code">{itin.legs[itin.legs.length - 1].to}</div>
    </div>
  </div>
  );
};

export const FlightCard = ({ journey, search, featured, badge, onSelect }:
  { journey: Journey; search: SearchParams; featured: boolean; badge?: string; onSelect: (j: Journey) => void }) => {
  const [open, setOpen] = useState(false);
  const { t, money } = usePrefs();
  const j = journey;
  const paxCount = search.adults + search.children;
  const transfers = [j.outbound, j.inbound].filter((i): i is Itinerary => !!i && i.self_transfer);

  return (
    <article className={`fcard ${featured ? 'featured' : ''}`} data-testid={`flight-card-${j.id}`}>
      {j.self_transfer && (
        <div className="fcard-flag">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M2 12c4 0 4-8 8-8h4M10 1.5L13.5 4 10 6.5" />
          </svg>
          {t('card.flag')}
        </div>
      )}
      <div className="fcard-main">
        <LegRow itin={j.outbound} label={t('card.outbound')} />
        {j.inbound && <LegRow itin={j.inbound} label={t('card.return')} />}

        {transfers.length > 0 ? (
          <div className="transfer-note" data-testid="self-transfer-warning">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ flex: '0 0 auto', marginTop: 1 }} aria-hidden="true">
              <path d="M8 1.8l6.2 11.4H1.8L8 1.8zM8 6.3v3.1M8 11.4v.1" />
            </svg>
            <span>
              <strong>{t('card.st', { cities: Array.from(new Set(transfers.map((tr) => tr.connection?.city))).join(' & ') })}</strong>{' '}
              {t('card.stBody')}
              {j.inbound && j.separate_tickets && ` ${t('card.stReturn')}`}
            </span>
          </div>
        ) : (
          <div className="carriers">
            {badge && <span className="chip chip-blue">{badge}</span>}
            <span className="chip chip-flat">{j.carriers.length === 1 ? t('card.same') : t('card.singleLegs')}</span>
            {j.outbound.bags.checked && <span className="chip chip-flat">{t('card.checkedInc')}</span>}
            {j.inbound && j.separate_tickets && <span className="chip chip-warn">{t('card.sepEach')}</span>}
          </div>
        )}
        {transfers.length > 0 && badge && <div className="carriers"><span className="chip chip-blue">{badge}</span></div>}

        <button className="toggle-more" aria-expanded={open} onClick={() => setOpen(!open)} data-testid={`toggle-details-${j.id}`}>
          {t('card.details')}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" /></svg>
        </button>
      </div>

      <div className="fcard-side">
        <div className="price" data-testid={`price-${j.id}`}>{money(j.price_total)}</div>
        <div className="price-sub">{t('card.total')} · {paxCount} {paxCount > 1 ? t('res.travellers') : t('res.traveller')}{search.infants ? ` + ${search.infants} ${search.infants > 1 ? t('pax.infants') : t('pax.infant')}` : ''}</div>
        {j.savings > 0 && <div className="saving" data-testid={`savings-${j.id}`}>{t('card.less', { p: money(j.savings) })}</div>}
        <button className={`btn btn-sm ${featured ? 'btn-primary' : 'btn-ghost'}`} data-testid={`select-button-${j.id}`} onClick={() => onSelect(j)}>{t('card.select')}</button>
      </div>

      <div className={`fcard-more ${open ? 'open' : ''}`}>
        <dl className="detail-grid">
          <div><dt>Cabin bag</dt><dd>{j.outbound.bags.cabin ? 'Included on all legs' : 'Not included on all legs'}</dd></div>
          <div><dt>Checked bag</dt><dd>{j.outbound.bags.checked ? 'Included on all legs' : 'Not included on all legs'}</dd></div>
          <div><dt>Tickets</dt><dd>{j.separate_tickets ? `${new Set(j.carriers).size} separate tickets` : 'One ticket'}</dd></div>
          <div><dt>Total flight time</dt><dd>{fmtDur(j.duration_total)}</dd></div>
          {[...j.outbound.legs, ...(j.inbound?.legs || [])].map((l, i) => (
            <div key={i}><dt>{l.airline_name} {l.flight_no}</dt><dd>{l.from} → {l.to} · {money(l.price)} · {l.bags_policy}</dd></div>
          ))}
        </dl>
      </div>
    </article>
  );
};
