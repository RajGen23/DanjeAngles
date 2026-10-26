import { useCallback, useEffect, useState } from "react";

// Loads data from an admin API call; re-runs when `deps` change. Returns {data, error, loading, reload, setData}.
export function useData(fn, deps, onAuthError) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try { const data = await fn(); setState({ data, error: "", loading: false }); }
    catch (e) { onAuthError?.(e); setState({ data: null, error: e.message || "Couldn’t load this data.", loading: false }); }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run, setData: (d) => setState((s) => ({ ...s, data: typeof d === "function" ? d(s.data) : d })) };
}

export const money = (n, cur = "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: n >= 1000 ? 0 : 2 }).format(n || 0);
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
export const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
