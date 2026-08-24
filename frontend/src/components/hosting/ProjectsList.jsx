import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Database, ExternalLink, Github, History, KeyRound, RefreshCw, RotateCw, Settings, Trash2, Zap } from "lucide-react";

const STATUS_STYLES = {
  running: "bg-emerald-100 text-emerald-800",
  stopped: "bg-neutral-100 text-neutral-600",
  deploying: "bg-amber-100 text-amber-800",
  detecting: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-700",
};

const IconBtn = ({ title, onClick, disabled, children, testId, active }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
    className={`p-1.5 rounded-sm border transition-colors disabled:opacity-30 ${
      active
        ? "border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
        : "border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
    }`}
  >
    {children}
  </button>
);

export default function ProjectsList({ projects, api, onChange, onOpenEnv, onOpenHistory, onOpenSettings }) {
  const [busy, setBusy] = useState(null);

  const redeploy = async (p) => {
    setBusy(p.id + "redeploy");
    try {
      await axios.post(`${api}/projects/${p.id}/action`, { action: "redeploy" });
      toast.success(`${p.name} redeploying on Railway`);
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Redeploy failed");
    } finally {
      setBusy(null);
    }
  };

  const refetch = async (p) => {
    if (!window.confirm(`Refetch latest source from Emergent and deploy '${p.name}'? Takes ~2-3 minutes.`)) return;
    setBusy(p.id + "refetch");
    try {
      await axios.post(`${api}/projects/${p.id}/refetch`);
      toast.success(`Refetching latest from Emergent → deploying...`);
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Refetch failed");
    } finally {
      setBusy(null);
    }
  };

  const addMongo = async (p) => {
    if (!window.confirm(`Provision a MongoDB service inside '${p.name}'? It will be auto-wired via MONGO_URL and DB_NAME env vars.`)) return;
    setBusy(p.id + "mongo");
    try {
      await axios.post(`${api}/projects/${p.id}/mongo`);
      toast.success("MongoDB provisioned — redeploy your app to use it");
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Mongo provision failed");
    } finally {
      setBusy(null);
    }
  };

  const removeMongo = async (p) => {
    if (!window.confirm(`Remove MongoDB from '${p.name}'? All data on the mongo volume will be lost.`)) return;
    setBusy(p.id + "mongo");
    try {
      await axios.delete(`${api}/projects/${p.id}/mongo`);
      toast.success("MongoDB removed");
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to remove MongoDB");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete '${p.name}' and its Railway project? This is permanent.`)) return;
    try {
      await axios.delete(`${api}/projects/${p.id}`);
      toast.success(`${p.name} deleted`);
      onChange();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="bg-white border border-neutral-200 rounded-sm"
      data-testid="projects-panel"
    >
      <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">Projects</h2>
          <p className="text-[11px] text-neutral-400 font-mono mt-0.5">hosted on Railway</p>
        </div>
        <span className="text-xs text-neutral-400 font-mono">{projects.length} total</span>
      </div>
      {projects.length === 0 && (
        <div className="px-6 py-10 text-sm text-neutral-500" data-testid="projects-empty">
          No projects yet. Upload your first Emergent export below to deploy it live.
        </div>
      )}
      <ul className="divide-y divide-neutral-100">
        {projects.map((p) => {
          const hasMongo = !!p.mongo_service_id;
          const canOps = !!p.railway_service_id;
          return (
            <li key={p.id} className="px-6 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors" data-testid={`project-row-${p.name}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-medium text-sm truncate">{p.name}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status] || STATUS_STYLES.stopped}`} data-testid={`project-status-${p.name}`}>
                    {p.status}
                  </span>
                  {p.deploy_count > 0 && (
                    <span className="text-[11px] text-neutral-400 font-mono">v{p.deploy_count}</span>
                  )}
                  {hasMongo && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1" data-testid={`mongo-badge-${p.name}`}>
                      <Database size={9} strokeWidth={2} /> mongo
                    </span>
                  )}
                  {p.github_sync && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-900 text-white flex items-center gap-1" data-testid={`github-badge-${p.name}`}>
                      <Github size={9} strokeWidth={2} /> synced
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                  <span>{p.framework || "detecting"}</span>
                  {p.size_mb ? <><span className="text-neutral-300">·</span><span className="font-mono">{p.size_mb} MB</span></> : null}
                </div>
                <div className="mt-1.5 flex flex-col gap-1 text-xs">
                  {p.frontend_url && (
                    <a href={p.frontend_url} target="_blank" rel="noreferrer" data-testid={`project-store-url-${p.name}`}
                       className="flex items-center gap-1.5 text-neutral-600 hover:text-[#FF4400] font-mono truncate group">
                      <span className="uppercase tracking-wider text-[10px] font-sans text-neutral-400 shrink-0">Store</span>
                      <span className="truncate">{p.frontend_url.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink size={10} strokeWidth={1.5} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </a>
                  )}
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noreferrer" data-testid={`project-api-url-${p.name}`}
                       className="flex items-center gap-1.5 text-neutral-600 hover:text-[#FF4400] font-mono truncate group">
                      <span className="uppercase tracking-wider text-[10px] font-sans text-neutral-400 shrink-0">{p.frontend_url ? "API" : "URL"}</span>
                      <span className="truncate">{p.url.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink size={10} strokeWidth={1.5} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </a>
                  ) : (
                    <span className="italic text-neutral-400">provisioning URL…</span>
                  )}
                  {p.admin_email && (
                    <div className="flex items-center gap-1.5 text-neutral-500 font-mono" data-testid={`project-admin-${p.name}`}>
                      <span className="uppercase tracking-wider text-[10px] font-sans text-neutral-400 shrink-0">Admin</span>
                      <span className="truncate">{p.admin_email}{p.admin_password ? ` / ${p.admin_password}` : ""}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <IconBtn
                  title={hasMongo ? "Remove MongoDB" : "Provision MongoDB"}
                  onClick={() => (hasMongo ? removeMongo(p) : addMongo(p))}
                  disabled={busy === p.id + "mongo" || !canOps}
                  testId={`mongo-btn-${p.name}`}
                  active={hasMongo}
                >
                  <Database size={14} strokeWidth={1.5} />
                </IconBtn>
                <IconBtn title="Deploy history" onClick={() => onOpenHistory(p)} disabled={!canOps} testId={`history-btn-${p.name}`}>
                  <History size={14} strokeWidth={1.5} />
                </IconBtn>
                <IconBtn title="Environment variables" onClick={() => onOpenEnv(p)} testId={`env-btn-${p.name}`}>
                  <KeyRound size={14} strokeWidth={1.5} />
                </IconBtn>
                <IconBtn title="Project settings (token, GitHub)" onClick={() => onOpenSettings(p)} testId={`settings-btn-${p.name}`}>
                  <Settings size={14} strokeWidth={1.5} />
                </IconBtn>
                <IconBtn
                  title="Redeploy last version"
                  onClick={() => redeploy(p)}
                  disabled={busy === p.id + "redeploy" || p.status === "deploying" || !canOps}
                  testId={`redeploy-btn-${p.name}`}
                >
                  {p.status === "deploying" ? <Zap size={14} strokeWidth={1.5} className="animate-pulse text-amber-500" /> : <RotateCw size={14} strokeWidth={1.5} />}
                </IconBtn>
                {p.emergent_source_url && (
                  <IconBtn
                    title="Refetch latest from Emergent & deploy"
                    onClick={() => refetch(p)}
                    disabled={busy === p.id + "refetch" || p.status === "deploying"}
                    testId={`refetch-btn-${p.name}`}
                    active={true}
                  >
                    <RefreshCw size={14} strokeWidth={1.5} className={busy === p.id + "refetch" ? "animate-spin" : ""} />
                  </IconBtn>
                )}
                <IconBtn title="Delete project" onClick={() => remove(p)} disabled={busy} testId={`delete-btn-${p.name}`}>
                  <Trash2 size={14} strokeWidth={1.5} />
                </IconBtn>
              </div>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
