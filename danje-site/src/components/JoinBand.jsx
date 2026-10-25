import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Logo from "./Logo.jsx";
import { Dragonfly, GoldDivider, GoldStar } from "./Decor.jsx";

export default function JoinBand() {
  return (
    <footer className="dj-join">
      <div className="dj-join__photo" style={{ backgroundImage: "url(/img/founders-footer.jpg)" }} />
      <Dragonfly size={46} className="dj-abs" style={{ left: "24%", top: "22%" }} />
      <GoldStar size={14} className="dj-abs" style={{ right: "26%", top: "18%" }} />
      <GoldStar size={11} className="dj-abs" style={{ right: "8%", top: "12%" }} />
      <div className="dj-join__center">
        <h2 className="dj-h2">Join the DanJe’ Angels Family</h2>
        <GoldDivider width={120} />
        <p>Faith-filled companions designed to help<br />children discover who they are in Christ.</p>
        <div className="dj-btnrow">
          <Link to="/shop" className="dj-btn dj-btn--magenta">Shop the Angels <ArrowRight size={15} /></Link>
          <Link to="/contact" className="dj-btn dj-btn--outline-pink">Contact Us</Link>
        </div>
      </div>
      <div className="dj-join__logo"><Logo /></div>
    </footer>
  );
}
