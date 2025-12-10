// client/src/api/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:4000/api",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Debug
console.log("🔥 API LOADED →", api.defaults.baseURL);

// ========================================================
// 🔥 FIXED TOKEN PRIORITY (ADMIN → PROVIDER → AGENT → ME)
// ========================================================
api.interceptors.request.use((config) => {
  const skipAuth =
    config.url.includes("forgot-password") ||
    config.url.includes("reset-password");

  if (!skipAuth) {
    const adminToken = localStorage.getItem("adminToken");
    const providerToken = localStorage.getItem("providerToken");
    const agentToken = localStorage.getItem("agentToken");
    const meToken = localStorage.getItem("meToken");

    const finalToken =
      adminToken ||
      providerToken ||
      agentToken ||
      meToken ||
      null;

    if (finalToken) {
      config.headers.Authorization = `Bearer ${finalToken}`;
    }
  }

  return config;
});

export default api;
