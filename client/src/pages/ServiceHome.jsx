import React, { useEffect, useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function ServiceHome() {
  const [services, setServices] = useState([]);

  // FILTERS
  const [city, setCity] = useState("All");
  const [area, setArea] = useState("All");
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);

  const [keyword, setKeyword] = useState("");
  const [budget, setBudget] = useState("");
  const [category, setCategory] = useState("");

  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  /* ==================== LOAD SERVICES ==================== */
  useEffect(() => {
    loadServices();
  }, []);

 async function loadServices() {
  try {
    const res = await api.get("/services"); // ✅ PUBLIC API
    const list = res.data || [];
    setServices(list);

    const uniqueCities = [
      ...new Set(list.map((s) => s.city?.trim()).filter(Boolean)),
    ];
    setCities(uniqueCities);
  } catch (err) {
    console.error("Failed to load services", err);
  }
}


  /* ==================== LOAD AREAS ==================== */
  useEffect(() => {
    if (city === "All") {
      setAreas([]);
      setArea("All");
      return;
    }

    const filtered = services.filter(
      (s) => s.city?.toLowerCase() === city.toLowerCase()
    );

    const extracted = filtered
      .map((s) =>
        s.location?.address ? s.location.address.split(",")[0].trim() : null
      )
      .filter(Boolean);

    const unique = [...new Set(extracted)];
    setAreas(unique);
  }, [city, services]);

  /* ==================== FILTER LOGIC ==================== */
  const filtered = services.filter((s) => {
    let c = true,
      a = true,
      k = true,
      b = true,
      cat = true;

    if (city !== "All")
      c = s.city?.toLowerCase() === city.toLowerCase();

    if (area !== "All") {
      const aName =
        s.location?.address?.split(",")[0]?.trim()?.toLowerCase();
      a = aName === area.toLowerCase();
    }

    if (keyword.trim())
      k =
        s.title.toLowerCase().includes(keyword.toLowerCase()) ||
        s.provider?.name?.toLowerCase().includes(keyword.toLowerCase());

    if (category)
      cat = s.provider?.serviceCategory === category;

    const price = Number(s.price || 0);
    if (budget) {
      switch (budget) {
        case "5000":
          b = price <= 5000;
          break;
        case "10000":
          b = price > 5000 && price <= 10000;
          break;
        case "25000":
          b = price > 10000 && price <= 25000;
          break;
        case "50000":
          b = price > 25000 && price <= 50000;
          break;
        case "50000plus":
          b = price > 50000;
          break;
      }
    }

    return c && a && k && b && cat;
  });

  /* ==================== CATEGORY CHIPS ==================== */
  const chipCategories = [
    "Electrician",
    "Plumber",
    "AC Repair",
    "Carpenter",
    "Painter",
    "Interior",
    "Architect",
    "Vastu",
  ];

  return (
    <div style={styles.page}>
      {/* ANIMATIONS */}
      <style>
        {`
          @keyframes heroAnim {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes chipBounce {
            0% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
            100% { transform: translateY(0); }
          }

          @keyframes glowPulse {
            0% { box-shadow: 0 0 6px rgba(0,255,255,0.2); }
            50% { box-shadow: 0 0 16px rgba(0,255,200,0.6); }
            100% { box-shadow: 0 0 6px rgba(0,255,255,0.2); }
          }
        `}
      </style>

      {/* ========================= HERO ========================= */}
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Find Trusted Service Providers</h1>
        <p style={styles.heroSub}>
          AC Repair • Electrician • Plumber • Interior • Architect • Vastu & More
        </p>

        {/* ================== Animated Category Chips ================== */}
        <div style={styles.chipRow}>
          {chipCategories.map((c, i) => (
            <div
              key={i}
              style={{
                ...styles.chip,
                animationDelay: `${i * 0.12}s`,
                background:
                  category === c
                    ? "linear-gradient(90deg, #00d9ff, #0099ff)"
                    : "rgba(255,255,255,0.12)",
                color: category === c ? "white" : "#fff",
                border:
                  category === c
                    ? "1px solid rgba(255,255,255,0.25)"
                    : "1px solid rgba(255,255,255,0.15)",
              }}
              onClick={() => setCategory(c === category ? "" : c)}
            >
              {c}
            </div>
          ))}
        </div>

        {/* ================== Floating Search Bar ================== */}
        <div style={styles.searchGlass}>
          <div style={styles.filterItem}>
            <span style={styles.icon}>📍</span>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={styles.select}
            >
              <option value="All">All Cities</option>
              {cities.map((c, i) => (
                <option key={i} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {city !== "All" && (
            <div style={styles.filterItem}>
              <span style={styles.icon}>📌</span>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                style={styles.select}
              >
                <option value="All">All Areas</option>
                {areas.map((a, i) => (
                  <option key={i} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={styles.filterItem}>
            <span style={styles.icon}>💰</span>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              style={styles.select}
            >
              <option value="">Budget</option>
              <option value="5000">Below ₹5,000</option>
              <option value="10000">₹5,000 – 10,000</option>
              <option value="25000">₹10,000 – 25,000</option>
              <option value="50000">₹25,000 – 50,000</option>
              <option value="50000plus">Above ₹50,000</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Search service, provider..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* ========================= SERVICE GRID ========================= */}
      <h2 style={styles.sectionTitle}>Popular Services</h2>

      <div style={styles.grid}>
        {filtered.map((s) => {
          const image =
            s.images?.[0]
              ? `${BASE_URL}${s.images[0]}`
              : "https://via.placeholder.com/300x200?text=No+Image";

          const areaName =
            s.location?.address?.split(",")[0]?.trim() || "";

          return (
            <div key={s._id} style={styles.card}>
              <div style={styles.cardImgWrap}>
                <img src={image} style={styles.cardImg} />
              </div>

              <h3 style={styles.cardTitle}>{s.title}</h3>
              <p style={styles.cardProvider}>{s.provider?.name}</p>
              <p style={styles.cardLoc}>
                📍 {areaName}, {s.city}
              </p>

              <span style={styles.priceTag}>₹ {s.price}</span>

              <button
                style={styles.detailBtn}
                onClick={() => navigate(`/service/${s._id}`)}
              >
                View Details →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========================= STYLES ========================= */

const styles = {
  page: { background: "#f6f8fc", minHeight: "100vh" },

  /* HERO */
  hero: {
    padding: "80px 20px 130px",
    textAlign: "center",
    background:
      "linear-gradient(-45deg, #0066ff, #00c2ff, #0099ff, #00eaff)",
    backgroundSize: "400% 400%",
    animation: "heroAnim 10s infinite",
    color: "white",
  },

  heroTitle: {
    fontSize: 42,
    fontWeight: 900,
    animation: "fadeInUp 0.8s ease",
  },

  heroSub: {
    fontSize: 17,
    marginTop: 6,
    opacity: 0.9,
    animation: "fadeInUp 1s ease",
  },

  /* CATEGORY CHIPS */
  chipRow: {
    marginTop: 25,
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
  },

  chip: {
    padding: "10px 18px",
    borderRadius: 30,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
    animation: "chipBounce 1.6s ease infinite",
    animationIterationCount: "infinite",
    transition: "0.3s",
    backdropFilter: "blur(4px)",
  },

  /* GLASS SEARCH BAR */
  searchGlass: {
    margin: "28px auto 0",
    maxWidth: 1000,
    padding: "18px 22px",
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    alignItems: "center",
    background: "rgba(255,255,255,0.12)",
    backdropFilter: "blur(14px)",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.25)",
    animation: "fadeInUp 1.4s ease",
  },

  filterItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.2)",
  },

  icon: { fontSize: 20 },

  select: {
    border: "none",
    background: "transparent",
    outline: "none",
    color: "blue",
    fontSize: 15,
    cursor: "pointer",
  },

  searchInput: {
    flex: 1,
    minWidth: 200,
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.25)",
    outline: "none",
    color: "white",
    fontSize: 15,
  },

  /* CARDS */
  sectionTitle: {
    fontSize: 26,
    fontWeight: 800,
    marginTop: 25,
    marginLeft: 18,
    color: "#222",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
    gap: 25,
    padding: 20,
  },

  card: {
    background: "white",
    borderRadius: 18,
    boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
    padding: 16,
    transition: "0.3s",
  },

  cardImgWrap: {
    height: 180,
    overflow: "hidden",
    borderRadius: 14,
  },

  cardImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "0.3s",
  },

  cardTitle: {
    marginTop: 10,
    fontWeight: 700,
    fontSize: 18,
  },

  cardProvider: {
    marginTop: 5,
    color: "#555",
  },

  cardLoc: {
    marginTop: 5,
    color: "#777",
  },

  priceTag: {
    marginTop: 10,
    display: "inline-block",
    padding: "8px 14px",
    background: "linear-gradient(90deg, #00c2ff, #008aff)",
    color: "white",
    borderRadius: 10,
    fontWeight: 700,
    boxShadow: "0 6px 20px rgba(0,150,255,0.4)",
  },

  detailBtn: {
    marginTop: 14,
    padding: "12px",
    width: "100%",
    background: "#0066ff",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    transition: "0.25s",
  },
};
