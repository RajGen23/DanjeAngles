import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, KeyRound, Plus, Trash2, X } from "lucide-react";

export default function EnvVarsPanel({ api, project, onClose }) {
  const [vars, setVars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [k, setK] = useState("");
  const [v, setV] = useState("");
  const [reveal, setReveal] = useState({});

  const load = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${api}/projects/${project.id}/env`);
      setVars(data);
    } catch (e) {
      toast.error("Failed to load env vars");
    } finally {
      setLoading(false);
    }
  }, [api, project]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!k.trim() || !v.trim()) return toast.error("Key and value required");
    try {
      await axios.post(`${api}/projects/${project.id}/env`, { key: k.trim(), value: v });
      toast.success(`${k} saved`);
      setK(""); setV("");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    }
  };

  const remove = async (key) => {
    try {
      await axios.delete(`${api}/projects/${project.id}/env/${encodeURIComponent(key)}`);
      toast.success(`${key} removed`);
      load();
    } catch {
      toast.error("Delete failed");
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
        data-testid="env-modal"
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
            <div>
              <h2 className="font-heading text-base font-semibold tracking-tight">Environment Variables</h2>
              <p className="text-xs text-neutral-500 mt-0.5 font-mono">{project.name}</p>
            </div>
            <button onClick={onClose} data-testid="env-close" className="text-neutral-400 hover:text-neutral-900 transition-colors">
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="flex gap-2 items-start">
              <input
                value={k}
                onChange={(e) => setK(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
                placeholder="VARIABLE_NAME"
                data-testid="env-key-input"
                className="w-52 border border-neutral-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400] bg-white"
              />
              <input
                value={v}
                onChange={(e) => setV(e.target.value)}
                placeholder="value"
                onKeyDown={(e) => e.key === "Enter" && add()}
                data-testid="env-value-input"
                className="flex-1 border border-neutral-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400] bg-white"
              />
              <button
                onClick={add}
                data-testid="env-add-btn"
                className="px-3 py-2 bg-[#FF4400] hover:bg-[#E63D00] text-white text-sm rounded-sm transition-colors flex items-center gap-1"
              >
                <Plus size={14} strokeWidth={1.75} /> Add
              </button>
            </div>

            {loading && <p className="text-xs text-neutral-400 font-mono">loading…</p>}
            {!loading && vars.length === 0 && (
              <div className="border border-dashed border-neutral-200 rounded-sm py-10 text-center" data-testid="env-empty">
                <KeyRound size={20} strokeWidth={1.5} className="text-neutral-300 mx-auto" />
                <p className="text-sm text-neutral-500 mt-2">No environment variables yet</p>
                <p className="text-xs text-neutral-400 mt-1">Add REACT_APP_BACKEND_URL, MONGO_URL, API_KEY, etc.</p>
              </div>
            )}

            <ul className="space-y-1.5">
              {vars.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center gap-2 border border-neutral-200 rounded-sm px-3 py-2 hover:bg-neutral-50 group"
                  data-testid={`env-row-${row.key}`}
                >
                  <span className="font-mono text-sm font-medium text-neutral-900 w-52 truncate">{row.key}</span>
                  <span className="text-neutral-300">=</span>
                  <span className="flex-1 font-mono text-sm text-neutral-600 truncate">
                    {reveal[row.key] ? row.value : "•".repeat(Math.min(row.value.length, 24))}
                  </span>
                  <button
                    onClick={() => setReveal((r) => ({ ...r, [row.key]: !r[row.key] }))}
                    data-testid={`env-reveal-${row.key}`}
                    className="text-neutral-400 hover:text-neutral-900 transition-colors"
                  >
                    {reveal[row.key] ? <EyeOff size={13} strokeWidth={1.5} /> : <Eye size={13} strokeWidth={1.5} />}
                  </button>
                  <button
                    onClick={() => remove(row.key)}
                    data-testid={`env-delete-${row.key}`}
                    className="text-neutral-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </li>
              ))}
            </ul>

            {vars.length > 0 && (
              <p className="text-[11px] text-neutral-400 font-mono pt-2">
                Changes take effect on next deploy. Source: <span className="text-emerald-600">{vars[0]?.source || "local"}</span>
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
