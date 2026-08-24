import { useCallback, useEffect, useState } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster } from "sonner";
import { Server } from "lucide-react";
import StatsCards from "@/components/hosting/StatsCards";
import ProjectsList from "@/components/hosting/ProjectsList";
import DeployPanel from "@/components/hosting/DeployPanel";
import ResourceCharts from "@/components/hosting/ResourceCharts";
import DomainsPanel from "@/components/hosting/DomainsPanel";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function App() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([
        axios.get(`${API}/stats`),
        axios.get(`${API}/projects`),
      ]);
      setStats(s.data);
      setProjects(p.data);
    } catch (e) {
      console.error("refresh failed", e);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-neutral-900 noise-bg">
      <Toaster position="bottom-right" richColors />
      <nav className="sticky top-0 z-50 bg-white border-b border-neutral-200" data-testid="top-nav">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#FF4400] rounded-sm flex items-center justify-center">
              <Server size={15} strokeWidth={1.75} className="text-white" />
            </div>
            <span className="font-heading font-bold tracking-tight text-[15px]">selfhost</span>
            <span className="text-neutral-400 text-[15px] font-light">/ control panel</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            vps-01 · online
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6" data-testid="dashboard-main">
        <div>
          <h1 className="font-heading text-3xl font-light tracking-tight">Hosting Overview</h1>
          <p className="text-sm text-neutral-500 mt-1">Deploy and manage your Emergent apps on your own server.</p>
        </div>

        <StatsCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ProjectsList projects={projects} api={API} onChange={refresh} />
            <DeployPanel api={API} onDeployed={refresh} />
          </div>
          <div className="space-y-6">
            <DomainsPanel api={API} projects={projects} />
          </div>
        </div>

        <ResourceCharts api={API} />
      </main>
    </div>
  );
}

export default App;
