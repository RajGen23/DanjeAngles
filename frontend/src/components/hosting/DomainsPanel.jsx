import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Copy, Globe, Lock, Trash2 } from "lucide-react";

const DNS_STYLES = {
  active: "bg-emerald-100 text-emerald-800",
  propagating: "bg-amber-100 text-amber-800",
  pending: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-700",
};

export default function DomainsPanel({ api, projects }) {
  const [domains, setDomains] = useState([]);
  const [hostname, setHostname] = useState("");
  const [projectId, setProjectId] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${api}/domains`);
      setDomains(data);
    } catch (e) { /* silent */ }
  }, [api]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const deployableProjects = projects.filter((p) => p.railway_service_id);

  const add = async () => {
    if (!hostname.trim() || !projectId) {
      toast.error("Pick a project and enter a domain");
      return;
    }
    setAdding(true);
    try {
      const { data } = await axios.post(`${api}/domains`, { hostname: hostname.trim(), project_id: projectId });
      toast.success(`${hostname.trim()} attached — set the DNS record shown below`);
      setHostname("");
      setExpanded(data.id);
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
    } catch { toast.error("Failed to remove domain"); }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
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
        <p className="text-[11px] text-neutral-400 font-mono mt-0.5">managed via Railway</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            data-testid="domain-project-select"
            className="w-full border border-neutral-200 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400]"
          >
            <option value="">Select deployed project…</option>
            {deployableProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
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
              {adding ? "Adding…" : "Attach"}
            </button>
          </div>
        </div>

        {deployableProjects.length === 0 && (
          <p className="text-xs text-neutral-400" data-testid="domains-empty">
            Deploy a project first — then you can attach a custom domain to it.
          </p>
        )}

        <ul className="space-y-2">
          {domains.map((d) => (
            <li key={d.id} className="border border-neutral-200 rounded-sm hover:bg-neutral-50 transition-colors" data-testid={`domain-row-${d.hostname}`}>
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <Globe size={14} strokeWidth={1.5} className="text-neutral-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono truncate">{d.hostname}</div>
                  <div className="text-[11px] text-neutral-400 font-mono truncate">{d.project_name}</div>
                </div>
                {d.ssl && <Lock size={12} strokeWidth={1.5} className="text-emerald-600 shrink-0" title="SSL enabled" />}
                <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${DNS_STYLES[d.dns_status] || DNS_STYLES.pending}`} data-testid={`domain-status-${d.hostname}`}>
                  {d.dns_status}
                </span>
                <button onClick={() => setExpanded(expanded === d.id ? null : d.id)} data-testid={`domain-toggle-${d.hostname}`} className="text-xs text-neutral-400 hover:text-neutral-900">
                  {expanded === d.id ? "hide" : "DNS"}
                </button>
                <button onClick={() => remove(d)} data-testid={`delete-domain-${d.hostname}`} className="text-neutral-400 hover:text-red-600 transition-colors shrink-0">
                  <Trash2 size={13} strokeWidth={1.5} />
                </button>
              </div>
              {expanded === d.id && d.dns_records && d.dns_records.length > 0 && (
                <div className="px-3 pb-3 border-t border-neutral-100 pt-2 space-y-1.5" data-testid={`dns-records-${d.hostname}`}>
                  <p className="text-[11px] text-neutral-500">Add these DNS records at your domain provider (Cloudflare / Namecheap / GoDaddy):</p>
                  {d.dns_records.map((r, i) => (
                    <div key={i} className="bg-neutral-50 border border-neutral-200 rounded-sm p-2 text-[11px] font-mono grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                      <span className="text-neutral-500 font-semibold uppercase">{r.recordType}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate"><span className="text-neutral-400">host:</span> {r.hostlabel || "@"}</span>
                        <span className="truncate"><span className="text-neutral-400">value:</span> {r.requiredValue}</span>
                        {r.currentValue && r.currentValue !== r.requiredValue && (
                          <span className="truncate text-red-600"><span className="text-neutral-400">current:</span> {r.currentValue}</span>
                        )}
                      </div>
                      <button onClick={() => copy(r.requiredValue)} className="text-neutral-400 hover:text-[#FF4400]" title="Copy value">
                        <Copy size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
