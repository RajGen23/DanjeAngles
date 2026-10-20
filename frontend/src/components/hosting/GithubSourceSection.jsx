import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { GitBranch } from "lucide-react";

const inputCls = "w-full border border-neutral-200 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4400] bg-white";

export const GithubSourceSection = ({ api, project, onChange }) => {
  const [repos, setRepos] = useState([]);
  const [repo, setRepo] = useState(project.github_source_repo || "");
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState(project.github_source_branch || "");
  const [folder, setFolder] = useState(project.github_source_folder || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${api}/github/repos`).then(({ data }) => setRepos(data.repos)).catch(() => {});
  }, [api]);

  const loadBranches = useCallback(async (value) => {
    if (!value.includes("/")) return setBranches([]);
    try {
      const { data } = await axios.get(`${api}/github/branches`, { params: { repo: value } });
      setBranches(data.branches);
      setBranch((b) => b || data.branches[0] || "");
    } catch { setBranches([]); }
  }, [api]);

  useEffect(() => {
    if (project.github_source_repo) loadBranches(project.github_source_repo);
  }, [project.github_source_repo, loadBranches]);

  const save = async () => {
    if (!repo.trim()) return toast.error("Pick or paste a repo first");
    setSaving(true);
    try {
      const { data } = await axios.post(`${api}/projects/${project.id}/github-source`, { repo, branch, folder });
      setBranch(data.branch);
      toast.success(`GitHub source saved: ${data.repo}@${data.branch}`);
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  };

  const clear = async () => {
    await axios.delete(`${api}/projects/${project.id}/github-source`);
    setRepo(""); setBranch(""); setFolder(""); setBranches([]);
    toast.success("GitHub source removed");
    onChange();
  };

  return (
    <div data-testid="github-source-section">
      <div className="flex items-center gap-2 mb-2">
        <GitBranch size={13} strokeWidth={1.75} className="text-neutral-400" />
        <span className="text-xs uppercase tracking-wider text-neutral-500">GitHub source</span>
        {project.github_source_repo && <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5" data-testid="github-source-connected">connected</span>}
      </div>
      <p className="text-[11px] text-neutral-500 leading-relaxed mb-2">
        Deploy straight from a GitHub repo. Public or private (any repo the panel&apos;s GitHub token can see). Use the GitHub button on the project row to fetch &amp; deploy.
      </p>
      <div className="space-y-2">
        <input list={`gh-repos-${project.id}`} value={repo} placeholder="owner/repo or https://github.com/owner/repo"
          onChange={(e) => setRepo(e.target.value)} onBlur={() => loadBranches(repo.trim())}
          data-testid="github-source-repo-input" className={inputCls} />
        <datalist id={`gh-repos-${project.id}`}>
          {repos.map((r) => <option key={r.full_name} value={r.full_name}>{r.private ? "private" : "public"}</option>)}
        </datalist>
        <input list={`gh-branches-${project.id}`} value={branch} placeholder="branch (blank = default branch)"
          onChange={(e) => setBranch(e.target.value)} data-testid="github-source-branch-input" className={inputCls} />
        <datalist id={`gh-branches-${project.id}`}>
          {branches.map((b) => <option key={b} value={b} />)}
        </datalist>
        <input value={folder} onChange={(e) => setFolder(e.target.value)}
          placeholder="folder (backend / frontend, blank = whole repo)"
          data-testid="github-source-folder-input" className={inputCls} />
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} data-testid="save-github-source-btn"
            className="flex-1 px-3 py-2 bg-neutral-900 hover:bg-neutral-700 text-white text-sm rounded-sm disabled:opacity-50 transition-colors">
            {saving ? "Checking repo…" : "Save GitHub source"}
          </button>
          {project.github_source_repo && (
            <button onClick={clear} data-testid="clear-github-source-btn"
              className="px-3 py-2 border border-neutral-200 text-neutral-600 hover:bg-neutral-100 text-sm rounded-sm transition-colors">
              Remove
            </button>
          )}
        </div>
        {project.github_source_last_sha && (
          <p className="text-[11px] font-mono text-neutral-400" data-testid="github-source-last-sha">last fetched commit {project.github_source_last_sha}</p>
        )}
      </div>
    </div>
  );
};
