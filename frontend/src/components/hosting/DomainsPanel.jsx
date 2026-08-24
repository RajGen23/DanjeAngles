import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Globe, Lock, Trash2 } from "lucide-react";

const DNS_STYLES = {
  active: "bg-emerald-100 text-emerald-800",
  propagating: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-700",
};

export default function DomainsPanel({ api }) {
  const [domains, setDomains] = useState([]);
  const [hostname, setHostname] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${api}/domains`);
      setDomains(data);
    } catch (e) {
      console.error(e);
    }
  }, [api]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const add = async () => {
    if (!hostname.trim()) return;
    setAdding(true);
    try {
      await axios.post(`${api}/domains`, { hostname: hostname.trim() });
      toast.success(`${hostname.trim()} added — DNS propagating`);
      setHostname("");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to add domain");
    } finally {
      setAdding(false);
    }
  };

  const remove = async (d) => {
    try {
      await axios.delete(`${api}/domains/${d.id}`);
      toast.success(`${d.hostname} removed`);
      load();
    } catch {
      toast.error("Failed to remove domain");
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.3 }}
      className="bg-white border border-neutral-200 rounded-sm"
      data-testid="domains-panel"
    >
      <div className="px-6 py-4 border-b border-neutral-200">
        <h2 className="font-heading text-base font-semibold tracking-tight">Custom Domains</h2>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex gap-2">
          <input
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="app.yourdomain.com"
            data-testid="domain-input"
            className="flex-1 border border-neutral-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400] bg-white"
          />
          <button
            onClick={add}
            disabled={adding}
            data-testid="add-domain-button"
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-700 text-white text-sm rounded-sm disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </div>

        {domains.length === 0 && (
          <p className="text-xs text-neutral-400" data-testid="domains-empty">No custom domains yet. Point an A record to 203.0.113.10 then add it here.</p>
        )}

        <ul className="space-y-2">
          {domains.map((d) => (
            <li key={d.id} className="flex items-center gap-2.5 border border-neutral-200 rounded-sm px-3 py-2.5 hover:bg-neutral-50 transition-colors" data-testid={`domain-row-${d.hostname}`}>
              <Globe size={14} strokeWidth={1.5} className="text-neutral-400 shrink-0" />
              <span className="text-sm font-mono truncate flex-1">{d.hostname}</span>
              {d.ssl && <Lock size={12} strokeWidth={1.5} className="text-emerald-600 shrink-0" title="SSL enabled" />}
              <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${DNS_STYLES[d.dns_status]}`} data-testid={`domain-status-${d.hostname}`}>
                {d.dns_status}
              </span>
              <button onClick={() => remove(d)} data-testid={`delete-domain-${d.hostname}`} className="text-neutral-400 hover:text-red-600 transition-colors shrink-0">
                <Trash2 size={13} strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
