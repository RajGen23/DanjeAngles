import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Github, Globe, KeyRound, User, X } from "lucide-react";

export default function ProjectSettingsModal({ api, project, ghUser, onClose, onChange }) {
  const [token, setToken] = useState("");
  const [ghEnabled, setGhEnabled] = useState(!!project?.github_sync);
  const [frontendUrl, setFrontendUrl] = useState(project?.frontend_url || "");
  const [adminEmail, setAdminEmail] = useState(project?.admin_email || "");
  const [adminPassword, setAdminPassword] = useState(project?.admin_password || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setGhEnabled(!!project?.github_sync);
    setFrontendUrl(project?.frontend_url || "");
    setAdminEmail(project?.admin_email || "");
    setAdminPassword(project?.admin_password || "");
  }, [project]);

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
