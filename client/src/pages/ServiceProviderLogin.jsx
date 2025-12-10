import React, { useState } from "react";
import { ServiceProviderAPI } from "../api/apiService";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

export default function ServiceProviderLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // login | forgot

  const nav = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const { data } = await ServiceProviderAPI.login({ email, password });

      localStorage.setItem("providerToken", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...data.provider,
          isService: true,
          isAgent: false,
          isAdmin: false,
        })
      );

      setMsg("✔ Login successful!");
      setTimeout(() => nav("/service-home"), 700);
    } catch (err) {
      setMsg("❌ " + (err.response?.data?.error || "Login failed"));
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMsg("❌ Please enter your email address");
      return;
    }

    setMsg("");
    setLoading(true);
    
    try {
      await ServiceProviderAPI.forgotPassword({ email });
      setMsg("✅ Password reset link sent to your email");
    } catch (err) {
      setMsg("❌ " + (err.response?.data?.error || "Failed to send reset link"));
    }
    
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      {/* Animated Background Icons */}
      <div style={{ ...styles.floatIcon, top: "20%", left: "12%" }}>🛠️</div>
      <div style={{ ...styles.floatIcon, top: "70%", left: "80%" }}>⚡</div>
      <div style={{ ...styles.floatIcon, top: "50%", left: "60%" }}>🔧</div>

      <div style={styles.card}>
        <h2 style={styles.title}>
          {mode === "login" ? "Service Provider Login" : "Reset Password"}
        </h2>
        <p style={styles.subtitle}>
          {mode === "login" 
            ? "Access your service dashboard" 
            : "Enter your registered email to reset password"}
        </p>

        <form onSubmit={mode === "login" ? handleLogin : (e) => e.preventDefault()} style={{ width: "100%" }}>
          
          {mode === "login" ? (
            <>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                style={styles.input}
                required
                type="email"
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                style={styles.input}
                required
              />

              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? "Logging in…" : "Login"}
              </button>

              <div style={styles.linksRow}>
                <span onClick={() => setMode("forgot")} style={styles.link}>
                  Forgot Password?
                </span>

                <Link to="/service-provider-register" style={styles.link}>
                  New Registration
                </Link>
              </div>
            </>
          ) : (
            <>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                style={styles.input}
                required
                type="email"
              />

              <button
                type="button"
                disabled={loading}
                onClick={handleForgotPassword}
                style={styles.button}
              >
                {loading ? "Sending…" : "Send Reset Link"}
              </button>

              <span onClick={() => setMode("login")} style={styles.backLink}>
                ← Back to Login
              </span>
            </>
          )}
        </form>

        {msg && <p style={styles.message}>{msg}</p>}
      </div>
    </div>
  );
}

/* ============================================================
   Modern Styling
============================================================ */
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #1e3c72, #2a5298)",
    position: "relative",
    overflow: "hidden",
    padding: 20,
    fontFamily: "Inter, sans-serif",
  },

  /* Floating animated icons */
  floatIcon: {
    position: "absolute",
    fontSize: 50,
    opacity: 0.25,
    animation: "float 6s infinite ease-in-out",
  },

  card: {
    width: "100%",
    maxWidth: 420,
    background: "rgba(255, 255, 255, 0.12)",
    backdropFilter: "blur(12px)",
    padding: "35px 30px",
    borderRadius: 16,
    boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
    textAlign: "center",
    animation: "fadeIn 0.6s ease",
  },

  title: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "700",
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 15,
    color: "#e6e6e6",
    marginBottom: 25,
  },

  input: {
    width: "100%",
    padding: "12px 15px",
    margin: "10px 0",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    fontSize: 15,
    outline: "none",
    transition: "0.3s",
  },

  button: {
    width: "100%",
    padding: "12px",
    background: "linear-gradient(90deg, #ff512f, #dd2476)",
    color: "#fff",
    fontSize: 17,
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    marginTop: 15,
    fontWeight: 600,
    transition: "0.25s",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 20px rgba(255, 81, 47, 0.4)",
    },
    "&:disabled": {
      opacity: 0.6,
      cursor: "not-allowed",
      transform: "none",
    },
  },

  linksRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 15,
  },

  link: {
    color: "#ffd1dc",
    fontSize: 14,
    cursor: "pointer",
    textDecoration: "underline",
    transition: "0.2s",
    "&:hover": {
      color: "#fff",
    },
  },

  backLink: {
    marginTop: 15,
    color: "#fff",
    fontSize: 14,
    cursor: "pointer",
    display: "block",
    textDecoration: "underline",
    transition: "0.2s",
    "&:hover": {
      color: "#ffd1dc",
    },
  },

  message: {
    marginTop: 15,
    color: "#fff",
    fontSize: 14,
    fontWeight: 500,
    minHeight: "20px",
  },
};

/* Keyframes injected into DOM */
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(
  `
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
}`,
  styleSheet.cssRules.length
);

styleSheet.insertRule(
  `
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}`,
  styleSheet.cssRules.length
);