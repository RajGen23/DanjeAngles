import { usePrefs } from '@/i18n';

export default function Terms() {
  const { t, lang } = usePrefs();
  return (
    <div className="wrap view-enter" style={{ maxWidth: 760, padding: '32px 24px 56px' }}>
      <p className="eyebrow">Terms — short version</p>
      {lang !== 'en' && <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6 }}>{t('terms.enOnly')}</p>}
      <h1 className="display" style={{ fontSize: 30, margin: '10px 0 18px' }}>How Viara works, and what we're not</h1>
      <div className="card">
        <ul style={{ display: 'grid', gap: 14, fontSize: 14 }}>
          <li><b>Viara is not a ticket seller.</b> We search seeded flight schedules and combine routes across airlines. When you click "Book with an airline", you leave Viara and buy directly from that carrier under its own conditions.</li>
          <li><b>Combined routes are separate tickets.</b> Each leg is an independent contract with its airline. If a first flight is delayed and you miss the second, the second airline owes you nothing. Plan the connection times we show — they already include minimum self-transfer buffers.</li>
          <li><b>Self-transfer means you do the work.</b> Collect your bags, check in again, and clear passport control between legs yourself.</li>
          <li><b>Prices are indicative.</b> Shown prices are "as of seed" data. The price on the airline's own website is the only authoritative price.</li>
          <li><b>My Trips is a notebook, not a booking record.</b> Saving a trip or marking it "booked" stores your own notes and airline references. Viara never sees your payment or ticket.</li>
        </ul>
      </div>
    </div>
  );
}
