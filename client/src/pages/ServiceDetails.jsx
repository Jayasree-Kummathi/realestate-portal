import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";

/* ======================================================
    LIGHTBOX FOR HD PHOTO VIEW
====================================================== */
function Lightbox({ src, onClose }) {
  if (!src) return null;

  return (
    <div style={lightbox.overlay}>
      <img src={src} style={lightbox.photo} alt="zoom" />
      <span style={lightbox.close} onClick={onClose}>
        ✕
      </span>
    </div>
  );
}

export default function ServiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ name: "", phone: "", message: "" });

  /* NEW FEATURES */
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [dark, setDark] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  /* ======================================================
      SCROLL PROGRESS INDICATOR
  ====================================================== */
  useEffect(() => {
    function handleScroll() {
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress((window.scrollY / max) * 100);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ======================================================
      LOAD MAIN SERVICE
  ====================================================== */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api.get(`/service-provider/service/${id}`);
        setService(res.data);
      } catch (err) {
        console.error("❌ Service Load Error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  /* ======================================================
      LOAD SIMILAR SERVICES
  ====================================================== */
  useEffect(() => {
    async function loadSimilar() {
      if (!service) return;
      const res = await api.get("/service-provider/");
      const list = res.data.filter(
        (s) =>
          s._id !== service._id &&
          s.provider?._id === service.provider?._id
      );
      setSimilar(list);
    }
    loadSimilar();
  }, [service]);

  /* FORM CHANGE */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  /* SUBMIT FORM */
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post("/service-provider/service/enquiry", {
        serviceId: id,
        name: form.name,
        phone: form.phone,
        email: "customer@site.com",
        message: form.message,
      });

      alert("✔ Enquiry Sent Successfully!");
      setForm({ name: "", phone: "", message: "" });
    } catch (err) {
      console.error(err);
      alert("❌ Failed to Send Enquiry");
    }
  }

  if (loading)
    return (
      <h3 style={{ textAlign: "center", marginTop: 30 }}>Loading...</h3>
    );

  if (!service)
    return (
      <h3 style={{ textAlign: "center", marginTop: 30 }}>
        Service Not Found
      </h3>
    );

  const mainImage =
    service?.images?.length > 0
      ? `${BASE}${service.images[0]}`
      : "https://via.placeholder.com/1200x350?text=No+Image";

  /* ======================================================
                      UI SECTION
  ====================================================== */
  return (
    <div
      style={{
        ...styles.page,
        background: dark ? "#0d1117" : "#f7f9fc",
        color: dark ? "#fff" : "#000",
      }}
    >
      {/* Progress Bar */}
      <div style={{ ...styles.progressBar, width: scrollProgress + "%" }} />

      {/* Dark Mode Toggle */}
      <div style={styles.darkToggle} onClick={() => setDark(!dark)}>
        {dark ? "🌞" : "🌙"}
      </div>

      {/* Lightbox */}
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* Breadcrumb */}
      <div style={styles.breadcrumb}>
        <span
          onClick={() => navigate("/service-home")}
          style={styles.link}
        >
          Home
        </span>{" "}
        / <span>{service.title}</span>
      </div>

      {/* Banner */}
      <div style={styles.banner} className="fadeIn">
        <img src={mainImage} style={styles.bannerImg} />
      </div>

      {/* Content */}
      <div style={styles.container}>
        {/* LEFT CONTENT */}
        <div style={styles.leftContent}>
          <h2 style={styles.title}>{service.title}</h2>
          <p style={styles.price}>₹ {service.price}</p>
          <p style={styles.location}>
            📍 {service.city || "Location not available"}
          </p>

          <p style={styles.description}>{service.description}</p>

          {/* Gallery */}
          <h3 style={styles.sectionTitle}>Gallery</h3>
          <div style={styles.gallery}>
            {service.images?.map((img, index) => (
              <img
                key={index}
                src={`${BASE}${img}`}
                style={styles.galleryImg}
                onClick={() => setLightboxSrc(`${BASE}${img}`)}
              />
            ))}
          </div>

          {/* Map */}
          <h3 style={styles.sectionTitle}>Location Map</h3>
          <div style={styles.mapWrap}>
            <iframe
              width="100%"
              height="260"
              loading="lazy"
              style={{ border: 0, borderRadius: 10 }}
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                service.city || "India"
              )}&output=embed`}
            ></iframe>
          </div>

          {/* Provider */}
          <h3 style={styles.sectionTitle}>About Provider</h3>
          <div style={styles.providerCard}>
            <h4>{service.provider?.name}</h4>
            <p>Email: {service.provider?.email}</p>
            <p>Phone: {service.provider?.phone}</p>

            <button
              style={styles.call}
              onClick={() =>
                window.open(`tel:${service.provider.phone}`)
              }
            >
              📞 Call Now
            </button>

            <button
              style={styles.whatsapp}
              onClick={() =>
                window.open(
                  `https://wa.me/${service.provider.phone}?text=I am interested in your service: ${service.title}`
                )
              }
            >
              💬 WhatsApp
            </button>
          </div>

          {/* Similar Services */}
          <h3 style={styles.sectionTitle}>
            More by {service.provider?.name}
          </h3>

          <div style={styles.similarGrid}>
            {similar.length === 0 ? (
              <p>No other services available.</p>
            ) : (
              similar.map((item) => (
                <div
                  key={item._id}
                  style={styles.similarCard}
                  onClick={() => navigate(`/service/${item._id}`)}
                >
                  <img
                    src={`${BASE}${item.images?.[0]}`}
                    style={styles.similarImg}
                  />
                  <p style={styles.similarTitle}>{item.title}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT ENQUIRY BOX */}
        <div style={styles.enquiryBox}>
          <h3 style={{ fontWeight: 700 }}>Contact Provider</h3>

          <form onSubmit={handleSubmit}>
            <input
              name="name"
              placeholder="Your Name"
              value={form.name}
              onChange={handleChange}
              style={styles.input}
              required
            />

            <input
              name="phone"
              placeholder="Phone"
              value={form.phone}
              onChange={handleChange}
              style={styles.input}
              required
            />

            <textarea
              name="message"
              placeholder="Message"
              value={form.message}
              onChange={handleChange}
              style={styles.textarea}
            />

            <button type="submit" style={styles.submitBtn}>
              ✨ Get Quote ✨
            </button>
          </form>
        </div>
      </div>

      {/* Floating Contact Bar */}
      <div style={styles.floatingBar}>
        <button
          style={styles.floatCall}
          onClick={() => window.open(`tel:${service.provider.phone}`)}
        >
          📞 Call
        </button>

        <button
          style={styles.floatWhatsApp}
          onClick={() =>
            window.open(
              `https://wa.me/${service.provider.phone}?text=Hi, I am interested in ${service.title}`
            )
          }
        >
          💬 WhatsApp
        </button>
      </div>
    </div>
  );
}

/* ======================================================
      ALL STYLES
====================================================== */
const styles = {
  page: { paddingBottom: 40, fontFamily: "Arial", transition: "0.3s" },

  progressBar: {
    height: 4,
    background: "#007bff",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 99999,
  },

  darkToggle: {
    position: "fixed",
    top: 70,
    right: 20,
    fontSize: 28,
    cursor: "pointer",
    background: "#ffffffcc",
    padding: "7px 12px",
    borderRadius: "50%",
    zIndex: 9999,
  },

  breadcrumb: {
    padding: "12px 20px",
    fontSize: 15,
    color: "#444",
  },
  link: { cursor: "pointer", color: "#0a66c2" },

  banner: { width: "100%", height: 350, overflow: "hidden" },
  bannerImg: { width: "100%", height: "100%", objectFit: "cover" },

  container: {
    marginTop: 20,
    padding: "0 20px",
    display: "flex",
    gap: 20,
  },

  leftContent: {
    flex: 2,
    background: "#fff",
    padding: 25,
    borderRadius: 12,
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  },

  title: { fontSize: 30, fontWeight: 700 },
  price: { fontSize: 24, color: "#27ae60", fontWeight: 600 },
  location: { color: "#666", marginTop: 5 },
  description: { marginTop: 20, lineHeight: 1.6 },

  sectionTitle: { marginTop: 30, fontSize: 22, fontWeight: 600 },

  gallery: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 12,
  },
  galleryImg: {
    width: 150,
    height: 110,
    borderRadius: 10,
    objectFit: "cover",
    cursor: "pointer",
    transition: "0.2s",
  },

  mapWrap: {
    width: "100%",
    marginTop: 15,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
  },

  providerCard: {
    background: "#f4f4f4",
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
  },

  call: {
    width: "100%",
    padding: 12,
    marginTop: 8,
    background: "#0066ff",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    cursor: "pointer",
  },

  whatsapp: {
    width: "100%",
    padding: 12,
    marginTop: 8,
    background: "#25D366",
    borderRadius: 6,
    border: "none",
    color: "#fff",
    cursor: "pointer",
  },

  similarGrid: {
    marginTop: 20,
    display: "flex",
    gap: 15,
    flexWrap: "wrap",
  },

  similarCard: {
    width: 160,
    background: "#fff",
    padding: 8,
    borderRadius: 10,
    textAlign: "center",
    cursor: "pointer",
    transition: "0.2s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },

  similarImg: {
    width: "100%",
    height: 110,
    borderRadius: 8,
    objectFit: "cover",
  },
  similarTitle: { marginTop: 8, fontWeight: 500 },

  /* RIGHT FORM */
  enquiryBox: {
    flex: 1,
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    height: "fit-content",
    boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
  },

  input: {
    width: "100%",
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    border: "1px solid #ccc",
  },

  textarea: {
    width: "100%",
    minHeight: 90,
    padding: 12,
    borderRadius: 6,
    border: "1px solid #ccc",
    marginBottom: 10,
  },

  submitBtn: {
    width: "100%",
    padding: 14,
    background: "linear-gradient(90deg,#ff512f,#dd2476)",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    animation: "pulse 2s infinite",
  },

  /* Floating bottom bar */
  floatingBar: {
    position: "fixed",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 10,
    background: "#ffffffdd",
    padding: "10px 16px",
    borderRadius: 40,
    boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
    zIndex: 9999,
    backdropFilter: "blur(10px)",
  },

  floatCall: {
    background: "#0066ff",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 30,
    border: "none",
    cursor: "pointer",
  },

  floatWhatsApp: {
    background: "#25D366",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 30,
    border: "none",
    cursor: "pointer",
  },
};

/* LIGHTBOX */
const lightbox = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999999,
  },
  photo: {
    maxWidth: "90%",
    maxHeight: "90%",
    borderRadius: 10,
  },
  close: {
    position: "fixed",
    top: 25,
    right: 30,
    fontSize: 30,
    color: "#fff",
    cursor: "pointer",
  },
};

