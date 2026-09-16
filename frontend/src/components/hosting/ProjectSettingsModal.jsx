import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Database, ExternalLink, Github, Globe, KeyRound, RefreshCw, User, X } from "lucide-react";

export default function ProjectSettingsModal({ api, project, ghUser, onClose, onChange }) {
  const [token, setToken] = useState("");
  const [ghEnabled, setGhEnabled] = useState(!!project?.github_sync);
  const [frontendUrl, setFrontendUrl] = useState(project?.frontend_url || "");
  const [adminEmail, setAdminEmail] = useState(project?.admin_email || "");
  const [adminPassword, setAdminPassword] = useState(project?.admin_password || "");
  const [emUrl, setEmUrl] = useState(project?.emergent_source_url || "");
  const [emPwd, setEmPwd] = useState("");
  const [emSubdir, setEmSubdir] = useState(project?.emergent_subdir || "");
  const [seedPath, setSeedPath] = useState(project?.reseed_path || "");
  const [seedConfirm, setSeedConfirm] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setGhEnabled(!!project?.github_sync);
    setFrontendUrl(project?.frontend_url || "");
    setAdminEmail(project?.admin_email || "");
    setAdminPassword(project?.admin_password || "");
    setEmUrl(project?.emergent_source_url || "");
    setEmSubdir(project?.emergent_subdir || "");
    setSeedPath(project?.reseed_path || "");
    setSeedConfirm("");
    // keyed on id only: the projects list polls, and re-running this on every
    // refreshed object would wipe whatever the user is currently typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const saveToken = useCallback(async () => {
    if (!token.trim()) return toast.error("Paste a token first");
    setSaving(true);
    try {
      await axios.post(`${api}/projects/${project.id}/token`, { token: token.trim() });
      toast.success("Project token saved");
      setToken("");
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  }, [api, project, token, onChange]);

  const toggleGh = useCallback(async (val) => {
    setSaving(true);
    try {
      await axios.post(`${api}/projects/${project.id}/github`, { enabled: val });
      setGhEnabled(val);
      toast.success(val ? "GitHub sync ON — next deploy will mirror" : "GitHub sync OFF");
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Toggle failed");
    } finally { setSaving(false); }
  }, [api, project, onChange]);

  const saveUrls = useCallback(async () => {
    setSaving(true);
    try {
      await axios.post(`${api}/projects/${project.id}/urls`, {
        frontend_url: frontendUrl.trim() || null,
        admin_email: adminEmail.trim() || null,
        admin_password: adminPassword || null,
      });
      toast.success("URLs & admin saved");
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  }, [api, project, frontendUrl, adminEmail, adminPassword, onChange]);

  const saveEmergent = useCallback(async () => {
    if (!emUrl.trim()) return toast.error("Emergent URL required");
    if (!emPwd && !project.emergent_source_url) return toast.error("Password required for new source");
    setSaving(true);
    try {
      const payload = {
        url: emUrl.trim(),
        password: emPwd || project.emergent_source_password || "",
        workspace_root: "/app",
        subdir: emSubdir.trim() || null,
      };
      await axios.post(`${api}/projects/${project.id}/emergent-source`, payload);
      toast.success("Emergent source saved — Refetch button now available");
      setEmPwd("");
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  }, [api, project, emUrl, emPwd, emSubdir, onChange]);

  const reseed = useCallback(async () => {
    setSeeding(true);
    try {
      const { data } = await axios.post(`${api}/projects/${project.id}/reseed`, {
        path: seedPath.trim() || null,
      });
      toast.success(`Demo data reseeded via ${data.path}`);
      setSeedPath(data.path);
      setSeedConfirm("");
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Reseed failed");
    } finally { setSeeding(false); }
  }, [api, project, seedPath, onChange]);

  if (!project) return null;
  const hasToken = !!project.railway_project_token;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4"
        data-testid="settings-modal" onClick={onClose}
      >
        <motion.div
          initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-neutral-200 rounded-sm w-full max-w-lg"
        >
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-base font-semibold tracking-tight">Project Settings</h2>
              <p className="text-xs text-neutral-500 mt-0.5 font-mono">{project.name}</p>
            </div>
            <button onClick={onClose} data-testid="settings-close" className="text-neutral-400 hover:text-neutral-900">
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Public URLs + admin creds */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe size={13} strokeWidth={1.75} className="text-neutral-400" />
                <span className="text-xs uppercase tracking-wider text-neutral-500">Public URLs &amp; admin</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed mb-3">
                Both URLs (Store + API) and admin credentials show on the project row for quick access.
              </p>
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 w-14 shrink-0">Store</span>
                  <input
                    value={frontendUrl}
                    onChange={(e) => setFrontendUrl(e.target.value)}
                    placeholder="https://your-frontend.up.railway.app"
                    data-testid="frontend-url-input"
                    className="flex-1 border border-neutral-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400] bg-white"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 w-14 shrink-0">Admin</span>
                  <input
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
                    data-testid="admin-email-input"
                    className="flex-1 border border-neutral-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400] bg-white"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 w-14 shrink-0">Password</span>
                  <input
                    type="text"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="admin password"
                    data-testid="admin-password-input"
                    className="flex-1 border border-neutral-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400] bg-white"
                  />
                </div>
                <button
                  onClick={saveUrls}
                  disabled={saving}
                  data-testid="save-urls-btn"
                  className="w-full px-3 py-2 bg-[#FF4400] hover:bg-[#E63D00] text-white text-sm rounded-sm disabled:opacity-50 transition-colors"
                >
                  Save URLs &amp; admin
                </button>
              </div>
            </div>

            {/* Emergent source (for one-click Refetch) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw size={13} strokeWidth={1.75} className="text-neutral-400" />
                <span className="text-xs uppercase tracking-wider text-neutral-500">Emergent source</span>
                {project.emergent_source_url && <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">connected</span>}
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed mb-2">
                When set, the ↻ Refetch button on this project pulls the latest source from your Emergent code-server and redeploys — no manual zip export.
              </p>
              <div className="space-y-2">
                <input
                  value={emUrl}
                  onChange={(e) => setEmUrl(e.target.value)}
                  placeholder="https://vscode-xxx.preview.emergentagent.com"
                  data-testid="emergent-url-input"
                  className="w-full border border-neutral-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400] bg-white"
                />
                <input
                  type="password"
                  value={emPwd}
                  onChange={(e) => setEmPwd(e.target.value)}
                  placeholder={project.emergent_source_url ? "•••• (paste to replace)" : "code-server password"}
                  data-testid="emergent-pwd-input"
                  className="w-full border border-neutral-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400] bg-white"
                />
                <input
                  value={emSubdir}
                  onChange={(e) => setEmSubdir(e.target.value)}
                  placeholder="subdir (backend / frontend, blank for whole workspace)"
                  data-testid="emergent-subdir-input"
                  className="w-full border border-neutral-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400] bg-white"
                />
                <button
                  onClick={saveEmergent}
                  disabled={saving}
                  data-testid="save-emergent-btn"
                  className="w-full px-3 py-2 bg-neutral-900 hover:bg-neutral-700 text-white text-sm rounded-sm disabled:opacity-50 transition-colors"
                >
                  Save Emergent source
                </button>
              </div>
            </div>

            {/* Reseed demo data */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Database size={13} strokeWidth={1.75} className="text-neutral-400" />
                <span className="text-xs uppercase tracking-wider text-neutral-500">Reseed demo data</span>
                {project.last_reseed_at && (
                  <span className="text-[10px] font-mono text-neutral-400">
                    last {new Date(project.last_reseed_at).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed mb-2">
                Apps that seed on startup skip seeding once the database has rows — so a deploy ships new
                code but never the new seed records. This calls the app&apos;s own reset/seed endpoint so data
                catches up with code. <span className="text-amber-700">It replaces existing records.</span>
              </p>
              <div className="space-y-2">
                <input
                  value={seedPath}
                  onChange={(e) => setSeedPath(e.target.value)}
                  placeholder="/api/admin/reset (blank = auto-detect)"
                  data-testid="reseed-path-input"
                  className="w-full border border-neutral-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400] bg-white"
                />
                <input
                  value={seedConfirm}
                  onChange={(e) => setSeedConfirm(e.target.value)}
                  placeholder="type RESEED to confirm"
                  data-testid="reseed-confirm-input"
                  className="w-full border border-neutral-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400] bg-white"
                />
                <button
                  onClick={reseed}
                  disabled={seeding || seedConfirm.trim().toUpperCase() !== "RESEED"}
                  data-testid="reseed-btn"
                  className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-sm disabled:opacity-40 transition-colors"
                >
                  {seeding ? "Reseeding…" : "Reseed demo data"}
                </button>
              </div>
            </div>

            {/* Railway project token */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <KeyRound size={13} strokeWidth={1.75} className="text-neutral-400" />
                <span className="text-xs uppercase tracking-wider text-neutral-500">Railway project token</span>
                {hasToken && <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">saved</span>}
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed mb-2">
                Required for source-code uploads. Get one from Railway → project → Settings → Tokens → New Token.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={hasToken ? "•••• (paste to replace)" : "paste your project token here"}
                  data-testid="project-token-input"
                  className="flex-1 border border-neutral-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400] bg-white"
                />
                <button
                  onClick={saveToken}
                  disabled={saving || !token.trim()}
                  data-testid="save-token-btn"
                  className="px-3 py-2 bg-neutral-900 hover:bg-neutral-700 text-white text-sm rounded-sm disabled:opacity-50 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>

            {/* GitHub sync */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Github size={13} strokeWidth={1.75} className="text-neutral-400" />
                <span className="text-xs uppercase tracking-wider text-neutral-500">GitHub mirror</span>
                {ghUser && <span className="text-[10px] font-mono text-neutral-400">@{ghUser}</span>}
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed mb-2">
                When enabled, every successful deploy is pushed to a private repo <span className="font-mono">emergent-hosted-{project.slug || project.name}</span> on your GitHub. Version-controlled backup, one-tap rollback via git.
              </p>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  role="switch"
                  aria-checked={ghEnabled}
                  onClick={() => toggleGh(!ghEnabled)}
                  data-testid="github-toggle"
                  className={`relative w-10 h-5 rounded-full transition-colors ${ghEnabled ? "bg-[#FF4400]" : "bg-neutral-300"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${ghEnabled ? "left-[22px]" : "left-0.5"}`} />
                </div>
                <span className="text-sm text-neutral-700">{ghEnabled ? "Mirroring on every deploy" : "Disabled"}</span>
              </label>
              {project.github_repo_url && (
                <a
                  href={project.github_repo_url} target="_blank" rel="noreferrer"
                  data-testid="github-repo-link"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-[#FF4400] font-mono"
                >
                  <Github size={11} strokeWidth={1.75} />
                  {project.github_repo_url.replace("https://", "")}
                  <ExternalLink size={9} strokeWidth={1.75} />
                </a>
              )}
              {!ghUser && (
                <p className="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-2 py-1.5 leading-relaxed">
                  Add <span className="font-mono">GITHUB_PAT</span> to the panel&apos;s backend .env to enable this.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
