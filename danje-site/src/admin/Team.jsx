import { useState } from "react";
import { UserPlus, KeyRound, Trash2, Check, Shield, Eye, EyeOff } from "lucide-react";
import { useData, fmtDateTime } from "./useData.js";
import { PERMISSIONS, ROLES } from "./adminApi.js";

const MIN = 10;
const strength = (pw) => {
  let s = 0;
  if (pw.length >= MIN) s++; if (pw.length >= 14) s++; if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++; if (/\d/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
  return ["Too short", "Weak", "Fair", "Good", "Strong", "Strong"][pw.length < MIN ? 0 : s];
};
const genPassword = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const a = new Uint32Array(14); crypto.getRandomValues(a);
  return Array.from(a, (n) => c[n % c.length]).join("");
};

function PasswordField({ id, label, value, onChange, autoComplete, showStrength }) {
  const [show, setShow] = useState(false);
  return (
    <label>{label}
      <span className="ad-pw">
        <input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </span>
      {showStrength && value && <small className={`ad-strength ad-strength--${strength(value).toLowerCase().replace(" ", "")}`}>{strength(value)}</small>}
    </label>
  );
}

function AccessPicker({ role, perms, onChange }) {
  const owner = role === "owner";
  return (
    <fieldset className="ad-access" disabled={owner}>
      <legend>Access {owner && <span className="ad-muted">· owners always have full access</span>}</legend>
      {PERMISSIONS.map(([k, l]) => (
        <label key={k}><input type="checkbox" checked={owner || perms.includes(k)} onChange={(e) => onChange(e.target.checked ? [...perms, k] : perms.filter((p) => p !== k))} /> {l}</label>
      ))}
    </fieldset>
  );
}

/* ------------------------------ Team & access ------------------------------ */
export function Team({ client, onAuthError, me, staffEnabled }) {
  const d = useData(() => (staffEnabled ? client.users() : Promise.resolve([])), [client, staffEnabled], onAuthError);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "orders", permissions: ROLES.orders.perms, password: "" });
  const [edit, setEdit] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [reset, setReset] = useState(null);
  const [msg, setMsg] = useState({ ok: "", err: "" });

  if (!staffEnabled) return (
    <div className="ad-card ad-notice"><Shield size={18} /><div><strong>Team accounts aren’t switched on yet</strong>
      <p>The store currently has a single admin login. Add <code>backend-addon/staff.py</code> to the API (see its README) to invite team members, give them roles and let everyone change their own password.</p></div></div>
  );
  if (d.error) return <div className="ad-card ad-error">{d.error}</div>;
  if (!d.data) return <div className="ad-card"><div className="ad-skel" /></div>;

  const flash = (ok, err = "") => { setMsg({ ok, err }); if (ok) setTimeout(() => setMsg({ ok: "", err: "" }), 2500); };
  const add = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return flash("", "Enter a valid email address.");
    if (form.password.length < MIN) return flash("", `The starting password needs at least ${MIN} characters.`);
    try {
      const u = await client.addUser({ ...form, email: form.email.trim().toLowerCase() });
      d.setData((l) => [...l, u]); setAdding(false);
      flash(`${u.name || u.email} can now sign in. Share the starting password with them privately and ask them to change it under My account.`);
      setForm({ name: "", email: "", role: "orders", permissions: ROLES.orders.perms, password: "" });
    } catch (e2) { flash("", e2.message); }
  };
  const save = async (u, patch) => {
    try { const nu = await client.updateUser(u.id, patch); d.setData((l) => l.map((x) => (x.id === u.id ? { ...x, ...nu } : x))); setEdit(null); flash("Saved."); }
    catch (e) { flash("", e.message); }
  };
  const remove = async (u) => {
    try { await client.deleteUser(u.id); d.setData((l) => l.filter((x) => x.id !== u.id)); setConfirm(null); flash(`${u.name || u.email} was removed.`); }
    catch (e) { flash("", e.message); }
  };
  const doReset = async (e) => {
    e.preventDefault();
    if (reset.pw.length < MIN) return flash("", `The new password needs at least ${MIN} characters.`);
    try { await client.resetPassword(reset.user.id, reset.pw); flash(`New password set for ${reset.user.name || reset.user.email}. They’ve been signed out everywhere.`); setReset(null); }
    catch (e2) { flash("", e2.message); }
  };

  return (
    <div className="ad-stack">
      <div className="ad-toolbar">
        <span className="ad-muted">{d.data.length} team member{d.data.length === 1 ? "" : "s"}</span>
        {!adding && <button className="ad-btn ad-btn--primary" onClick={() => setAdding(true)}><UserPlus size={15} /> Add team member</button>}
      </div>
      {msg.ok && <p className="ad-card ad-okmsg" role="status"><Check size={16} /> {msg.ok}</p>}
      {msg.err && <p className="ad-card ad-error" role="alert">{msg.err}</p>}

      {adding && (
        <form className="ad-card ad-form" onSubmit={add} noValidate>
          <h2>Add team member</h2>
          <div className="ad-form__grid ad-form__grid--3">
            <label>Name<input id="nu-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Email<input id="nu-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" /></label>
            <label>Role<select id="nu-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, permissions: ROLES[e.target.value].perms })}>
              {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select>
              <small className="ad-muted">{ROLES[form.role].desc}</small></label>
          </div>
          <AccessPicker role={form.role} perms={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
          <div className="ad-row ad-row--end">
            <PasswordField id="nu-pw" label="Starting password" value={form.password} onChange={(password) => setForm({ ...form, password })} autoComplete="new-password" showStrength />
            <button type="button" className="ad-btn" onClick={() => setForm({ ...form, password: genPassword() })}>Generate</button>
          </div>
          <div className="ad-row"><button className="ad-btn ad-btn--primary">Add member</button><button type="button" className="ad-btn ad-btn--ghost" onClick={() => setAdding(false)}>Cancel</button></div>
        </form>
      )}

      {reset && (
        <form className="ad-card ad-form" onSubmit={doReset} noValidate>
          <h2>Set a new password for {reset.user.name || reset.user.email}</h2>
          <p className="ad-muted">Use this when someone forgets their password. They’ll be signed out on every device.</p>
          <div className="ad-row ad-row--end">
            <PasswordField id="rs-pw" label="New password" value={reset.pw} onChange={(pw) => setReset({ ...reset, pw })} autoComplete="new-password" showStrength />
            <button type="button" className="ad-btn" onClick={() => setReset({ ...reset, pw: genPassword() })}>Generate</button>
          </div>
          <div className="ad-row"><button className="ad-btn ad-btn--primary">Set password</button><button type="button" className="ad-btn ad-btn--ghost" onClick={() => setReset(null)}>Cancel</button></div>
        </form>
      )}

      <div className="ad-list">
        {d.data.map((u) => {
          const isMe = u.email === me.email || u.id === me.id;
          const editing = edit?.id === u.id;
          return (
            <article key={u.id} className={`ad-card ad-user ${u.active === false ? "is-off" : ""}`}>
              <div className="ad-user__head">
                <span className="ad-avatar">{(u.name || u.email)[0].toUpperCase()}</span>
                <div className="ad-user__who"><strong>{u.name || u.email}{isMe && <span className="ad-chip">You</span>}{u.active === false && <span className="ad-pill ad-pill--muted">Deactivated</span>}</strong>
                  <span className="ad-muted">{u.email} · last sign-in {u.last_login ? fmtDateTime(u.last_login) : "never"}</span></div>
                <span className="ad-chip ad-chip--role">{ROLES[u.role]?.label || u.role}</span>
              </div>
              {editing ? (
                <div className="ad-form">
                  <div className="ad-form__grid ad-form__grid--3">
                    <label>Name<input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
                    <label>Role<select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value, permissions: ROLES[e.target.value].perms })}>
                      {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select></label>
                  </div>
                  <AccessPicker role={edit.role} perms={edit.permissions} onChange={(permissions) => setEdit({ ...edit, permissions })} />
                  <div className="ad-row"><button className="ad-btn ad-btn--primary" onClick={() => save(u, { name: edit.name, role: edit.role, permissions: edit.permissions })}>Save changes</button><button className="ad-btn ad-btn--ghost" onClick={() => setEdit(null)}>Cancel</button></div>
                </div>
              ) : (
                <>
                  <div className="ad-perms">{PERMISSIONS.map(([k, l]) => <span key={k} className={(u.permissions || []).includes(k) ? "is-on" : ""}>{(u.permissions || []).includes(k) ? <Check size={12} /> : null}{l}</span>)}</div>
                  <div className="ad-row">
                    <button className="ad-btn ad-btn--sm" onClick={() => setEdit({ id: u.id, name: u.name || "", role: u.role, permissions: u.permissions || [] })}>Edit role & access</button>
                    {!isMe && <button className="ad-btn ad-btn--sm" onClick={() => setReset({ user: u, pw: "" })}><KeyRound size={13} /> Reset password</button>}
                    {!isMe && <button className="ad-btn ad-btn--sm" onClick={() => save(u, { active: u.active === false })}>{u.active === false ? "Reactivate" : "Deactivate"}</button>}
                    {!isMe && (confirm === u.id
                      ? <span className="ad-row"><span className="ad-muted">Remove {u.name || u.email} for good?</span><button className="ad-btn ad-btn--sm ad-btn--danger" onClick={() => remove(u)}>Remove</button><button className="ad-btn ad-btn--sm" onClick={() => setConfirm(null)}>Keep</button></span>
                      : <button className="ad-btn ad-btn--sm" onClick={() => setConfirm(u.id)}><Trash2 size={13} /> Remove</button>)}
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
      <section className="ad-card">
        <h2 className="ad-h2">What each role can do</h2>
        <div className="ad-tablewrap">
          <table className="ad-table ad-table--matrix">
            <thead><tr><th>Role</th>{PERMISSIONS.map(([k, l]) => <th key={k}>{l}</th>)}</tr></thead>
            <tbody>{Object.entries(ROLES).map(([k, r]) => (
              <tr key={k}><td><strong>{r.label}</strong></td>{PERMISSIONS.map(([p]) => <td key={p}>{r.perms.includes(p) ? <Check size={15} className="ad-yes" aria-label="Yes" /> : <span className="ad-no" aria-label="No">–</span>}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
        <p className="ad-muted">You can tick or untick areas for one person without changing their role.</p>
      </section>
    </div>
  );
}

/* ------------------------------ My account ------------------------------ */
export function Account({ client, me, staffEnabled, onSession }) {
  const [f, setF] = useState({ cur: "", next: "", again: "" });
  const [msg, setMsg] = useState({ ok: "", err: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setMsg({ ok: "", err: "" });
    if (f.next.length < MIN) return setMsg({ err: `Your new password needs at least ${MIN} characters.` });
    if (f.next !== f.again) return setMsg({ err: "The two new passwords don’t match." });
    if (f.next === f.cur) return setMsg({ err: "Choose a password you haven’t used here before." });
    setBusy(true);
    try {
      const r = await client.changePassword(f.cur, f.next);
      if (r?.access_token) onSession(r.access_token);
      setF({ cur: "", next: "", again: "" });
      setMsg({ ok: "Password changed. You’ve been signed out on your other devices." });
    } catch (e2) { setMsg({ err: e2.message }); }
    setBusy(false);
  };
  return (
    <div className="ad-stack ad-narrow">
      <section className="ad-card">
        <h2 className="ad-h2">Your details</h2>
        <dl className="ad-dl"><dt>Name</dt><dd>{me.name || "—"}</dd><dt>Email</dt><dd>{me.email}</dd><dt>Role</dt><dd>{ROLES[me.role]?.label || me.role}</dd>
          <dt>Access</dt><dd>{PERMISSIONS.filter(([k]) => (me.permissions || []).includes(k)).map(([, l]) => l).join(", ")}</dd></dl>
      </section>
      {staffEnabled ? (
        <form className="ad-card ad-form" onSubmit={submit} noValidate>
          <h2>Change password</h2>
          <PasswordField id="pw-cur" label="Current password" value={f.cur} onChange={(cur) => setF({ ...f, cur })} autoComplete="current-password" />
          <PasswordField id="pw-new" label={`New password (at least ${MIN} characters)`} value={f.next} onChange={(next) => setF({ ...f, next })} autoComplete="new-password" showStrength />
          <PasswordField id="pw-again" label="New password again" value={f.again} onChange={(again) => setF({ ...f, again })} autoComplete="new-password" />
          {msg.err && <p className="ad-error" role="alert">{msg.err}</p>}
          {msg.ok && <p className="ad-okmsg" role="status"><Check size={16} /> {msg.ok}</p>}
          <div className="ad-row"><button className="ad-btn ad-btn--primary" disabled={busy}>{busy ? "Saving…" : "Change password"}</button></div>
        </form>
      ) : (
        <div className="ad-card ad-notice"><KeyRound size={18} /><div><strong>Password changes need the team add-on</strong>
          <p>The store’s original admin login keeps its password in the server settings (<code>ADMIN_PASSWORD</code>). Install <code>backend-addon/staff.py</code> to change passwords here.</p></div></div>
      )}
    </div>
  );
}
