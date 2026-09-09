import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, fmtDate, fmtDur } from '@/api';
import { usePrefs } from '@/i18n';
import { SearchPanel } from '@/components/SearchPanel';

interface HighlightCard {
  origin: string; destination: string; origin_city: string; destination_city: string;
  date: string; price: number; saving: number;
  itinerary: { legs: { airline_name: string; duration_min: number }[]; connection: { city: string } | null };
}

export default function Home() {
  const [cards, setCards] = useState<HighlightCard[]>([]);
  const navigate = useNavigate();
  const { t, money } = usePrefs();

  useEffect(() => { api.get('/highlights').then((r) => setCards(r.data.cards || [])).catch(() => {}); }, []);

  const goTo = (c: HighlightCard) => {
    const q = new URLSearchParams({ o: c.origin, d: c.destination, dep: c.date, a: '1', c: '0', i: '0', comb: '1', dir: '0' });
    navigate(`/results?${q.toString()}`);
  };

  return (
    <section className="view-enter">
      <div className="hero">
        <div className="wrap hero-in">
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1 className="display">{t('home.h1a')}<em>{t('home.h1b')}</em></h1>
          <p>{t('home.sub')}</p>
        </div>
      </div>

      <div className="wrap">
        <SearchPanel />

        {cards.length > 0 && (
          <div className="routes-strip">
            <div className="strip-head">
              <h2 className="display" style={{ fontSize: 19 }}>{t('home.stripTitle')}</h2>
              <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{t('home.stripSub')}</p>
            </div>
            <div className="strip-grid">
              {cards.map((c, idx) => (
                <button className="rcard" key={idx} data-testid={`highlight-card-${idx}`} onClick={() => goTo(c)}>
                  <div className="rcard-top">
                    <span className="rcard-city">{c.origin_city} → {c.destination_city}</span>
                    <span className="chip chip-save">{t('home.save')} {money(c.saving)}</span>
                  </div>
                  <div className="ribbon">
                    <span className="rb-node"></span>
                    <span className="rb-seg" data-c="a" style={{ flex: c.itinerary.legs[0].duration_min }}></span>
                    <span className="rb-node stop"></span>
                    <span className="rb-seg" data-c="b" style={{ flex: c.itinerary.legs[1]?.duration_min || 60 }}></span>
                    <span className="rb-node end"></span>
                  </div>
                  <div className="ribbon-labels">
                    <span style={{ flex: c.itinerary.legs[0].duration_min }}>{c.itinerary.legs[0].airline_name} · {fmtDur(c.itinerary.legs[0].duration_min)}</span>
                    {c.itinerary.legs[1] && <span style={{ flex: c.itinerary.legs[1].duration_min }}>{c.itinerary.legs[1].airline_name} · {fmtDur(c.itinerary.legs[1].duration_min)}</span>}
                  </div>
                  <div className="rcard-meta">
                    <span>{fmtDate(c.date)}{c.itinerary.connection ? ` · ${t('home.stopIn', { city: c.itinerary.connection.city })}` : ''}</span>
                    <span className="rcard-price" style={{ marginLeft: 'auto' }}>{money(c.price)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="footnote">
          <div className="footnote-grid">
            <span><b style={{ color: 'var(--ink)' }}>Viara</b> — {t('home.footTag')}</span>
            <span>{t('common.langLine')}</span>
            <Link to="/terms" data-testid="footer-terms-link" style={{ textDecoration: 'underline' }}>{t('home.footTerms')}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
