// Home page sections below "Meet the Family", rebuilt from the live store's home page
// in the new sky / lavender / gold theme.
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BookOpen, Cross, Users, HandHeart, Sparkles, Target, Check, Package, Star,
  BedDouble, Gem, Gift, User, Mail, Quote,
} from "lucide-react";
import { family } from "../data/angels.js";
import { subscribe } from "../api.js";
import { Crown, Dragonfly, GoldStar, Sparkle, Trail, GoldDivider, HeartGem } from "./Decor.jsx";

const img = (f) => `/img/${f}`;

function Eyebrow({ children }) {
  return <div className="dj-eyebrow"><Crown size={16} /> {children} <Crown size={16} /></div>;
}

/* ---------- Why families love ---------- */
const reasons = [
  { icon: Cross, tone: "pink", title: "Faith-Based", text: "Built on Biblical principles, every angel teaches truth that lasts." },
  { icon: BookOpen, tone: "purple", title: "Scripture Inspired", text: "Each angel is connected to God’s Word and a personal verse." },
  { icon: Users, tone: "blue", title: "Positive Representation", text: "Children deserve to see themselves reflected in their toys." },
  { icon: HandHeart, tone: "yellow", title: "Encourages Prayer", text: "Creates meaningful, age-appropriate faith conversations at home." },
  { icon: Sparkles, tone: "red", title: "Builds Confidence", text: "A daily reminder of who they are in Christ — chosen, loved, royal." },
  { icon: Target, tone: "green", title: "Created with Purpose", text: "Every angel has a unique mission to plant in a child’s heart." },
];

export function WhyFamilies() {
  return (
    <section className="dj-why">
      <GoldStar size={16} className="dj-abs dj-hide-md" style={{ left: "8%", top: "70px" }} />
      <Dragonfly size={60} className="dj-abs dj-float dj-hide-md" style={{ right: "7%", top: "40px" }} flip />
      <div className="dj-container">
        <div className="dj-center">
          <Eyebrow>Why Families Love DanJe’ Angels</Eyebrow>
          <h2 className="dj-h2 dj-h2--xl">More than <em>playtime</em>.</h2>
        </div>
        <div className="dj-why__grid">
          {reasons.map(({ icon: Icon, tone, title, text }) => (
            <article key={title} className={`dj-why__card dj-tone--${tone}`}>
              <span className="dj-why__icon"><Icon size={22} strokeWidth={1.8} /></span>
              <h3 className="dj-h3">{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Founder ---------- */
export function Founder() {
  return (
    <section className="dj-founder">
      <div className="dj-container dj-founder__grid">
        <div className="dj-founder__media">
          <div className="dj-founder__arch">
            <img src={img("founders-hero-cut.webp")} alt="Founder Aanje Wilkerson with Dominique “Nique-Nique” and the DanJe’ Angels" loading="lazy" />
          </div>
          <div className="dj-founder__badge">
            <Crown size={20} />
            <span>Vision born</span>
            <strong>1994</strong>
          </div>
          <Dragonfly size={58} className="dj-abs dj-float dj-hide-md" style={{ right: "-18px", top: "14%" }} flip />
        </div>
        <div className="dj-founder__text">
          <span className="dj-pill"><Crown size={14} /> Our Founder</span>
          <h2 className="dj-h2 dj-h2--xl">A vision born in <em>1994</em>.</h2>
          <GoldDivider width={160} />
          <p className="dj-founder__quote">
            “In 1994, God placed a vision in my heart to create faith-filled dolls that would remind children they are loved,
            protected, strong, and created with purpose. Today that vision lives through DanJe’ Angels.”
          </p>
          <div className="dj-founder__sig">
            <strong>Aanje Wilkerson</strong>
            <span>Founder, DanJe’ Angels</span>
          </div>
          <Link to="/about" className="dj-btn dj-btn--purple">Read our story <ArrowRight size={16} /></Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Lifestyle gallery ---------- */
const moments = [
  { cls: "a", src: img("lifestyle/bedtime-story.jpg"), caption: "Bible stories at bedtime", alt: "Two girls reading a storybook on a pink bed with their DanJe’ Angels and DanJe’ Angels bedding" },
  { cls: "b", src: img("lifestyle/girl-with-janai.jpg"), caption: "Quiet comfort", alt: "A girl in fairy wings hugging her Janai angel" },
  { cls: "c", src: img("products/art-linaii.jpg"), caption: "Sunday-morning grace", alt: "Linaii wall print with Matthew 17:20", contain: true },
  { cls: "d", src: img("lifestyle/sisters-with-angels-cut.webp"), caption: "Sisters & their angels", alt: "Two sisters smiling with their DanJe’ Angels", cut: true },
  { cls: "e", src: img("lifestyle/angel-family-group-cut.webp"), caption: "The whole angel family", alt: "Janai, Linaii, Nique-Nique and a Linaii vinyl doll together", cut: true },
];

export function Moments() {
  return (
    <section className="dj-moments">
      <div className="dj-container">
        <div className="dj-center">
          <Eyebrow>In the Wild</Eyebrow>
          <h2 className="dj-h2 dj-h2--xl">Faith in <em>everyday</em> moments.</h2>
          <p className="dj-section-lead">Praying, reading, gifting, sleeping — the DanJe’ Angels live in the gentle rhythms of family life.</p>
        </div>
        <div className="dj-moments__grid">
          {moments.map((m) => (
            <figure key={m.cls} className={`dj-moment dj-moment--${m.cls} ${m.cut ? "is-cut" : ""} ${m.contain ? "is-contain" : ""}`}>
              <img src={m.src} alt={m.alt} loading="lazy" />
              <figcaption>{m.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Shop the collection ---------- */
const collections = [
  { title: "Angel Dolls", text: "The original five soft-plush angels.", to: "/shop?type=angels", src: img("lifestyle/angel-family-group-cut.webp"), tone: "purple", cut: true },
  { title: "Vinyl Angels", text: "Hand-painted, poseable heirlooms.", to: "/shop?type=vinyl-dolls", src: img("products/vinyl-linaii-cut.webp"), tone: "yellow", cut: true },
  { title: "Wall Art", text: "Framed prints for every little room.", to: "/shop?type=wall-art", src: img("products/art-janai.jpg"), tone: "pink", contain: true },
  { title: "Bedding", text: "Soft sheets & blankets.", soon: true, icon: BedDouble, tone: "blue", src: img("lifestyle/bedtime-story.jpg"), pos: "center 78%" },
  { title: "Accessories", text: "Capes, scripture cards & keepsakes.", soon: true, icon: Gem, tone: "green" },
  { title: "Subscription Boxes", text: "A monthly faith box.", soon: true, icon: Gift, tone: "red" },
];

export function Collections() {
  return (
    <section className="dj-collections">
      <div className="dj-container">
        <div className="dj-collections__head">
          <div>
            <div className="dj-eyebrow dj-eyebrow--left"><Crown size={16} /> Browse All</div>
            <h2 className="dj-h2 dj-h2--xl">Shop the <em>collection</em>.</h2>
          </div>
          <Link to="/shop" className="dj-textlink">View all <ArrowRight size={15} /></Link>
        </div>
        <div className="dj-collections__grid">
          {collections.map((c) => {
            const Icon = c.icon;
            const body = (
              <>
                <div className={`dj-coll__media dj-tone--${c.tone} ${c.cut ? "is-cut" : ""} ${c.contain ? "is-contain" : ""}`}>
                  {c.src ? (
                    <img src={c.src} alt={c.title} loading="lazy" style={c.pos ? { objectPosition: c.pos } : undefined} />
                  ) : (
                    <span className="dj-coll__icon"><Icon size={56} strokeWidth={1.3} /></span>
                  )}
                  {c.soon && <span className="dj-coll__soon"><Crown size={13} /> Coming soon</span>}
                </div>
                <div className="dj-coll__body">
                  <div>
                    <h3 className="dj-h3">{c.title}</h3>
                    <p>{c.text}</p>
                  </div>
                  {!c.soon && <span className="dj-coll__go">Shop <ArrowRight size={14} /></span>}
                </div>
              </>
            );
            return c.soon ? (
              <article key={c.title} className="dj-coll is-soon">{body}</article>
            ) : (
              <Link key={c.title} to={c.to} className="dj-coll">{body}</Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Kingdom Ambassador bundle ---------- */
export function KingdomBundle() {
  return (
    <section className="dj-kingdom">
      <div className="dj-kingdom__sky" aria-hidden="true">
        {[...Array(24)].map((_, i) => (
          <Sparkle key={i} size={6 + ((i * 7) % 9)} className="dj-twinkle" style={{ position: "absolute", left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${(i % 6) * 0.5}s`, opacity: 0.7 }} />
        ))}
      </div>
      <div className="dj-container">
        <div className="dj-kingdom__head">
          <div>
            <span className="dj-pill dj-pill--dark"><Crown size={14} /> Featured Bundle</span>
            <h2 className="dj-kingdom__title">The <em>Kingdom Ambassador</em> Collection.</h2>
          </div>
          <div className="dj-kingdom__text">
            <p>
              All five DanJe’ Angels — DanJe’, Janai, Nique-Nique, Linaii, and Linc-Linc — together in one collector-grade box.
              Protection. Healing. Encouragement. Faith. Dominion. Every gift a child of God can carry.
            </p>
            <ul>
              <li><Check size={16} /> All 5 angel dolls included</li>
              <li><Package size={16} /> Premium collector packaging</li>
              <li><BookOpen size={16} /> Scripture cards for every angel</li>
            </ul>
            <Link to="/shop?type=angels" className="dj-btn dj-btn--gold">Shop the Complete Collection <ArrowRight size={16} /></Link>
          </div>
        </div>
      </div>
      <div className="dj-kingdom__angels">
        {family.map((a, i) => (
          <Link key={a.slug} to={`/product/${a.slug}`} className={`dj-kcard dj-tone--${a.tone}`} style={{ "--i": i }}>
            <span className="dj-kcard__arch" aria-hidden="true" />
            {i === 0 && <Crown size={34} className="dj-kcard__crown" />}
            <div className={`dj-kcard__img ${a.cutout ? "is-cut" : ""}`}><img src={a.image} alt={a.name} loading="lazy" /></div>
            <div className="dj-kcard__label">
              <strong>{a.name}</strong>
              <span>{a.virtue}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */
// These four quotes are copied from the current live site. They look like placeholder reviews
// (stock avatars, no order data), so they are shown here clearly marked as samples.
export const reviews = [
  { name: "Tasha M.", who: "Mom of two · Atlanta, GA", tone: "pink", product: "DanJe’ — Protector (Pink)",
    quote: "My 5-year-old won’t sleep without DanJe’. She calls her ‘my angel’ and whispers Psalm 91 to her every night. The quality is unreal — the stitching, the purple hair, the wings. Worth every penny." },
  { name: "Jasmine & Rae", who: "Grandma + granddaughter · Houston, TX", tone: "yellow", product: "Linaii — Faith (Yellow)",
    quote: "I bought Linaii for my granddaughter’s birthday. When she unwrapped her, she literally gasped. We’ve memorized the Matthew 17:20 verse together. It’s become our Sunday-morning tradition." },
  { name: "Kiara D.", who: "Auntie & teacher · Newark, NJ", tone: "purple", product: "Janai — Healing (Purple)",
    quote: "My niece was going through a tough hospital week and Janai went with her to every appointment. Nurses kept asking about ‘the angel’. It’s more than a doll — it’s a tiny piece of comfort you can hold." },
  { name: "Nia J.", who: "First-time mom · Detroit, MI", tone: "blue", product: "Nique-Nique — Encourager (Blue)",
    quote: "We say Nique-Nique’s affirmation before school: ‘I can do all things through Christ.’ My shy little girl is walking taller already. These dolls are doing real, gentle kingdom work." },
];

export function Testimonials() {
  return (
    <section className="dj-reviews">
      <Dragonfly size={56} className="dj-abs dj-float dj-hide-md" style={{ left: "6%", top: "40px" }} />
      <div className="dj-container">
        <div className="dj-center">
          <Eyebrow>Loved by Little Hearts</Eyebrow>
          <h2 className="dj-h2 dj-h2--xl">What <em>families</em> are saying.</h2>
          <p className="dj-sample-note">Sample reviews from the current site — replace with real customer reviews before launch.</p>
        </div>
        <div className="dj-reviews__grid">
          {reviews.map((r) => (
            <figure key={r.name} className={`dj-review dj-tone--${r.tone}`}>
              <Quote size={34} className="dj-review__mark" />
              <div className="dj-review__stars" aria-label="5 out of 5 stars">
                {[...Array(5)].map((_, i) => <Star key={i} size={15} fill="#f5b82e" stroke="#f5b82e" />)}
              </div>
              <blockquote>“{r.quote}”</blockquote>
              <figcaption>
                <span className="dj-review__avatar">{r.name.split(/[ &]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("")}</span>
                <span><strong>{r.name}</strong><small>{r.who}</small></span>
              </figcaption>
              <span className="dj-review__product"><HeartGem size={11} /> {r.product}</span>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Newsletter ---------- */
export function Newsletter() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Please enter a valid email address."); return; }
    setError(""); setBusy(true);
    try {
      const res = await subscribe(email.trim(), name.trim() || undefined);
      setPreview(Boolean(res?.preview)); setDone(true);
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <section className="dj-news">
      <GoldStar size={18} className="dj-abs dj-hide-md" style={{ left: "6%", top: "28%" }} />
      <GoldStar size={12} className="dj-abs dj-hide-md" style={{ right: "4%", bottom: "22%" }} />
      <div className="dj-container dj-news__grid">
        <div>
          <div className="dj-eyebrow dj-eyebrow--left"><Crown size={16} /> Join the DanJe’ Angels Family</div>
          <h2 className="dj-h2 dj-h2--xl">Scripture cards, coloring pages &amp; <em>faith-filled</em> encouragement.</h2>
          <p className="dj-section-lead dj-section-lead--left">
            Receive scripture cards, coloring pages, exclusive offers, new product announcements, and faith-filled encouragement.
          </p>
        </div>
        {done ? (
          <div className="dj-news__done" role="status">
            <HeartGem size={22} />
            <strong>Thank you{name ? `, ${name.split(" ")[0]}` : ""}!</strong>
            <span>{preview ? "This design preview doesn’t save sign-ups. On the live site this adds you to the mailing list." : "You’re on the list. Watch your inbox for scripture cards and encouragement."}</span>
          </div>
        ) : (
          <form className="dj-news__form" onSubmit={submit} noValidate>
            <label className="dj-field">
              <User size={17} />
              <input id="news-name" type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            <label className="dj-field">
              <Mail size={17} />
              <input id="news-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
            {error && <p className="dj-news__error">{error}</p>}
            <button type="submit" className="dj-btn dj-btn--purple" disabled={busy}>{busy ? "Joining…" : <>Join Now <ArrowRight size={16} /></>}</button>
          </form>
        )}
      </div>
    </section>
  );
}

/* ---------- Mission ---------- */
export function Mission() {
  return (
    <section className="dj-mission-band">
      <Dragonfly size={70} className="dj-abs dj-float dj-hide-md" style={{ left: "18%", top: "26%" }} />
      <Dragonfly size={64} className="dj-abs dj-float dj-hide-md" style={{ right: "17%", top: "52%" }} flip />
      <Trail className="dj-abs dj-hide-md" style={{ left: "21%", top: "40%" }} w={140} h={70} d="M4 4 C 40 60, 90 10, 136 60" />
      <div className="dj-container dj-center dj-mission-band__inner">
        <span className="dj-pill"><Crown size={14} /> Our Mission</span>
        <h2 className="dj-h1">Bringing <em>Heaven</em> to Earth.</h2>
        <p>To bring Heaven to Earth through faith-filled products that help children discover who they are in Christ.</p>
        <blockquote>“With God all things are possible.” <cite>Matthew 19:26</cite></blockquote>
      </div>
    </section>
  );
}

/* ---------- Our story letter ---------- */
export function StoryLetter() {
  return (
    <section className="dj-letter">
      <Trail className="dj-abs dj-hide-md" style={{ left: 0, top: "38%" }} w={260} h={80} d="M0 60 C 80 10, 160 80, 258 20" />
      <Trail className="dj-abs dj-hide-md" style={{ right: 0, top: "58%" }} w={260} h={80} d="M2 20 C 90 80, 170 10, 258 60" />
      <GoldStar size={14} className="dj-abs dj-hide-md" style={{ left: "10%", top: "18%" }} />
      <Dragonfly size={52} className="dj-abs dj-float dj-hide-md" style={{ right: "9%", top: "14%" }} flip />
      <div className="dj-container">
        <div className="dj-center">
          <span className="dj-pill"><Crown size={14} /> Our Story</span>
          <h2 className="dj-h2 dj-h2--xl" style={{ marginTop: 14 }}>A mother’s prayer, <em>stitched</em> into every angel.</h2>
        </div>
        <article className="dj-letter__card">
          <p>DanJe’ Angels was created from a vision placed in my heart to remind children everywhere that they are special, loved, and created with purpose.</p>
          <p>As a mother and a woman of faith, I wanted to create something that would inspire children to see themselves the way God sees them — fearfully and wonderfully made. Every child deserves to know they are valued, protected, and capable of amazing things.</p>
          <p>The DanJe’ Angels were designed to bring messages of protection, encouragement, faith, and healing to children through stories, imagination, and scripture. My prayer is that every child who encounters the DanJe’ Angels will grow in confidence, kindness, and faith.</p>
          <p>It is my hope that these angels will remind children that no matter what challenges they face, they are never alone. God is always with them, guiding them and surrounding them with His love.</p>
          <p>Thank you for being a part of the DanJe’ Angels journey.</p>
          <footer className="dj-letter__sign">
            <div className="dj-letter__who">
              <img src={img("founders-circle.jpg")} alt="" loading="lazy" />
              <span><strong>Aanje Wilkerson</strong><small>Founder · DanJe’ Angels</small></span>
            </div>
            <span className="dj-letter__verse"><HeartGem size={13} /> “Fearfully and wonderfully made.” <small>Psalm 139:14</small></span>
          </footer>
        </article>
      </div>
    </section>
  );
}

/* ---------- Affirmation ribbon ---------- */
const affirmations = [
  ["You are loved", "1 John 4:19"], ["You are protected", "Psalm 91:11"], ["You are royalty", "1 Peter 2:9"],
  ["You are brave", "Joshua 1:9"], ["You are chosen", "Ephesians 1:4"], ["You are fearfully & wonderfully made", "Psalm 139:14"],
];

export function AffirmationRibbon() {
  const row = affirmations.map(([a, v]) => (
    <span key={a} className="dj-ribbon__item"><Crown size={16} /> <em>{a}</em> <small>{v}</small></span>
  ));
  return (
    <div className="dj-ribbon" aria-label="Affirmations: You are loved, protected, royalty, brave, chosen, fearfully and wonderfully made">
      <div className="dj-ribbon__track" aria-hidden="true">{row}{row}</div>
    </div>
  );
}
