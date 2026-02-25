/**
 * Backend API base URL.
 * Empty string = use relative URLs (browser same-origin; nginx proxies /api to backend - used in Docker).
 * Otherwise uses explicit URL (e.g. http://localhost:5000 for local dev).
 */
const raw = process.env.REACT_APP_BACKEND_URL;
export const BACKEND_API_BASE =
  raw === '' || raw === '/' ? '' : (raw || 'http://localhost:5000');
