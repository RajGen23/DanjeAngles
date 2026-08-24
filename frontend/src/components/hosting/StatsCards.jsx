import { motion } from "framer-motion";
import { Activity, HardDrive, Rocket, Zap } from "lucide-react";

const Card = ({ icon: Icon, label, value, sub, delay, testId }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay }}
    className="bg-white border border-neutral-200 rounded-sm p-6"
    data-testid={testId}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wider text-neutral-500">{label}</span>
      <Icon size={16} strokeWidth={1.5} className="text-neutral-400" />
    </div>
    <div className="mt-3 font-heading text-3xl font-light tracking-tight">{value}</div>
    <div className="mt-1 text-xs text-neutral-500">{sub}</div>
  </motion.div>
);

export default function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="stats-grid">
      <Card icon={Zap} label="Apps Running" value={stats ? stats.apps_running : "—"} sub={stats ? `of ${stats.total_projects} projects` : ""} delay={0} testId="stat-apps-running" />
      <Card icon={Rocket} label="Deployments" value={stats ? stats.total_deployments : "—"} sub="all time" delay={0.05} testId="stat-deployments" />
      <Card icon={Activity} label="Uptime" value={stats ? `${stats.uptime_pct}%` : "—"} sub="Railway SLA" delay={0.1} testId="stat-uptime" />
      <Card icon={HardDrive} label="Storage" value={stats ? `${stats.storage_mb} MB` : "—"} sub="uploaded archives" delay={0.15} testId="stat-storage" />
    </div>
  );
}
