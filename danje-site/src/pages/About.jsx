import { Link } from "react-router-dom";
import { ArrowRight, Heart, Star, Crown as CrownIcon, Sparkles } from "lucide-react";
import { family, featured } from "../data/angels.js";
import { Crown, Dragonfly, GoldStar, GoldDivider, Trail, Sparkle } from "../components/Decor.jsx";
import AngelCard from "../components/AngelCard.jsx";

const journey = [
  { year: "1994", text: "God gives\nthe vision.", tone: "pink", icon: <Heart size={20} strokeWidth={2} /> },
  { year: "2008", text: "The dream begins\ntaking shape.", tone: "purple", icon: <Star size={20} strokeWidth={2} /> },
  { year: "2023", text: "The dolls begin\ncoming to life.", tone: "blue", icon: <CrownIcon size={20} strokeWidth={2} /> },
  { year: "Today", text: "DanJe’ Angels is\nbringing Heaven\nto Earth.", tone: "gold", icon: <Sparkles size={20} strokeWidth={2} /> },
];

export default function About() {
  return (
    <>
      {/* HERO */}
      <section className="dj-about-hero dj-sky">
        <Dragonfly size={56} className="dj-abs dj-float" style={{ left: "29%", top: "17%" }} />
        <Dragonfly size={50} className="dj-abs dj-float dj-hide-md" style={{ left: "39%", top: "56%" }} flip />
        <Dragonfly size={52} className="dj-abs dj-float dj-hide-md" style={{ right: "12%", top: "23%" }} flip />
        <Trail className="dj-abs dj-hide-md" style={{ left: "31%", top: "28%" }} w={150} h={60} d="M4 6 C 40 50, 90 0, 146 40" />
        <GoldStar size={12} className="dj-abs" style={{ left: "42%", top: "15%" }} />
        <Sparkle size={12} className="dj-abs dj-twinkle" style={{ left: "9%", top: "26%" }} />
        <div className="dj-container dj-about-hero__grid">
          <div className="dj-about-hero__copy">
            <h1 className="dj-h1 dj-h1--about">More Than Dolls.<br />A Legacy of <span className="dj-pink">Faith.</span></h1>
            <p>Bringing Heaven to Earth through faith-filled dolls, stories, and products that help children discover who they are in Christ.</p>
            <div className="dj-btnrow">
              <Link to="/#family" className="dj-btn dj-btn--magenta">Meet the Angels <ArrowRight size={15} /></Link>
              <Link to="/shop" className="dj-btn dj-btn--outline-pink">Shop the Collection</Link>
            </div>
          </div>
          <div className="dj-about-hero__photo">
            <img src="/img/founders-hero-cut.webp" alt="Founder Aanje Wilkerson and Dominique “Nique-Nique” seated on a pink and gold throne holding DanJe Angels dolls" />
          </div>
        </div>
      </section>

      <div className="dj-about-body">
        <div className="dj-container dj-about-stack">
          {/* OUR STORY */}
          <section className="dj-card dj-story">
            <div className="dj-story__photo"><img src="/img/founders-story.jpg" alt="The founders with the DanJe Angels dolls" loading="lazy" /></div>
            <div className="dj-story__text">
              <Crown size={22} />
              <h2 className="dj-h2">Our Story</h2>
              <GoldDivider width={150} />
              <p>In 1994, God placed a dream in Aanje Wilkerson’s heart to create something that would help children grow in faith while seeing themselves as God’s precious creation.</p>
              <p className="dj-pink dj-strong">That dream became DanJe’ Angels.</p>
              <p>Inspired by family, faith, and a desire to remind children of God’s promises, DanJe’ Angels teaches protection, faith, healing, encouragement, and dominion through scripture-centered characters.</p>
            </div>
            <Dragonfly size={50} className="dj-abs dj-hide-md" style={{ right: "6%", top: "52%" }} flip />
            <GoldStar size={14} className="dj-abs dj-hide-md" style={{ right: "4%", top: "12%" }} />
          </section>

          {/* HEART BEHIND THE BRAND */}
          <section className="dj-heart">
            <div className="dj-heart__left">
              <h2 className="dj-h3">The Heart Behind the Brand</h2>
              <GoldDivider width={150} />
              <p><span className="dj-pink dj-strong">Aanje Wilkerson</span>, Founder<br />and<br /><span className="dj-pink dj-strong">Dominique “Nique-Nique”</span></p>
              <p className="dj-small">The inspiration behind the<br />DanJe’ Angels vision.</p>
            </div>
            <div className="dj-heart__photo"><img src="/img/founders-circle.jpg" alt="Aanje Wilkerson and Dominique “Nique-Nique”" loading="lazy" /></div>
            <blockquote className="dj-heart__quote">
              “Every child is royalty in God’s Kingdom.”
              <Crown size={70} className="dj-heart__watermark" />
            </blockquote>
            <Dragonfly size={46} className="dj-abs dj-hide-md" style={{ right: "2%", top: "6%" }} flip />
          </section>

          {/* OUR JOURNEY */}
          <section className="dj-journey">
            <h2 className="dj-h2 dj-center">Our Journey</h2>
            <div className="dj-journey__line" aria-hidden="true">
              <svg viewBox="0 0 1000 40" preserveAspectRatio="none"><path d="M0 22 C 120 4, 220 38, 330 20 S 560 4, 660 22 S 880 38, 1000 16" /></svg>
            </div>
            <ol className="dj-journey__list">
              {journey.map((j) => (
                <li key={j.year} className={`dj-step dj-step--${j.tone}`}>
                  <span className="dj-step__dot">{j.icon}</span>
                  <strong>{j.year}</strong>
                  <span>{j.text}</span>
                </li>
              ))}
            </ol>
            <GoldStar size={14} className="dj-abs dj-hide-md" style={{ left: "4%", top: "38%" }} />
            <GoldStar size={14} className="dj-abs dj-hide-md" style={{ right: "4%", top: "44%" }} />
          </section>

          {/* MEET THE ANGELS */}
          <section className="dj-meet">
            <h2 className="dj-h2 dj-center">Meet the Angels</h2>
            <Crown size={16} className="dj-meet__crown" />
            <div className="dj-angels dj-angels--tight">
              {family.map((a) => <AngelCard key={a.name} angel={a} crown={a.slug === "danje-protector-pink"} />)}
            </div>
            <Dragonfly size={44} className="dj-abs dj-hide-md" style={{ left: "1%", top: "40%" }} />
            <Dragonfly size={48} className="dj-abs dj-hide-md" style={{ right: "0%", top: "26%" }} flip />
          </section>

          {/* MISSION + FEATURED */}
          <div className="dj-mf">
            <section className="dj-mission">
              <Crown size={20} />
              <h2 className="dj-h2">Our Mission</h2>
              <p>To create faith-filled products that inspire children to walk confidently in God’s purpose, embrace their Kingdom identity, and grow in faith through play.</p>
              <Dragonfly size={40} className="dj-abs" style={{ left: "6%", top: "48%" }} />
            </section>
            <section className="dj-featured">
              <h2 className="dj-h3 dj-center">Featured Products</h2>
              <ul>
                {featured.map((f) => (
                  <li key={f.label}>
                    <Link to={f.to}>
                      <div className="dj-featured__img"><img src={f.image} alt={f.label} loading="lazy" /></div>
                      <span>{f.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Dragonfly size={40} className="dj-abs dj-hide-md" style={{ right: "1%", top: "2%" }} flip />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
