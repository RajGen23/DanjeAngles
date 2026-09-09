import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const api = axios.create({ baseURL: `${BACKEND_URL}/api`, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('viara_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<void> | null = null;
api.interceptors.response.use(undefined, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && !original._retried && !original.url.includes('/auth/')) {
    original._retried = true;
    try {
      refreshing = refreshing || api.post('/auth/refresh').then((r) => {
        if (r.data?.access_token) localStorage.setItem('viara_token', r.data.access_token);
      });
      await refreshing;
      refreshing = null;
      return api(original);
    } catch {
      refreshing = null;
    }
  }
  return Promise.reject(error);
});

export function apiErr(e: any): string {
  const d = e?.response?.data?.detail;
  if (d == null) return e?.message || 'Something went wrong. Please try again.';
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => (x && typeof x.msg === 'string' ? x.msg : JSON.stringify(x))).join(' ');
  if (typeof d.msg === 'string') return d.msg;
  return String(d);
}

export const euro = (n: number) => `€${Math.round(n) === n ? n : n.toFixed(2)}`;
export const fmtDur = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}`;
let dateLocale = 'en-GB';
export const setDateLocale = (l: string) => { dateLocale = l; };
export const fmtDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' });
};
