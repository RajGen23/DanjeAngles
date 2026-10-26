import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ShoppingBag, Package, Users, Star, Mail, LineChart, LogOut, ExternalLink, Menu, X, Lock, Shield, UserCog,
} from "lucide-react";
import { api, loadSession, saveSession, login, LIVE_AVAILABLE, ROLES } from "./adminApi.js";
import { Team, Account } from "./Team.jsx";
import Dashboard from "./Dashboard.jsx";
import { Orders, Products, Reviews, Subscribers, Messages, Visitors } from "./Views.jsx";
import "./admin.css";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, view: Dashboard, perm: "dashboard" },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag, view: Orders, perm: "orders" },
  { to: "/admin/visitors", label: "Visitors & Wishlist", icon: LineChart, view: Visitors, perm: "analytics" },
  { to: "/admin/products", label: "Products", icon: Package, view: Products, perm: "products" },
  { to: "/admin/reviews", label: "Reviews", icon: Star, view: Reviews, perm: "reviews" },
  { to: "/admin/subscribers", label: "Subscribers", icon: Users, view: Subscribers, perm: "subscribers" },
  { to: "/admin/messages", label: "Messages", icon: Mail, view: Messages, perm: "messages" },
  { to: "/admin/team", label: "Team & access", icon: Shield, view: Team, perm: "users" },
  { to: "/admin/account", label: "My account", icon: UserCog, view: Account, perm: null },
];
const DEMO_USER = { id: "u1", email: "owner@danjeangels.com", name: "Aanje Wilkerson", role: "owner", permissions: ROLES.owner.perms };

function NoAccess() {
  return <div className="ad-card ad-notice"><Shield size={18} /><div><strong>You don’t have access to this area</strong><p>Ask the store owner to add it to your account under Team &amp; access.</p></div></div>;
}

function Login({ onDone }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { onDone(await login(email.trim(), password)); } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };
  return (
    <div className="ad-login">
      <div className="ad-login__card">
        <div className="ad-brand"><span className="ad-brand__mark">D</span><div><strong>DanJe’ Angels</strong><small>Store admin</small></div></div>
        {LIVE_AVAILABLE ? (
          <form onSubmit={submit}>
            <h1>Sign in</h1>
            <label>Email<input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label>Password<input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
            {err && <p className="ad-error" role="alert">{err}</p>}
            <button className="ad-btn ad-btn--primary" disabled={busy}><Lock size={15} /> {busy ? "Signing in…" : "Sign in"}</button>
          </form>
        ) : (
          <>
            <h1>Store admin</h1>
            <p className="ad-muted">This preview isn’t connected to the store, so sign-in is turned off. Explore the panel with generated sample data instead.</p>
          </>
        )}
        <button className={`ad-btn ${LIVE_AVAILABLE ? "ad-btn--ghost" : "ad-btn--primary"}`} onClick={() => onDone({ mode: "demo", staff: true, user: DEMO_USER })}>Explore with sample data</button>
        <Link to="/" className="ad-backlink">← Back to the shop</Link>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [session, setSession] = useState(loadSession);
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const client = useMemo(() => (session ? api(session) : null), [session]);

  useEffect(() => { document.title = "Admin · DanJe’ Angels"; return () => { document.title = "DanJe Angels — Bringing Heaven to Earth"; }; }, []);
  useEffect(() => setMenu(false), [pathname]);

  const signIn = (s) => { saveSession(s); setSession(s); };
  const signOut = useCallback(() => { saveSession(null); setSession(null); navigate("/admin"); }, [navigate]);
  const onAuthError = useCallback((e) => { if (e?.auth) signOut(); }, [signOut]);

  if (!session) return <Login onDone={signIn} />;
  const me = { ...session.user, permissions: session.user?.permissions || ROLES.owner.perms, role: session.user?.role || "owner" };
  const can = (perm) => !perm || me.permissions.includes(perm);
  const nav = NAV.filter((n) => can(n.perm));
  const current = NAV.find((n) => n.to === pathname.replace(/\/$/, "")) || nav[0];
  const View = can(current.perm) ? current.view : NoAccess;
  const onSession = (token) => { const s = { ...session, token }; saveSession(s); setSession(s); };

  return (
    <div className={`ad ${menu ? "is-menu" : ""}`}>
      <aside className="ad-side">
        <div className="ad-brand"><span className="ad-brand__mark">D</span><div><strong>DanJe’ Angels</strong><small>Store admin</small></div></div>
        <nav>
          {nav.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={current.to === to ? "is-active" : ""} aria-current={current.to === to ? "page" : undefined}><Icon size={17} /> {label}</Link>
          ))}
        </nav>
        <div className="ad-side__foot">
          <Link to="/" target="_blank" rel="noreferrer"><ExternalLink size={15} /> View shop</Link>
          <button onClick={signOut}><LogOut size={15} /> Sign out</button>
        </div>
      </aside>
      <div className="ad-main">
        <header className="ad-top">
          <button className="ad-menubtn" onClick={() => setMenu((m) => !m)} aria-label="Menu">{menu ? <X size={20} /> : <Menu size={20} />}</button>
          <h1>{current.label}</h1>
          <div className="ad-top__right">
            {session.mode === "demo" && <span className="ad-chip ad-chip--warn">Sample data</span>}
            <span className="ad-muted ad-hide-sm">{me.name || me.email} · {ROLES[me.role]?.label || me.role}</span>
          </div>
        </header>
        <main className="ad-content">
          <View client={client} onAuthError={onAuthError} demo={session.mode === "demo"} me={me} can={can} staffEnabled={session.staff !== false} onSession={onSession} />
        </main>
      </div>
    </div>
  );
}
