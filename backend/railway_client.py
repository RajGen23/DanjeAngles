"""Railway.app GraphQL + CLI integration.

Exposes a thin async client for the queries/mutations we need:
- me/projects lookup
- create/list/delete Railway projects & services
- read/write env variables
- trigger deployments (via `railway up` CLI) and stream logs
- generate railway.app subdomain + attach custom domains
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any, Optional

import contextvars

import httpx

log = logging.getLogger(__name__)

RAILWAY_URL = os.environ.get("RAILWAY_GRAPHQL_URL", "https://backboard.railway.app/graphql/v2")


def _token() -> str:
    tok = os.environ.get("RAILWAY_TOKEN")
    if not tok:
        raise RuntimeError("RAILWAY_TOKEN not configured")
    return tok


class RailwayError(RuntimeError):
    pass


PROJECT_TOKEN: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "railway_project_token", default=None)


async def _post(headers: dict, query: str, variables: Optional[dict]) -> dict:
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(RAILWAY_URL,
                         headers={**headers, "Content-Type": "application/json"},
                         json={"query": query, "variables": variables or {}})
    if r.status_code >= 400:
        raise RailwayError(f"HTTP {r.status_code}: {r.text[:400]}")
    return r.json()


async def gql(query: str, variables: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """Runs a GraphQL call with the account token, falling back to the
    project-scoped token (set via PROJECT_TOKEN) when the account token is not
    authorized for the target project."""
    attempts = [{"Authorization": f"Bearer {_token()}"}]
    ptok = PROJECT_TOKEN.get()
    if ptok:
        attempts.append({"Project-Access-Token": ptok})
    last: Optional[str] = None
    for headers in attempts:
        body = await _post(headers, query, variables)
        if not body.get("errors"):
            return body["data"]
        last = json.dumps(body["errors"])
        if "Not Authorized" not in last:
            break
    raise RailwayError(last or "unknown Railway error")


# ---------- Projects ----------
async def list_projects() -> list[dict]:
    d = await gql("""
      query { projects { edges { node { id name createdAt
        services { edges { node { id name } } }
        environments { edges { node { id name } } }
      } } } }
    """)
    return [e["node"] for e in d["projects"]["edges"]]


async def get_project(pid: str) -> dict:
    d = await gql("""
      query($id: String!) { project(id: $id) { id name createdAt
        services { edges { node { id name
          serviceInstances { edges { node { latestDeployment { id status } } } }
        } } }
        environments { edges { node { id name } } }
      } }
    """, {"id": pid})
    return d["project"]


async def create_project(name: str) -> dict:
    d = await gql("""
      mutation($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          id name
          environments { edges { node { id name } } }
        }
      }
    """, {"input": {"name": name, "defaultEnvironmentName": "production"}})
    return d["projectCreate"]


async def delete_project(pid: str) -> None:
    await gql("mutation($id: String!) { projectDelete(id: $id) }", {"id": pid})


# ---------- Services ----------
async def create_service(project_id: str, name: str,
                          image: Optional[str] = None) -> dict:
    inp: dict[str, Any] = {"projectId": project_id, "name": name}
    if image:
        inp["source"] = {"image": image}
    d = await gql("""
      mutation($input: ServiceCreateInput!) {
        serviceCreate(input: $input) { id name projectId }
      }
    """, {"input": inp})
    return d["serviceCreate"]


async def delete_service(service_id: str) -> None:
    await gql("mutation($id: String!) { serviceDelete(id: $id) }", {"id": service_id})


async def create_volume(project_id: str, service_id: str, mount_path: str,
                         environment_id: Optional[str] = None) -> dict:
    inp: dict[str, Any] = {
        "projectId": project_id, "serviceId": service_id, "mountPath": mount_path,
    }
    if environment_id:
        inp["environmentId"] = environment_id
    d = await gql("""
      mutation($input: VolumeCreateInput!) {
        volumeCreate(input: $input) { id name }
      }
    """, {"input": inp})
    return d["volumeCreate"]


# ---------- Environment variables ----------
async def upsert_variables(project_id: str, environment_id: str, service_id: str,
                            variables: dict[str, str], replace: bool = False,
                            skip_deploys: bool = True) -> None:
    await gql("""
      mutation($input: VariableCollectionUpsertInput!) { variableCollectionUpsert(input: $input) }
    """, {"input": {
        "projectId": project_id,
        "environmentId": environment_id,
        "serviceId": service_id,
        "variables": variables,
        "replace": replace,
        "skipDeploys": skip_deploys,
    }})


async def delete_variable(project_id: str, environment_id: str, service_id: str, name: str) -> None:
    await gql("""
      mutation($input: VariableDeleteInput!) { variableDelete(input: $input) }
    """, {"input": {
        "projectId": project_id, "environmentId": environment_id,
        "serviceId": service_id, "name": name,
    }})


async def get_variables(project_id: str, environment_id: str, service_id: str) -> dict:
    d = await gql("""
      query($projectId: String!, $environmentId: String!, $serviceId: String!) {
        variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
      }
    """, {"projectId": project_id, "environmentId": environment_id, "serviceId": service_id})
    return d.get("variables") or {}


# ---------- Deployments ----------
async def deploy_service(service_id: str, environment_id: str, commit_sha: Optional[str] = None) -> str:
    args = {"serviceId": service_id, "environmentId": environment_id}
    if commit_sha:
        args["commitSha"] = commit_sha
    d = await gql("""
      mutation($serviceId: String!, $environmentId: String!, $commitSha: String) {
        serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $environmentId, commitSha: $commitSha)
      }
    """, args)
    return d["serviceInstanceDeployV2"]


async def redeploy_service(service_id: str, environment_id: str) -> str:
    d = await gql("""
      mutation($serviceId: String!, $environmentId: String!) {
        serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
      }
    """, {"serviceId": service_id, "environmentId": environment_id})
    return d["serviceInstanceRedeploy"]


async def get_deployment(deployment_id: str) -> dict:
    d = await gql("""
      query($id: String!) {
        deployment(id: $id) {
          id status url staticUrl createdAt canRedeploy
          service { id name }
        }
      }
    """, {"id": deployment_id})
    return d["deployment"]


async def list_service_deployments(service_id: str, environment_id: str, limit: int = 20) -> list[dict]:
    d = await gql("""
      query($input: DeploymentListInput!, $first: Int) {
        deployments(input: $input, first: $first) {
          edges { node { id status url staticUrl createdAt canRedeploy canRollback meta } }
        }
      }
    """, {"input": {"serviceId": service_id, "environmentId": environment_id}, "first": limit})
    return [e["node"] for e in d["deployments"]["edges"]]


async def deployment_rollback(deployment_id: str) -> bool:
    d = await gql("""
      mutation($id: String!) { deploymentRollback(id: $id) }
    """, {"id": deployment_id})
    return bool(d.get("deploymentRollback"))


async def get_build_logs(deployment_id: str, limit: int = 500) -> list[dict]:
    d = await gql("""
      query($deploymentId: String!, $limit: Int) {
        buildLogs(deploymentId: $deploymentId, limit: $limit) {
          timestamp message severity
        }
      }
    """, {"deploymentId": deployment_id, "limit": limit})
    return d.get("buildLogs") or []


async def get_runtime_logs(deployment_id: str, limit: int = 200) -> list[dict]:
    d = await gql("""
      query($deploymentId: String!, $limit: Int) {
        deploymentLogs(deploymentId: $deploymentId, limit: $limit) {
          timestamp message severity
        }
      }
    """, {"deploymentId": deployment_id, "limit": limit})
    return d.get("deploymentLogs") or []


# ---------- Domains ----------
async def create_service_domain(project_id: str, service_id: str, environment_id: str,
                                 target_port: Optional[int] = None) -> dict:
    # NOTE: Railway rejects `projectId` in this input (HTTP 400) — send only svc/env.
    inp: dict[str, Any] = {"serviceId": service_id, "environmentId": environment_id}
    if target_port is not None:
        inp["targetPort"] = target_port
    d = await gql("""
      mutation($input: ServiceDomainCreateInput!) {
        serviceDomainCreate(input: $input) {
          id domain
        }
      }
    """, {"input": inp})
    return d["serviceDomainCreate"]


async def update_service_domain(service_domain_id: str, service_id: str,
                                 environment_id: str, domain: str,
                                 target_port: int) -> bool:
    d = await gql("""
      mutation($input: ServiceDomainUpdateInput!) { serviceDomainUpdate(input: $input) }
    """, {"input": {
        "serviceDomainId": service_domain_id, "serviceId": service_id,
        "environmentId": environment_id, "domain": domain,
        "targetPort": target_port,
    }})
    return bool(d.get("serviceDomainUpdate"))


async def create_custom_domain(project_id: str, service_id: str, environment_id: str,
                                domain: str, target_port: Optional[int] = None) -> dict:
    inp = {"projectId": project_id, "serviceId": service_id,
           "environmentId": environment_id, "domain": domain}
    if target_port is None:
        target_port = 3000
    inp["targetPort"] = target_port
    d = await gql("""
      mutation($input: CustomDomainCreateInput!) {
        customDomainCreate(input: $input) {
          id domain status {
            certificateStatus verified
            dnsRecords { hostlabel recordType requiredValue currentValue status purpose zone fqdn }
          }
        }
      }
    """, {"input": inp})
    return d["customDomainCreate"]


async def get_custom_domain_status(domain_id: str, project_id: str) -> dict:
    d = await gql("""
      query($id: String!, $projectId: String!) {
        customDomain(id: $id, projectId: $projectId) {
          id domain status {
            certificateStatus verified
            dnsRecords { hostlabel recordType requiredValue currentValue status purpose zone fqdn }
          }
        }
      }
    """, {"id": domain_id, "projectId": project_id})
    return d["customDomain"]


async def delete_custom_domain(domain_id: str) -> None:
    await gql("mutation($id: String!) { customDomainDelete(id: $id) }", {"id": domain_id})


# ---------- CLI upload via `railway up` ----------
async def railway_up(source_dir: str, project_id: str, service_id: str,
                     environment_id: str, token: Optional[str] = None) -> tuple[bool, str]:
    """Runs `railway up` in a subprocess. Uses `token` (a project-scoped token)
    when supplied, otherwise falls back to the account token in RAILWAY_TOKEN.
    Streams no logs (uses --detach). Returns (ok, combined_output)."""
    env = os.environ.copy()
    if token:
        # Project-scoped token: the CLI reads it from RAILWAY_TOKEN
        env["RAILWAY_TOKEN"] = token
        env.pop("RAILWAY_API_TOKEN", None)
    else:
        # Account/team token: the CLI reads it from RAILWAY_API_TOKEN only
        env["RAILWAY_API_TOKEN"] = _token()
        env.pop("RAILWAY_TOKEN", None)
        env["RAILWAY_PROJECT_ID"] = project_id
        env["RAILWAY_ENVIRONMENT_ID"] = environment_id
    # Defense-in-depth: ensure the CLI is on PATH regardless of supervisord's inherited env
    env["PATH"] = "/usr/local/bin:/usr/bin:/bin:" + env.get("PATH", "")
    railway_bin = shutil.which("railway", path=env["PATH"]) or "railway"
    cmd = [
        railway_bin, "up", source_dir,
        "--detach", "--ci",
        "--service", service_id,
    ]
    log.info("running: %s", " ".join(cmd))
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=source_dir,
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    try:
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=600)
    except asyncio.TimeoutError:
        proc.kill()
        return False, "Deployment timed out after 10 minutes"
    output = (stdout or b"").decode(errors="replace")
    return proc.returncode == 0, output


def ensure_railway_config(source_dir: Path, framework: str) -> None:
    """Write a railway.json for Nixpacks if not present."""
    cfg = source_dir / "railway.json"
    if cfg.exists():
        return
    build = {"builder": "NIXPACKS"}
    if framework == "static-react":
        # For a pre-built React app served as static
        build["buildCommand"] = "yarn install && yarn build || npm install && npm run build"
    payload = {
        "$schema": "https://railway.com/railway.schema.json",
        "build": build,
        "deploy": {"restartPolicyType": "ON_FAILURE", "restartPolicyMaxRetries": 3},
    }
    cfg.write_text(json.dumps(payload, indent=2))


def detect_framework(source_dir: Path) -> str:
    pkg = source_dir / "package.json"
    req = source_dir / "requirements.txt"
    if pkg.exists() and not req.exists():
        return "node"
    if req.exists() and not pkg.exists():
        return "python"
    if pkg.exists() and req.exists():
        return "fullstack"
    return "unknown"
