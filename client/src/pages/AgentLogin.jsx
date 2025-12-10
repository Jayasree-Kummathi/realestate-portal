import React, { useState } from "react";
import api from "../api/api";
import { useNavigate, Link } from "react-router-dom";

export default function AgentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await api.post("/agents/login", { email, password });

      // Remove old tokens
      localStorage.removeItem("token");
      localStorage.removeItem("providerToken");
      localStorage.removeItem("adminToken");

      // Save agent token
      localStorage.setItem("agentToken", res.data.token);

      // Save user info
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...res.data.agent,
          isAgent: true,
          isAdmin: false,
          isService: false,
        })
      );

      setLoading(false);
      nav("/agent-dashboard");
    } catch (err) {
      setMsg("❌ " + (err.response?.data?.error || "Login failed"));
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes pop {
            0% { transform: scale(0.97); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
          }

          .action-link {
            color: #ffcc00;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
          }

          .action-link:hover {
            text-decoration: underline;
            text-shadow: 0 0 6px rgba(255, 204, 0, 0.6);
          }

          @media(max-width: 600px) {
            .loginCard {
              width: 90% !important;
            }
          }
        `}
      </style>

      <div className="loginCard" style={styles.card}>
        <h2 style={styles.title}>Property Dealer Login</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* EMAIL */}
          <div style={styles.inputGroup}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
            <label style={styles.label}>Email</label>
          </div>

          {/* PASSWORD */}
          <div style={styles.inputGroup}>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
            <label style={styles.label}>Password</label>
          </div>

          <button disabled={loading} style={styles.button}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* ✅ Forgot / Register Links */}
        <div style={styles.actionLinks}>
          <Link to="/agent-forgot-password" className="action-link">
            Forgot Password?
          </Link>

          <Link to="/agent-register" className="action-link">
            New Registration
          </Link>
        </div>

        {msg && <p style={styles.error}>{msg}</p>}
      </div>
    </div>
  );
}

/* ===================== STYLES ===================== */
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #0c1b33, #1f3a93, #6a89cc)",
    padding: 20,
  },

  card: {
    width: 400,
    padding: "35px 30px",
    borderRadius: 20,
    background: "rgba(255, 255, 255, 0.15)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
    color: "#fff",
    animation: "fadeIn 0.9s ease-out",
  },

  title: {
    textAlign: "center",
    marginBottom: 25,
    fontSize: 28,
    fontWeight: 800,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 22,
  },

  inputGroup: {
    position: "relative",
  },

  label: {
    position: "absolute",
    left: 15,
    top: 12,
    color: "#ddd",
    fontSize: 15,
    pointerEvents: "none",
  },

  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 10,
    border: "none",
    outline: "none",
    fontSize: 16,
    color: "#fff",
    background: "rgba(255,255,255,0.12)",
  },

  button: {
    background: "linear-gradient(90deg, #ffcc00, #ff9900)",
    border: "none",
    padding: "14px 20px",
    borderRadius: 12,
    color: "#222",
    fontWeight: 800,
    fontSize: 16,
    cursor: "pointer",
    marginTop: 10,
    animation: "pop 0.4s ease",
  },

  actionLinks: {
    marginTop: 18,
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
  },

  error: {
    marginTop: 15,
    color: "white",
    background: "rgba(255,0,0,0.25)",
    padding: "8px 12px",
    borderRadius: 10,
    textAlign: "center",
    fontWeight: 600,
  },
};
