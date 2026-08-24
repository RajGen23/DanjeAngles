import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Cloud, Rocket, Server, Zap } from "lucide-react";

const Row = ({ icon: Icon, label, value, sub, testId }) => (
  <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0 border-b border-neutral-100 last:border-b-0" data-testid={testId}>
    <div className="flex items-center gap-2.5">
      <Icon size={14} strokeWidth={1.5} className="text-neutral-400" />
      <span className="text-xs uppercase tracking-wider text-neutral-500">{label}</span>
    </div>
    <div className="text-right">
      <div className="font-heading text-lg font-light tracking-tight leading-none">{value}</div>
      {sub && <div className="text-[11px] text-neutral-400 mt-0.5">{sub}</div>}
    </div>
  </div>
);

export default function ResourceCharts({ api }) {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${api}/resources`);
      setData(data);
    } catch (e) { /* silent */ }
  }, [api]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.35 }}
      className="bg-white border border-neutral-200 rounded-sm"
      data-testid="resources-panel"
    >
      <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold tracking-tight">Infrastructure</h2>
        <span className="text-xs text-neutral-400 font-mono flex items-center gap-1.5">
          <Cloud size={11} strokeWidth={1.75} /> Railway
        </span>
      </div>
      <div className="px-6 py-4">
        <Row icon={Zap} label="Active Services" value={data ? data.services_active : "—"} sub={data ? `${data.services_total} total` : ""} testId="res-active" />
        <Row icon={Rocket} label="Deploys Today" value={data ? data.deploys_today : "—"} testId="res-deploys-today" />
        <Row icon={Server} label="Provider" value={data?.provider || "—"} sub="us-east / global edge" testId="res-provider" />
      </div>
    </motion.section>
  );
}
