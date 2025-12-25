// src/utils/fixMediaUrl.js
const BACKEND_URL =
  import.meta.env.VITE_SERVER_URL?.replace(/\/api$/, "") ||
  "https://realestate-portal-1-wm4q.onrender.com";

export function fixMediaUrl(url) {
  if (!url) return "";

  // Replace old localhost URLs
  if (url.includes("localhost:4000")) {
    return url.replace("http://localhost:4000", BACKEND_URL);
  }

  // Relative path → absolute
  if (url.startsWith("/")) {
    return `${BACKEND_URL}${url}`;
  }

  return url;
}
