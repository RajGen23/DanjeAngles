// Faith & Purpose, Angels for Every Child, Reviews, and the 404 page.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Quote, BookOpen, Users, HandHeart, Sparkles } from "lucide-react";
import PageHead from "../components/PageHead.jsx";
import AngelCard from "../components/AngelCard.jsx";
import { family, products } from "../data/angels.js";
import { reviews as sampleReviews } from "../components/HomeSections.jsx";
import { getReviews, API_ENABLED } from "../api.js";
import { HeartGem, GoldDivider } from "../components/Decor.jsx";

const plush = (slug) => products.find((p) => p.slug === slug);

export function Faith() {
  return (
    <section className="dj-shop dj-sky dj-info">
      <div className="dj-container">
        <PageHead title="Faith & Purpose">Every angel carries a promise from God’s Word,<br />so children grow up knowing who they are in Christ.</PageHead>
        <div className="dj-card dj-info__intro">
          <h2 className="dj-h2">Our mission</h2>
          <GoldDivider width={150} />
          <p>To bring Heaven to Earth through faith-filled products that help children discover who they are in Christ — loved, protected, strong, and royalty in God’s Kingdom.</p>
          <blockquote>“With God all things are possible.” <cite>Matthew 19:26</cite></blockquote>
        </div>
        <h2 className="dj-h2 dj-center dj-info__h">Five angels, five promises</h2>
        <div className="dj-verses">
          {family.map((a) => {
            const p = plush(a.slug);
            const [ref, ...rest] = p.scripture.split(" — ").reverse();
            return (
              <article key={a.slug} className={`dj-verse dj-tone--${a.tone}`}>
                <img src={a.art} alt={`${a.name}, the ${a.virtue} angel`} loading="lazy" />
                <div>
                  <span className="dj-verse__virtue">{a.virtue}</span>
                  <h3 className="dj-h3">{a.name}</h3>
                  <blockquote>{rest.reverse().join(" — ")} <cite>{ref}</cite></blockquote>
                  <p>{p.description}</p>
                  <Link to={`/product/${a.slug}`} className="dj-textlink">Meet {a.name} <ArrowRight size={14} /></Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const reasons = [
  { icon: Users, title: "Positive Representation", text: "Children deserve to see themselves reflected in their toys. Our angels have beautiful brown skin and purple royalty hair." },
  { icon: BookOpen, title: "Scripture Inspired", text: "Each angel is connected to God’s Word and a personal verse a child can learn by heart." },
  { icon: HandHeart, title: "Encourages Prayer", text: "Creates meaningful, age-appropriate faith conversations at home, at church and at bedtime." },
  { icon: Sparkles, title: "Builds Confidence", text: "A daily reminder of who they are in Christ — chosen, loved, royal." },
];

export function EveryChild() {
  return (
    <section className="dj-shop dj-sky dj-info">
      <div className="dj-container">
        <PageHead title="Angels for Every Child">Faith-filled companions for every little heart —<br />for bedtime, sick days, first days and every day.</PageHead>
        <div className="dj-info__reasons">
          {reasons.map(({ icon: Icon, title, text }) => (
            <article key={title} className="dj-card dj-info__reason">
              <span className="dj-why__icon dj-tone--purple"><Icon size={22} strokeWidth={1.8} /></span>
              <h3 className="dj-h3">{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className="dj-info__photo dj-card">
          <img src="/img/lifestyle/bedtime-story.jpg" alt="Two girls reading a storybook on a pink bed with their DanJe’ Angels" loading="lazy" />
          <div>
            <h2 className="dj-h2">Every child is <em>royalty</em> in God’s Kingdom.</h2>
            <p>Plush angels to hug, poseable vinyl keepsakes to treasure, and wall art that keeps God’s promises in view — there’s an angel for every age and every room.</p>
            <Link to="/shop" className="dj-btn dj-btn--purple">Find their angel <ArrowRight size={16} /></Link>
          </div>
        </div>
        <h2 className="dj-h2 dj-center dj-info__h">Choose by what your child needs</h2>
        <div className="dj-angels">
          {family.map((a, i) => <AngelCard key={a.slug} angel={a} crown={i === 0} meet />)}
        </div>
      </div>
    </section>
  );
}

export function Reviews() {
  const [store, setStore] = useState([]);
  useEffect(() => {
    if (!API_ENABLED) return;
    Promise.all(products.map((p) => getReviews(p.slug).then((r) => (Array.isArray(r) ? r.map((x) => ({ ...x, product: p })) : [])).catch(() => [])))
      .then((all) => setStore(all.flat().filter((r) => r.approved !== false)));
  }, []);

  return (
    <section className="dj-shop dj-sky dj-info">
      <div className="dj-container">
        <PageHead title="Reviews">What families are saying about their angels.</PageHead>
        {store.length > 0 && (
          <div className="dj-reviews__grid">
            {store.map((r) => (
              <figure key={r.id} className="dj-review dj-tone--purple">
                <Quote size={34} className="dj-review__mark" />
                <div className="dj-review__stars">{[...Array(5)].map((_, i) => <Star key={i} size={15} fill={i < r.rating ? "#f5b82e" : "none"} stroke="#f5b82e" />)}</div>
                <blockquote>“{r.comment}”</blockquote>
                <figcaption><span className="dj-review__avatar">{r.name.slice(0, 1)}</span><span><strong>{r.name}</strong></span></figcaption>
                <Link to={`/product/${r.product.slug}`} className="dj-review__product"><HeartGem size={11} /> {r.product.name}</Link>
              </figure>
            ))}
          </div>
        )}
        <p className="dj-sample-note dj-center">Sample reviews from the current site — replace with real customer reviews before launch.</p>
        <div className="dj-reviews__grid">
          {sampleReviews.map((r) => (
            <figure key={r.name} className={`dj-review dj-tone--${r.tone}`}>
              <Quote size={34} className="dj-review__mark" />
              <div className="dj-review__stars">{[...Array(5)].map((_, i) => <Star key={i} size={15} fill="#f5b82e" stroke="#f5b82e" />)}</div>
              <blockquote>“{r.quote}”</blockquote>
              <figcaption><span className="dj-review__avatar">{r.name.slice(0, 1)}</span><span><strong>{r.name}</strong><small>{r.who}</small></span></figcaption>
              <span className="dj-review__product"><HeartGem size={11} /> {r.product}</span>
            </figure>
          ))}
        </div>
        <p className="dj-center dj-info__cta">Own a DanJe’ Angel? Open its product page to <strong>write a review</strong>.</p>
      </div>
    </section>
  );
}

export function NotFound() {
  return (
    <section className="dj-shop dj-sky dj-info">
      <div className="dj-container">
        <PageHead title="Page not found">This page may have flown away. Let’s get you back to the angels.</PageHead>
        <div className="dj-center dj-btnrow" style={{ justifyContent: "center" }}>
          <Link to="/" className="dj-btn dj-btn--purple">Go home</Link>
          <Link to="/shop" className="dj-btn dj-btn--outline-gold">Shop the Angels</Link>
        </div>
      </div>
    </section>
  );
}
