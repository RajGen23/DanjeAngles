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
import EnvVarsPanel from "@/components/hosting/EnvVarsPanel";
import DeployHistoryPanel from "@/components/hosting/DeployHistoryPanel";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function App() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [owner, setOwner] = useState(null);
  const [envProject, setEnvProject] = useState(null);
  const [historyProject, setHistoryProject] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [s, p, o] = await Promise.all([
        axios.get(`${API}/stats`),
        axios.get(`${API}/projects`),
        axios.get(`${API}/owner`),
      ]);
      setStats(s.data);
      setProjects(p.data);
      setOwner(o.data);
    } catch (e) {
      console.error("refresh failed", e);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
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
          <div className="flex items-center gap-3 text-xs text-neutral-500 font-mono">
            {owner?.email && <span className="hidden sm:inline">{owner.email}</span>}
            <span className={`flex items-center gap-1.5 ${owner?.connected ? "text-neutral-500" : "text-red-500"}`} data-testid="railway-status">
              <span className={`w-1.5 h-1.5 rounded-full ${owner?.connected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
              {owner?.connected ? "Railway · connected" : "Railway · offline"}
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6" data-testid="dashboard-main">
        <div>
          <h1 className="font-heading text-3xl font-light tracking-tight">Hosting Overview</h1>
          <p className="text-sm text-neutral-500 mt-1">Deploy your Emergent apps to Railway with real URLs, env vars, and custom domains.</p>
        </div>

        <StatsCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ProjectsList projects={projects} api={API} onChange={refresh} onOpenEnv={setEnvProject} onOpenHistory={setHistoryProject} />
            <DeployPanel api={API} onDeployed={refresh} projects={projects} />
          </div>
          <div className="space-y-6">
            <DomainsPanel api={API} projects={projects} />
            <ResourceCharts api={API} />
          </div>
        </div>
      </main>

      {envProject && <EnvVarsPanel api={API} project={envProject} onClose={() => setEnvProject(null)} />}
      {historyProject && <DeployHistoryPanel api={API} project={historyProject} onClose={() => setHistoryProject(null)} />}
    </div>
  );
}

export default App;
