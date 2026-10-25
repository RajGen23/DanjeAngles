import { useState } from "react";
import { Mail, Send, Copy, Check } from "lucide-react";
import PageHead from "../components/PageHead.jsx";
import { sendContact } from "../api.js";
import { HeartGem } from "../components/Decor.jsx";

const EMAIL = "hello@danjeangels.com";

export default function Contact() {
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState("idle"); // idle | busy | done | preview
  const [fail, setFail] = useState("");
  const [copied, setCopied] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = "Please tell us your name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = "Please enter a valid email address.";
    if (f.message.trim().length < 5) er.message = "Please write a short message.";
    setErrors(er); setFail("");
    if (Object.keys(er).length) return;
    setState("busy");
    try {
      const res = await sendContact({ name: f.name.trim(), email: f.email.trim(), subject: f.subject.trim() || "Website enquiry", message: f.message.trim() });
      setState(res?.preview ? "preview" : "done");
    } catch (err) { setFail(err.message); setState("idle"); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(EMAIL); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  return (
    <section className="dj-shop dj-sky dj-contact">
      <div className="dj-container">
        <PageHead title="Contact Us">We’d love to hear from you — questions about an order,<br />a gift, or how the angels can bless your family.</PageHead>
        <div className="dj-contact__grid">
          <aside className="dj-card dj-contact__info">
            <h2 className="dj-h3">Say hello</h2>
            <p>Email us any time and we’ll reply within two business days.</p>
            <div className="dj-contact__email">
              <Mail size={18} /> <span className="dj-selectable">{EMAIL}</span>
              <button onClick={copy} aria-label="Copy email address">{copied ? <Check size={15} /> : <Copy size={15} />}</button>
            </div>
            <blockquote>“Let the little children come to me.” <cite>Matthew 19:14</cite></blockquote>
          </aside>
          <div className="dj-card dj-contact__form">
            {state === "done" || state === "preview" ? (
              <div className="dj-news__done" role="status">
                <HeartGem size={22} />
                <strong>Thank you, {f.name.split(" ")[0]}!</strong>
                <span>{state === "preview" ? "This design preview doesn’t send messages. On the live site your message goes straight to the DanJe’ Angels inbox." : "Your message is on its way. We’ll be in touch soon."}</span>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <div className="dj-form-row">
                  <label className="dj-label">Your name
                    <input id="contact-name" value={f.name} onChange={set("name")} autoComplete="name" aria-invalid={!!errors.name} />
                    {errors.name && <span className="dj-form-error">{errors.name}</span>}
                  </label>
                  <label className="dj-label">Email
                    <input id="contact-email" type="email" value={f.email} onChange={set("email")} autoComplete="email" aria-invalid={!!errors.email} />
                    {errors.email && <span className="dj-form-error">{errors.email}</span>}
                  </label>
                </div>
                <label className="dj-label">Subject
                  <input id="contact-subject" value={f.subject} onChange={set("subject")} placeholder="Order, gift, wholesale…" />
                </label>
                <label className="dj-label">Message
                  <textarea id="contact-message" rows={6} value={f.message} onChange={set("message")} aria-invalid={!!errors.message} />
                  {errors.message && <span className="dj-form-error">{errors.message}</span>}
                </label>
                {fail && <p className="dj-form-error" role="alert">{fail}</p>}
                <button className="dj-btn dj-btn--purple" disabled={state === "busy"}><Send size={16} /> {state === "busy" ? "Sending…" : "Send message"}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
