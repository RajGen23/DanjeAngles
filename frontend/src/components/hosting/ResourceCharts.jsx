import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const CHARTS = [
  { key: "cpu", label: "CPU", color: "#FF4400", nowKey: "cpu_now" },
  { key: "ram", label: "Memory", color: "#171717", nowKey: "ram_now" },
  { key: "disk", label: "Disk", color: "#3B82F6", nowKey: "disk_now" },
];

export default function ResourceCharts({ api }) {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${api}/resources`);
      setData(data);
    } catch (e) {
      console.error(e);
    }
  }, [api]);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
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
        <h2 className="font-heading text-base font-semibold tracking-tight">Server Resources</h2>
        <span className="text-xs text-neutral-400 font-mono">vps-01 · last 2h · refreshes live</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-100">
        {CHARTS.map((c) => (
          <div key={c.key} className="p-6" data-testid={`chart-${c.key}`}>
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-neutral-500">{c.label}</span>
              <span className="font-heading text-xl font-light" data-testid={`${c.key}-now`}>
                {data ? `${data[c.nowKey]}%` : "—"}
              </span>
            </div>
            <div className="h-[120px]">
              {data && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`g-${c.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c.color} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={c.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="t" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip
                      contentStyle={{ border: "1px solid #E5E5E5", borderRadius: 4, fontSize: 12, boxShadow: "none" }}
                      formatter={(v) => [`${v}%`, c.label]}
                    />
                    <Area type="monotone" dataKey={c.key} stroke={c.color} strokeWidth={1.5} fill={`url(#g-${c.key})`} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
