import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { FileArchive, UploadCloud } from "lucide-react";

const LEVEL_COLOR = { ok: "text-emerald-400", info: "text-neutral-300", error: "text-red-400" };

export default function DeployPanel({ api, onDeployed, projects }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [deployment, setDeployment] = useState(null);
  const [deploying, setDeploying] = useState(false);
  const inputRef = useRef(null);
  const logEndRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [deployment?.logs?.length]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const pickFile = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".zip")) {
      toast.error("Only .zip archives are supported");
      return;
    }
    setFile(f);
    if (!name && !projectId) setName(f.name.replace(/\.zip$/i, "").toLowerCase().replace(/[^a-z0-9-]/g, "-"));
  };

  const startPolling = (did) => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await axios.get(`${api}/deployments/${did}`);
        setDeployment(data);
        if (data.status === "live" || data.status === "failed") {
          clearInterval(pollRef.current);
          setDeploying(false);
          if (data.status === "live") toast.success("Deployment is live on Railway!");
          else toast.error("Deployment failed — check logs");
          onDeployed();
        }
      } catch {
        clearInterval(pollRef.current);
        setDeploying(false);
      }
    }, 1200);
  };

  const deploy = async () => {
    const isRedeploy = !!projectId;
    if (!file) return toast.error("Select a .zip file");
    if (!isRedeploy && !name.trim()) return toast.error("Enter an app name (or select an existing project)");
    setDeploying(true);
    setDeployment(null);
    const form = new FormData();
    form.append("file", file);
    if (isRedeploy) {
      const p = projects.find((x) => x.id === projectId);
      form.append("name", p ? p.name : "app");
      form.append("project_id", projectId);
    } else {
      form.append("name", name.trim());
    }
    try {
      const { data } = await axios.post(`${api}/deploy`, form);
      startPolling(data.deployment_id);
      onDeployed();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Deploy failed");
      setDeploying(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.25 }}
      className="bg-white border border-neutral-200 rounded-sm"
      data-testid="deploy-panel"
    >
      <div className="px-6 py-4 border-b border-neutral-200">
        <h2 className="font-heading text-base font-semibold tracking-tight">Deploy New Version</h2>
        <p className="text-[11px] text-neutral-400 font-mono mt-0.5">real build · pushed to Railway · live URL when complete</p>
      </div>
      <div className="p-6 space-y-4">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); }}
          data-testid="upload-zone"
          className={`cursor-pointer border border-dashed rounded-sm min-h-[140px] flex flex-col items-center justify-center gap-2 transition-colors ${
            dragOver ? "border-[#FF4400] bg-orange-50" : "border-neutral-300 bg-neutral-50 hover:bg-neutral-100"
          }`}
        >
          <input ref={inputRef} type="file" accept=".zip" className="hidden" data-testid="file-input" onChange={(e) => pickFile(e.target.files[0])} />
          {file ? (
            <>
              <FileArchive size={22} strokeWidth={1.5} className="text-[#FF4400]" />
              <span className="text-sm font-medium" data-testid="selected-file-name">{file.name}</span>
              <span className="text-xs text-neutral-500">{(file.size / 1024 / 1024).toFixed(2)} MB — click to change</span>
            </>
          ) : (
            <>
              <UploadCloud size={22} strokeWidth={1.5} className="text-neutral-400" />
              <span className="text-sm text-neutral-600">Drop your Emergent app export (.zip) here</span>
              <span className="text-xs text-neutral-400">or click to browse — max 250 MB</span>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); if (e.target.value) setName(""); }}
            data-testid="deploy-project-select"
            className="border border-neutral-200 rounded-sm px-3 py-2 text-sm bg-white font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400]"
          >
            <option value="">— New project —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>Update: {p.name}</option>
            ))}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="new-app-name"
            disabled={!!projectId}
            data-testid="app-name-input"
            className="border border-neutral-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400] bg-white disabled:bg-neutral-100"
          />
        </div>

        <button
          onClick={deploy}
          disabled={deploying}
          data-testid="deploy-button"
          className="w-full px-5 py-2.5 bg-[#FF4400] hover:bg-[#E63D00] text-white text-sm font-medium rounded-sm disabled:opacity-50 transition-colors"
        >
          {deploying ? "Deploying to Railway…" : projectId ? "Push New Version" : "Deploy New App"}
        </button>

        {deployment && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span className="font-mono">deploy · {deployment.project_name}</span>
              <span className="font-mono" data-testid="deploy-progress">{deployment.progress}%</span>
            </div>
            <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#FF4400] transition-[width] duration-500" style={{ width: `${deployment.progress}%` }} />
            </div>
            <div className="bg-[#0A0A0A] rounded-sm p-4 font-mono text-xs h-[280px] overflow-y-auto" data-testid="deploy-logs">
              {deployment.logs.map((l, i) => (
                <div key={i} className="flex gap-2 leading-relaxed">
                  <span className="text-neutral-600 shrink-0">{new Date(l.ts).toLocaleTimeString()}</span>
                  <span className={LEVEL_COLOR[l.level] || "text-neutral-300"}>{l.msg}</span>
                </div>
              ))}
              {deployment.status === "building" && <span className="text-emerald-400 animate-pulse">▊</span>}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
