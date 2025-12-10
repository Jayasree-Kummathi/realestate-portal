import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

export default function AgentDetails() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const id = user?._id;
  const token = localStorage.getItem("agentToken");

  const [agent, setAgent] = useState(null);
  const [properties, setProperties] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgentData() {
      try {
        setLoading(true);

        const { data } = await api.get(`/agents/${id}`);
        setAgent(data);

        const { data: props } = await api.get(`/agents/${id}/properties`);
        setProperties(props || []);

        const { data: enqs } = await api.get(`/agents/${id}/enquiries`);
        setEnquiries(enqs || []);

      } catch (err) {
        console.error("Failed:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAgentData();
  }, [id]);

  const totalEarnings = useMemo(() => {
    if (!agent || !properties.length) return 0;

    const pct = agent.commissionPercent || 2;

    return properties.reduce((sum, p) => sum + (p.price || 0) * (pct / 100), 0);
  }, [properties, agent]);

  if (loading) return <h3 style={{ textAlign: "center" }}>Loading...</h3>;

  return (
    <div style={styles.page}>
      <style>{`
        @media (max-width: 768px) {
          .topFlex {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 20px;
          }
        }
      `}</style>

      <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>

      {/* --- Banner / Profile Card --- */}
      <div style={styles.banner}>
        <div style={styles.bannerOverlay}></div>

        <div style={styles.profileCard}>
          <div style={styles.avatar}>
            {agent?.name?.charAt(0).toUpperCase()}
          </div>

          <div>
            <h2 style={styles.name}>{agent?.name}</h2>
            <p style={styles.email}>{agent?.email}</p>
            <p style={styles.agentId}>
              Agent ID: <b>{agent?.agentId}</b>
            </p>
          </div>
        </div>
      </div>

      {/* Earnings widget */}
      <div style={styles.container}>
        <div className="topFlex" style={styles.topRow}>
          <div style={styles.earnCard}>
            <h3 style={styles.earnAmount}>₹ {totalEarnings.toLocaleString("en-IN")}</h3>
            <p style={styles.earnLabel}>Total Earnings</p>
          </div>

          <div style={styles.statCard}>
            <h3 style={styles.statNum}>{properties.length}</h3>
            <p style={styles.statLabel}>Properties Listed</p>
          </div>

          <div style={styles.statCard}>
            <h3 style={styles.statNum}>{enquiries.length}</h3>
            <p style={styles.statLabel}>Customer Enquiries</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================== */
/*               STYLES            */
/* =============================== */
const styles = {
  page: {
    padding: "25px",
    fontFamily: "Inter, sans-serif",
    background: "#f5f7fb",
    minHeight: "100vh",
  },

  backBtn: {
    marginBottom: 12,
    padding: "6px 14px",
    background: "transparent",
    border: "1px solid #ccc",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
  },

  /* -------- Banner -------- */
  banner: {
    position: "relative",
    height: 190,
    borderRadius: 20,
    backgroundImage:
      "url('https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1500&q=80')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    marginBottom: 80,
  },

  bannerOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    borderRadius: 20,
  },

  profileCard: {
    position: "absolute",
    bottom: -50,
    left: 40,
    display: "flex",
    alignItems: "center",
    gap: 18,
    background: "rgba(255,255,255,0.25)",
    backdropFilter: "blur(10px)",
    padding: "18px 24px",
    borderRadius: 18,
    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
    color: "#fff",
  },

  avatar: {
    width: 60,
    height: 60,
    background: "rgba(255,255,255,0.2)",
    backdropFilter: "blur(6px)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
    fontWeight: 700,
    color: "#fff",
  },

  name: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color:"black",
  },

  email: {
    margin: "4px 0",
    fontSize: 14,
    opacity: 0.9,
    color:"black"
  },

  agentId: {
    margin: 0,
    fontSize: 13,
    color:"black"
  },

  /* -------- Stats & Earnings -------- */
  container: {
    marginTop: 70,
  },

  topRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 10,
  },

  earnCard: {
    flex: 1,
    padding: "20px 24px",
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    borderLeft: "5px solid #4f46e5",
  },

  earnAmount: {
    margin: 0,
    fontSize: 28,
    color: "#4f46e5",
    fontWeight: 800,
  },

  earnLabel: {
    margin: "4px 0 0 0",
    color: "#666",
    fontSize: 14,
  },

  statCard: {
    flex: 1,
    padding: "20px 24px",
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    textAlign: "center",
  },

  statNum: {
    margin: 0,
    fontSize: 30,
    fontWeight: 800,
    color: "#111",
  },

  statLabel: {
    marginTop: 4,
    fontSize: 14,
    color: "#555",
  },
};
