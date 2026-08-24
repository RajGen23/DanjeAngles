import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ExternalLink, Play, RotateCw, Square, Trash2 } from "lucide-react";

const STATUS_STYLES = {
  running: "bg-emerald-100 text-emerald-800",
  stopped: "bg-neutral-100 text-neutral-600",
  deploying: "bg-amber-100 text-amber-800",
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

export default function ProjectsList({ projects, api, onChange }) {
  const [busy, setBusy] = useState(null);

  const act = async (p, action) => {
    setBusy(p.id + action);
    try {
      await axios.post(`${api}/projects/${p.id}/action`, { action });
      toast.success(`${p.name} ${action === "stop" ? "stopped" : action === "start" ? "started" : "restarted"}`);
      onChange();
    } catch {
      toast.error("Action failed");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (p) => {
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
        <h2 className="font-heading text-base font-semibold tracking-tight">Projects</h2>
        <span className="text-xs text-neutral-400 font-mono">{projects.length} total</span>
      </div>
      {projects.length === 0 && (
        <div className="px-6 py-10 text-sm text-neutral-500" data-testid="projects-empty">
          No projects yet. Upload your first app below.
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
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-500">
                <span>{p.framework}</span>
                <span className="text-neutral-300">·</span>
                <span className="font-mono">{p.size_mb} MB</span>
                <span className="text-neutral-300">·</span>
                <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#FF4400] transition-colors truncate">
                  {p.url.replace("https://", "")} <ExternalLink size={11} strokeWidth={1.5} />
                </a>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {p.status === "stopped" ? (
                <IconBtn title="Start" onClick={() => act(p, "start")} disabled={busy} testId={`start-btn-${p.name}`}>
                  <Play size={14} strokeWidth={1.5} />
                </IconBtn>
              ) : (
                <IconBtn title="Stop" onClick={() => act(p, "stop")} disabled={busy || p.status === "deploying"} testId={`stop-btn-${p.name}`}>
                  <Square size={14} strokeWidth={1.5} />
                </IconBtn>
              )}
              <IconBtn title="Restart" onClick={() => act(p, "restart")} disabled={busy || p.status === "deploying"} testId={`restart-btn-${p.name}`}>
                <RotateCw size={14} strokeWidth={1.5} />
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
