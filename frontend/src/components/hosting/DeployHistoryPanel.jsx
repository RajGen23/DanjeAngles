import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, ExternalLink, History, RotateCcw, X, XCircle } from "lucide-react";

const STATUS_STYLES = {
  SUCCESS: "bg-emerald-100 text-emerald-800",
  BUILDING: "bg-amber-100 text-amber-800",
  DEPLOYING: "bg-amber-100 text-amber-800",
  QUEUED: "bg-neutral-100 text-neutral-600",
  INITIALIZING: "bg-neutral-100 text-neutral-600",
  WAITING: "bg-neutral-100 text-neutral-600",
  FAILED: "bg-red-100 text-red-700",
  CRASHED: "bg-red-100 text-red-700",
  REMOVED: "bg-neutral-100 text-neutral-400",
  SKIPPED: "bg-neutral-100 text-neutral-400",
};

const IconFor = ({ status }) => {
  const s = (status || "").toUpperCase();
  if (s === "SUCCESS") return <CheckCircle2 size={13} strokeWidth={1.75} className="text-emerald-600" />;
  if (["FAILED", "CRASHED"].includes(s)) return <XCircle size={13} strokeWidth={1.75} className="text-red-600" />;
  return <Clock size={13} strokeWidth={1.75} className="text-amber-500" />;
};

export default function DeployHistoryPanel({ api, project, onClose }) {
  const [deps, setDeps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${api}/projects/${project.id}/deployments`);
      setDeps(data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [api, project]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const rollback = async (d) => {
    if (!window.confirm(`Roll back ${project.name} to the deployment from ${new Date(d.createdAt).toLocaleString()}? Your current version will be replaced.`)) return;
    setBusy(d.id);
    try {
      await axios.post(`${api}/deployments/${d.id}/rollback`);
      toast.success("Rollback started — Railway is switching versions");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Rollback failed");
    } finally {
      setBusy(null);
    }
  };

  if (!project) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4"
        data-testid="history-modal"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-neutral-200 rounded-sm w-full max-w-2xl max-h-[85vh] flex flex-col"
        >
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <History size={16} strokeWidth={1.5} className="text-neutral-400" />
              <div>
                <h2 className="font-heading text-base font-semibold tracking-tight">Deploy History</h2>
                <p className="text-xs text-neutral-500 mt-0.5 font-mono">{project.name}</p>
              </div>
            </div>
            <button onClick={onClose} data-testid="history-close" className="text-neutral-400 hover:text-neutral-900 transition-colors">
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>

          <div className="p-6 space-y-2 overflow-y-auto">
            {loading && deps.length === 0 && <p className="text-xs text-neutral-400 font-mono">loading…</p>}
            {!loading && deps.length === 0 && (
              <div className="border border-dashed border-neutral-200 rounded-sm py-10 text-center" data-testid="history-empty">
                <History size={20} strokeWidth={1.5} className="text-neutral-300 mx-auto" />
                <p className="text-sm text-neutral-500 mt-2">No deployment history yet</p>
              </div>
            )}
            <ul className="space-y-1.5">
              {deps.map((d, idx) => {
                const s = (d.status || "").toUpperCase();
                const isCurrent = idx === 0 && s === "SUCCESS";
                return (
                  <li
                    key={d.id}
                    className={`border rounded-sm px-3 py-2.5 transition-colors ${isCurrent ? "border-[#FF4400] bg-orange-50/40" : "border-neutral-200 hover:bg-neutral-50"}`}
                    data-testid={`history-row-${d.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <IconFor status={s} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLES[s] || STATUS_STYLES.QUEUED}`}>{s.toLowerCase() || "pending"}</span>
                          {isCurrent && <span className="text-[10px] uppercase tracking-wider text-[#FF4400] font-medium">current</span>}
                          <span className="text-[11px] text-neutral-400 font-mono">{new Date(d.createdAt).toLocaleString()}</span>
                        </div>
                        {(d.url || d.staticUrl) && (
                          <a
                            href={`https://${(d.url || d.staticUrl).replace(/^https?:\/\//, "")}`}
                            target="_blank" rel="noreferrer"
                            className="text-[11px] text-neutral-500 font-mono flex items-center gap-1 mt-0.5 hover:text-[#FF4400] truncate"
                          >
                            {(d.url || d.staticUrl).replace(/^https?:\/\//, "")} <ExternalLink size={9} strokeWidth={1.75} />
                          </a>
                        )}
                      </div>
                      {!isCurrent && s === "SUCCESS" && d.canRollback !== false && (
                        <button
                          onClick={() => rollback(d)}
                          disabled={busy === d.id}
                          data-testid={`rollback-${d.id}`}
                          className="text-xs px-2.5 py-1 border border-neutral-200 rounded-sm hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          <RotateCcw size={11} strokeWidth={1.75} />
                          {busy === d.id ? "Rolling back…" : "Rollback"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
