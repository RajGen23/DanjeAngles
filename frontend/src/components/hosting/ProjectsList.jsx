import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ExternalLink, KeyRound, RotateCw, Trash2, Zap } from "lucide-react";

const STATUS_STYLES = {
  running: "bg-emerald-100 text-emerald-800",
  stopped: "bg-neutral-100 text-neutral-600",
  deploying: "bg-amber-100 text-amber-800",
  detecting: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-700",
};

const IconBtn = ({ title, onClick, disabled, children, testId }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
    className="p-1.5 rounded-sm border border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30 transition-colors"
  >
    {children}
  </button>
);

export default function ProjectsList({ projects, api, onChange, onOpenEnv }) {
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
        {projects.map((p) => (
          <li key={p.id} className="px-6 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors" data-testid={`project-row-${p.name}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="font-medium text-sm truncate">{p.name}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status] || STATUS_STYLES.stopped}`} data-testid={`project-status-${p.name}`}>
                  {p.status}
                </span>
                {p.deploy_count > 0 && (
                  <span className="text-[11px] text-neutral-400 font-mono">v{p.deploy_count}</span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-500">
                <span>{p.framework || "detecting"}</span>
                {p.size_mb && <><span className="text-neutral-300">·</span><span className="font-mono">{p.size_mb} MB</span></>}
                <span className="text-neutral-300">·</span>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#FF4400] transition-colors truncate">
                    {p.url.replace(/^https?:\/\//, "")} <ExternalLink size={11} strokeWidth={1.5} />
                  </a>
                ) : (
                  <span className="italic text-neutral-400">provisioning URL…</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <IconBtn title="Environment variables" onClick={() => onOpenEnv(p)} testId={`env-btn-${p.name}`}>
                <KeyRound size={14} strokeWidth={1.5} />
              </IconBtn>
              <IconBtn
                title="Redeploy last version"
                onClick={() => redeploy(p)}
                disabled={busy === p.id + "redeploy" || p.status === "deploying" || !p.railway_service_id}
                testId={`redeploy-btn-${p.name}`}
              >
                {p.status === "deploying" ? <Zap size={14} strokeWidth={1.5} className="animate-pulse text-amber-500" /> : <RotateCw size={14} strokeWidth={1.5} />}
              </IconBtn>
              <IconBtn title="Delete" onClick={() => remove(p)} disabled={busy} testId={`delete-btn-${p.name}`}>
                <Trash2 size={14} strokeWidth={1.5} />
              </IconBtn>
            </div>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
