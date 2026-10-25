import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import { heroAngels, family } from "../data/angels.js";
import { Crown, Dragonfly, GoldStar, Sparkle, Trail, HeartGem } from "../components/Decor.jsx";
import AngelCard from "../components/AngelCard.jsx";
import Shop from "./Shop.jsx";
import FairyDust from "../components/FairyDust.jsx";
import { WhyFamilies, Founder, Moments, Collections, KingdomBundle, Testimonials, Newsletter, Mission, StoryLetter, AffirmationRibbon } from "../components/HomeSections.jsx";

function FlowerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" aria-hidden="true">
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="10" cy="5" rx="3.6" ry="4.6" fill="#f39cc1" transform={`rotate(${r} 10 10)`} />
      ))}
      <circle cx="10" cy="10" r="2.6" fill="#f7c948" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <section className="dj-hero dj-sky">
        {/* floating decor */}
        <Dragonfly size={84} className="dj-abs dj-float" style={{ left: "37.5%", top: "13%" }} />
        <Trail className="dj-abs" style={{ left: "41.5%", top: "24%" }} w={90} h={150} d="M8 4 C 40 20, 70 30, 60 70 S 30 120, 70 146" />
        <Dragonfly size={78} className="dj-abs dj-float dj-hide-md" style={{ left: "48.5%", top: "41%" }} flip />
        <Dragonfly size={80} className="dj-abs dj-float" style={{ right: "1.5%", top: "38%" }} flip />
        <Trail className="dj-abs dj-hide-md" style={{ right: "4%", top: "52%" }} w={60} h={120} d="M40 4 C 10 30, 50 60, 20 116" />
        <GoldStar size={18} className="dj-abs" style={{ left: "12%", top: "18%" }} />
        <GoldStar size={14} className="dj-abs" style={{ left: "31%", top: "11%" }} />
        <GoldStar size={22} className="dj-abs dj-hide-md" style={{ right: "8.5%", top: "25%" }} />
        <GoldStar size={14} className="dj-abs dj-hide-md" style={{ right: "15%", top: "61%" }} />
        <Sparkle size={16} className="dj-abs dj-twinkle" style={{ right: "4%", top: "10%" }} />
        <Sparkle size={12} className="dj-abs dj-twinkle" style={{ left: "52%", top: "8%" }} />

        <div className="dj-container dj-hero__grid">
          <div className="dj-hero__copy">
            <span className="dj-pill"><FlowerIcon /> Bringing Heaven to Earth</span>
            <h1 className="dj-h1">
              More than a doll. <em>A&nbsp;reminder</em> of God’s love.
            </h1>
            <p className="dj-hero__lead">
              Faith-filled companions designed to help children discover who they are in Christ through
              protection, healing, encouragement, faith, and purpose.
            </p>
            <div className="dj-rating">
              <span className="dj-stars" aria-label="5 out of 5 stars">
                {[...Array(5)].map((_, i) => <Star key={i} size={15} fill="#f5b82e" stroke="#f5b82e" />)}
              </span>
              Loved by families, churches, and faith-filled gift-givers.
            </div>
            <div className="dj-btnrow">
              <Link to="/shop" className="dj-btn dj-btn--purple">Shop the Angels <ArrowRight size={16} /></Link>
              <a href="#family" className="dj-btn dj-btn--outline-gold">Meet the Angels</a>
            </div>
            <p className="dj-royal">
              Every child is <span className="dj-royal__word">royalty<Crown size={17} className="dj-royal__crown" /></span> in God’s Kingdom.
            </p>
          </div>

          <div className="dj-hero__showcase">
            <div className="dj-glass">
              <div className="dj-badge">
                <Crown size={26} />
                <span>Faith<br />Protection<br />Purpose</span>
              </div>
              <div className="dj-hero__cards">
                {heroAngels.map((a, i) => (
                  <Link key={a.name} to={`/product/${a.slug}`} className={`dj-hcard dj-hcard--${i}`}>
                    <img src={a.image} alt={`${a.name} — ${a.role}`} />
                    <span className="dj-hcard__cap">
                      <strong>{a.name}</strong>
                      <span>{a.role}</span>
                    </span>
                  </Link>
                ))}
              </div>
              <div className="dj-quote">
                <HeartGem size={15} className="dj-quote__heart" />
                <q>You are fearfully made.</q>
                <cite>Psalm 139:14</cite>
              </div>
            </div>
          </div>
        </div>
        <svg className="dj-wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 58 C 220 20, 420 10, 720 18 S 1220 50, 1440 30 L1440 90 L0 90 Z" />
        </svg>
      </section>

      <section className="dj-family" id="family">
        <FairyDust />
        <Dragonfly size={58} className="dj-abs dj-hide-md" style={{ left: "13%", top: "-12px" }} />
        <Dragonfly size={58} className="dj-abs dj-hide-md" style={{ right: "15%", top: "20px" }} flip />
        <GoldStar size={18} className="dj-abs dj-hide-md" style={{ right: "22%", top: "40px" }} />
        <div className="dj-container dj-center">
          <div className="dj-eyebrow"><Crown size={16} /> Five Guardians, Five Gifts <Crown size={16} /></div>
          <h2 className="dj-h2 dj-h2--xl">Meet the DanJe Angels <em>Family</em>.</h2>
          <p className="dj-family__lead">
            Each angel carries a unique scripture and a unique message — to remind every child they are
            loved, protected, and called by God for a beautiful purpose.
          </p>
          <div className="dj-angels">
            {family.map((a, i) => <AngelCard key={a.name} angel={a} crown={i === 0} meet />)}
          </div>
        </div>
      </section>
      <Shop embedded />
      <WhyFamilies />
      <Founder />
      <Moments />
      <Collections />
      <KingdomBundle />
      <Testimonials />
      <Newsletter />
      <Mission />
      <StoryLetter />
      <AffirmationRibbon />
    </>
  );
}
