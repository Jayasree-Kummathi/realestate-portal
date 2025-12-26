// src/utils/fixMediaUrl.js
const BACKEND_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000";

export function fixMediaUrl(url) {
  if (!url) return "";

  // Already absolute
  if (url.startsWith("http")) return url;

  // Ensure single slash
  const clean = url.startsWith("/") ? url : `/${url}`;

  return `${BACKEND_URL}${clean}`;
}
