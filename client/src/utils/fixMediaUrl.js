// src/utils/fixMediaUrl.js

const BACKEND_URL =
  import.meta.env.VITE_API_URL ||
  "https://realestate-portal-1-wm4q.onrender.com";

export function fixMediaUrl(path) {
  if (!path) return "";

  // If already absolute (Cloudinary / external / Render)
  if (path.startsWith("http://") || path.startsWith("https://")) {
    // 🔥 Strip localhost if accidentally saved
    if (path.includes("localhost:4000")) {
      return path.replace("http://localhost:4000", BACKEND_URL);
    }
    return path;
  }

  // Ensure leading slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${BACKEND_URL}${cleanPath}`;
}
