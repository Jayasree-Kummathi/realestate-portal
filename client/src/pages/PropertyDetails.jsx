import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [related, setRelated] = useState([]);
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  // Main image + lightbox
  const [mainImage, setMainImage] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Enquiry form
  const [submitMsg, setSubmitMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  // 360 viewer state
  const [panoramaUrl, setPanoramaUrl] = useState(null);
  const panRef = useRef({ dragging: false, startX: 0, offset: 50 }); // offset 0..100 = background-position-x percent
  const panElRef = useRef(null);

  // EMI calculator state
  const [loanInputs, setLoanInputs] = useState({
    price: 0,
    downPercent: 10,
    interestAnnual: 8.5,
    tenureYears: 10,
  });
  const [emiResult, setEmiResult] = useState({ emi: 0, totalPayment: 0, totalInterest: 0, schedule: [] });

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/properties/${id}`);
        const p = res.data;
        setProperty(p);

        if (p.images?.length > 0) {
          setMainImage(`${BASE_URL}${p.images[0]}`);
        }

        // detect panorama image heuristically:
        // prefer explicit `p.panorama` field, else check filenames containing '360' or 'panorama'
        if (p.panorama) {
          setPanoramaUrl(p.panorama.startsWith("http") ? p.panorama : `${BASE_URL}${p.panorama}`);
        } else {
          const found = (p.images || []).find((u) => /360|panorama|pano/i.test(u));
          if (found) setPanoramaUrl(`${BASE_URL}${found}`);
        }

        loadRelated(p.city, p.areaName, p._id);
        // set default EMI inputs
        setLoanInputs((li) => ({ ...li, price: Number(p.price || 0) }));
      } catch (err) {
        console.error("Error loading property:", err);
      }
    }
    load();
  }, [id]);

  async function loadRelated(city, areaName, currentId) {
    try {
      const res = await api.get("/properties");
      const data = res.data || [];
      const matches = data.filter(
        (p) =>
          p._id !== currentId &&
          (p.city?.toLowerCase() === city?.toLowerCase() ||
            p.areaName?.toLowerCase() === areaName?.toLowerCase())
      );
      setRelated(matches.slice(0, 8));
    } catch (err) {
      console.error("Related properties error:", err);
    }
  }

  /* ---------------- Lightbox controls ---------------- */
  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);
  const nextImage = () => {
    if (!property?.images) return;
    setLightboxIndex((prev) => (prev + 1) % property.images.length);
  };
  const prevImage = () => {
    if (!property?.images) return;
    setLightboxIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));
  };

  /* ---------------- Enquiry submit ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMsg("");
    try {
      await api.post("/enquiries", {
        propertyId: property._id,
        agentId: property.agent?._id,
        ...form,
      });
      setSubmitMsg("✅ Enquiry submitted successfully!");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      console.error(err);
      setSubmitMsg("❌ Failed to submit enquiry");
    }
  };

  /* ---------------- Panorama viewer handlers ---------------- */
  const onPanStart = (e) => {
    e.preventDefault();
    panRef.current.dragging = true;
    panRef.current.startX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
  };
  const onPanMove = (e) => {
    if (!panRef.current.dragging) return;
    const clientX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
    const dx = clientX - panRef.current.startX;
    // translate dx into percent change; sensitivity factor:
    const width = panElRef.current?.offsetWidth || window.innerWidth;
    const deltaPercent = (dx / width) * 100 * 1.2;
    let newOffset = panRef.current.offset + deltaPercent;
    // wrap-around between 0 and 100
    newOffset = ((newOffset % 100) + 100) % 100;
    panRef.current.startX = clientX;
    panRef.current.offset = newOffset;
    if (panElRef.current) {
      panElRef.current.style.backgroundPosition = `${panRef.current.offset}% 50%`;
    }
  };
  const onPanEnd = () => {
    panRef.current.dragging = false;
  };

  /* ---------------- EMI Calculator ---------------- */
  useEffect(() => {
    computeEmi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanInputs]);

  function computeEmi() {
    const P_full = Number(loanInputs.price) || 0;
    const downPercent = Number(loanInputs.downPercent) || 0;
    const principal = P_full * (1 - downPercent / 100);
    const annualRate = Number(loanInputs.interestAnnual) || 0;
    const monthlyRate = annualRate / 12 / 100;
    const n = Number(loanInputs.tenureYears) * 12 || 1;

    if (monthlyRate === 0) {
      const emi = principal / n;
      setEmiResult({
        emi,
        totalPayment: emi * n,
        totalInterest: emi * n - principal,
        schedule: buildSchedule(principal, monthlyRate, n, emi),
      });
      return;
    }

    const pow = Math.pow(1 + monthlyRate, n);
    const emi = principal * monthlyRate * pow / (pow - 1);
    const totalPayment = emi * n;
    const totalInterest = totalPayment - principal;

    setEmiResult({
      emi,
      totalPayment,
      totalInterest,
      schedule: buildSchedule(principal, monthlyRate, n, emi),
    });
  }

  function buildSchedule(principal, monthlyRate, n, emi) {
    const sch = [];
    let bal = principal;
    for (let i = 1; i <= Math.min(n, 12); i++) { // only show up to first 12 rows for preview
      const interest = bal * monthlyRate;
      const principalRepay = emi - interest;
      bal = bal - principalRepay;
      sch.push({
        month: i,
        interest,
        principalRepay,
        balance: Math.max(bal, 0),
      });
    }
    return sch;
  }

  /* ---------------- Map embed source ---------------- */
  const getMapSrc = () => {
    const coords = property?.location?.coordinates;
    if (coords && coords.length >= 2) {
      const [lng, lat] = coords;
      return `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    }
    const q = encodeURIComponent(property.address || property.areaName || property.title);
    return `https://www.google.com/maps?q=${q}&z=15&output=embed`;
  };

  if (!property) return <p style={{ textAlign: "center", padding: 30 }}>Loading...</p>;

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98);} to {opacity:1; transform:scale(1);} }
        @keyframes slide { from { opacity: 0; transform: translateY(10px);} to {opacity:1; transform:translateY(0);} }
        @media (max-width: 900px) {
          .pdLayout { flex-direction: column; }
          .pdRight { position: static; width: 100%; }
        }
      `}</style>

      {/* MAIN IMAGE PREVIEW */}
      <div style={styles.mainImageWrap} onClick={() => openLightbox(0)}>
        <img src={mainImage} style={styles.mainImage} alt="main" />
      </div>

      <div className="pdLayout" style={styles.layout}>
        {/* LEFT */}
        <div style={styles.left}>
          <h1 style={styles.title}>{property.title}</h1>

          <div style={styles.priceRow}>
            <span style={styles.price}>₹ {property.price?.toLocaleString("en-IN")}</span>
            <span style={styles.location}>📍 {property.address || property.areaName}</span>
          </div>

          <hr style={styles.divider} />

          {/* PHOTOS GALLERY */}
          <h3 style={styles.sectionTitle}>Photos</h3>
          <div style={styles.galleryRow}>
            {property.images?.map((img, i) => (
              <img
                key={i}
                src={`${BASE_URL}${img}`}
                style={{ ...styles.thumb, border: mainImage?.includes(img) ? "2px solid #ff9800" : "2px solid transparent" }}
                onClick={() => { setMainImage(`${BASE_URL}${img}`); }}
                onDoubleClick={() => openLightbox(i)}
                alt={`thumb-${i}`}
              />
            ))}
          </div>

          {/* 360 Virtual Tour */}
          <div style={{ marginTop: 18 }}>
            <h3 style={styles.sectionTitle}>360° Virtual Tour</h3>
            {panoramaUrl ? (
              <div
                ref={panElRef}
                style={{
                  ...styles.panorama,
                  backgroundImage: `url("${panoramaUrl}")`,
                  backgroundPosition: `${panRef.current.offset}% 50%`,
                }}
                onMouseDown={onPanStart}
                onMouseMove={onPanMove}
                onMouseUp={onPanEnd}
                onMouseLeave={onPanEnd}
                onTouchStart={onPanStart}
                onTouchMove={onPanMove}
                onTouchEnd={onPanEnd}
                title="Drag to rotate / Double-click to open fullscreen"
                onDoubleClick={() => {
                  // open panorama in lightbox (if panorama is in images list try to find index else open separate overlay)
                  const idx = (property.images || []).findIndex((u) => u.includes('360') || u.includes('panorama') || panoramaUrl.includes(u));
                  if (idx >= 0) openLightbox(idx);
                  else {
                    // open a fullscreen view of panorama URL
                    setMainImage(panoramaUrl);
                    openLightbox(0);
                  }
                }}
              >
                <div style={styles.panoramaHint}>Drag to rotate • Double-click to open</div>
              </div>
            ) : (
              <div style={styles.panoramaFallback}>
                <p style={{ margin: 0 }}>No 360° tour available for this property.</p>
                <button
                  style={styles.smallBtn}
                  onClick={() => {
                    // open the first image fullscreen
                    if (property.images?.length) openLightbox(0);
                  }}
                >
                  View Photos
                </button>
              </div>
            )}
          </div>

          <hr style={styles.divider} />

          {/* VIDEO TOUR */}
{property.videoUrl && (
  <>
    <hr style={styles.divider} />

    <h3 style={styles.sectionTitle}>Video Tour</h3>

    <div style={styles.videoWrapper}>
      <video
        controls
        playsInline
        preload="metadata"
        style={styles.video}
      >
        <source
          src={`${BASE_URL}${property.videoUrl}`}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
    </div>
  </>
)}


          {/* MAP VIEW */}
          <h3 style={styles.sectionTitle}>Location Map</h3>
          <div style={styles.mapWrap}>
            <iframe
              title="Property location"
              src={getMapSrc()}
              width="100%"
              height="280"
              style={{ border: 0, borderRadius: 12 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div style={styles.mapActionsRow}>
              <button
                style={styles.smallBtn}
                onClick={() => {
                  // open google maps in new tab with same query
                  const coords = property.location?.coordinates;
                  const href = coords && coords.length >= 2
                    ? `https://www.google.com/maps/search/?api=1&query=${coords[1]},${coords[0]}`
                    : `https://www.google.com/maps/search/${encodeURIComponent(property.address || property.areaName || property.title)}`;
                  window.open(href, "_blank");
                }}
              >
                Open in Google Maps
              </button>
            </div>
          </div>

          <hr style={styles.divider} />

          {/* DESCRIPTION */}
          <h3 style={styles.sectionTitle}>About Property</h3>
          <p style={styles.description}>{property.description}</p>

          <hr style={styles.divider} />

          {/* EMI CALCULATOR */}
          <h3 style={styles.sectionTitle}>EMI Calculator</h3>
          <div style={styles.emiWrap}>
            <div style={styles.emiRow}>
              <label style={styles.emiLabel}>Property Price</label>
              <input
                type="number"
                value={loanInputs.price}
                onChange={(e) => setLoanInputs({ ...loanInputs, price: Number(e.target.value || 0) })}
                style={styles.input}
              />
            </div>

            <div style={styles.emiRow}>
              <label style={styles.emiLabel}>Down Payment (%)</label>
              <input
                type="number"
                step="0.1"
                value={loanInputs.downPercent}
                onChange={(e) => setLoanInputs({ ...loanInputs, downPercent: Number(e.target.value || 0) })}
                style={styles.input}
              />
            </div>

            <div style={styles.emiRow}>
              <label style={styles.emiLabel}>Interest Rate (annual %)</label>
              <input
                type="number"
                step="0.01"
                value={loanInputs.interestAnnual}
                onChange={(e) => setLoanInputs({ ...loanInputs, interestAnnual: Number(e.target.value || 0) })}
                style={styles.input}
              />
            </div>

            <div style={styles.emiRow}>
              <label style={styles.emiLabel}>Tenure (years)</label>
              <input
                type="number"
                value={loanInputs.tenureYears}
                onChange={(e) => setLoanInputs({ ...loanInputs, tenureYears: Number(e.target.value || 0) })}
                style={styles.input}
              />
            </div>

            <div style={styles.emiResult}>
              <div>
                <div style={styles.emiLabel}>Monthly EMI</div>
                <div style={styles.emiBig}>₹ {Math.round(emiResult.emi).toLocaleString("en-IN")}</div>
              </div>
              <div>
                <div style={styles.emiLabel}>Total Payment</div>
                <div>₹ {Math.round(emiResult.totalPayment).toLocaleString("en-IN")}</div>
              </div>
              <div>
                <div style={styles.emiLabel}>Total Interest</div>
                <div>₹ {Math.round(emiResult.totalInterest).toLocaleString("en-IN")}</div>
              </div>
            </div>

            {emiResult.schedule?.length > 0 && (
              <div style={styles.amortPreview}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Amortization (first {emiResult.schedule.length} months)</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {emiResult.schedule.map((r) => (
                    <div key={r.month} style={styles.amortRow}>
                      <div style={{ fontWeight: 700 }}>M {r.month}</div>
                      <div>Principal ₹{Math.round(r.principalRepay).toLocaleString("en-IN")}</div>
                      <div>Bal ₹{Math.round(r.balance).toLocaleString("en-IN")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <hr style={styles.divider} />

          {/* FACTS */}
          <h3 style={styles.sectionTitle}>Property Details</h3>
          <div style={styles.factsGrid}>
            <div style={styles.factBox}>
              <div style={styles.factLabel}>Area</div>
              <div style={styles.factValue}>{property.areaName || "—"}</div>
            </div>
            <div style={styles.factBox}>
              <div style={styles.factLabel}>Nearby Highway</div>
              <div style={styles.factValue}>{property.nearbyHighway || "—"}</div>
            </div>
            <div style={styles.factBox}>
              <div style={styles.factLabel}>Project</div>
              <div style={styles.factValue}>{property.projectName || "—"}</div>
            </div>
          </div>

          {/* RELATED PROPERTIES */}
          {related.length > 0 && (
            <>
              <hr style={styles.divider} />
              <h3 style={styles.sectionTitle}>Related Properties</h3>
              <div style={styles.relatedRow}>
                {related.map((p) => (
                  <div key={p._id} style={styles.relatedCard} onClick={() => navigate(`/property/${p._id}`)}>
                    <img src={p.images?.[0] ? `${BASE_URL}${p.images[0]}` : "https://via.placeholder.com/200x140"} alt="" style={styles.relatedImg} />
                    <div style={{ marginTop: 8 }}>
                      <div style={styles.relatedTitle}>{p.title}</div>
                      <div style={styles.relatedPrice}>₹ {p.price?.toLocaleString("en-IN")}</div>
                      <div style={styles.relatedLoc}>📍 {p.areaName}, {p.city}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT: agent + enquiry */}
        <div className="pdRight" style={styles.right}>
          {property.agent && (
            <div style={styles.agentCard}>
              <h3 style={styles.agentTitle}>Agent Information</h3>
              <p style={styles.agentName}>{property.agent.name}</p>
              <p style={styles.agentEmail}>{property.agent.email}</p>
            </div>
          )}

          <div style={styles.formCard}>
            <h3 style={styles.formTitle}>Contact Agent</h3>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Your Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={styles.input} />
              <input type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={styles.input} />
              <input type="tel" placeholder="Phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={styles.input} />
              <textarea placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} style={styles.textarea} />
              <button style={styles.btn}>Send Enquiry</button>
              {submitMsg && <p style={styles.msg}>{submitMsg}</p>}
            </form>
          </div>
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightboxOpen && (
        <Lightbox
          images={property.images || []}
          base={BASE_URL}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}
    </div>
  );
}

/* ================ Lightbox component ================ */
function Lightbox({ images, base, index, onClose, onNext, onPrev }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev]);

  if (!images || images.length === 0) return null;
  const src = `${base}${images[index]}`;

  return (
    <div style={lightboxStyles.overlay}>
      <button style={lightboxStyles.close} onClick={onClose} aria-label="Close">✕</button>
      <button style={lightboxStyles.navLeft} onClick={onPrev} aria-label="Previous">‹</button>
      <img src={src} style={lightboxStyles.img} alt="lightbox" />
      <button style={lightboxStyles.navRight} onClick={onNext} aria-label="Next">›</button>
    </div>
  );
}

/* ========================= STYLES ========================= */
const styles = {
  page: { padding: "20px 40px", background: "#f5f7fb", fontFamily: "Inter, sans-serif" },

  mainImageWrap: {
    width: "100%", height: "430px", borderRadius: "18px", overflow: "hidden",
    marginBottom: "18px", cursor: "zoom-in", boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
  },
  mainImage: { width: "100%", height: "100%", objectFit: "cover" },

  layout: { display: "flex", gap: "35px", alignItems: "flex-start" },

  left: { flex: 2 },
  right: { flex: 1, position: "sticky", top: 25 },

  title: { fontSize: 34, fontWeight: 900, color: "#0a2540", marginBottom: 6 },
  priceRow: { marginTop: 6, marginBottom: 10 },
  price: { color: "#d32f2f", fontSize: 26, fontWeight: 800 },
  location: { color: "#444", fontSize: 16 },
  divider: { margin: "18px 0", opacity: 0.2 },

  galleryRow: { display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 },
  thumb: { width: 120, height: 95, objectFit: "cover", borderRadius: 10, cursor: "pointer", transition: "0.25s" },

  sectionTitle: { fontSize: 22, fontWeight: 700, color: "#0a2540" },
  description: { lineHeight: 1.7, fontSize: 15, color: "#333" },

  // Panorama viewer (basic draggable panorama)
  panorama: {
    height: 220,
    borderRadius: 12,
    backgroundRepeat: "repeat-x",
    backgroundSize: "cover",
    backgroundPosition: "50% 50%",
    cursor: "grab",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },

  videoWrapper: {
  width: "100%",
  maxWidth: 900,
  margin: "12px auto",
  borderRadius: 12,
  overflow: "hidden",
  background: "#000",
},

video: {
  width: "100%",
  height: "auto",
  maxHeight: "70vh",
  borderRadius: 12,
},

  panoramaHint: { background: "rgba(0,0,0,0.35)", color: "white", padding: "6px 10px", borderRadius: 10, marginBottom: 12, fontSize: 13 },

  panoramaFallback: { padding: 18, borderRadius: 12, background: "#fff", boxShadow: "0 6px 20px rgba(0,0,0,0.06)" },
  smallBtn: { marginTop: 10, padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "#0066ff", color: "white" },

  // Map
  mapWrap: { marginTop: 8, borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" },
  mapActionsRow: { display: "flex", justifyContent: "flex-end", marginTop: 8 },

  // EMI
  emiWrap: { background: "#fff", padding: 14, borderRadius: 12, boxShadow: "0 6px 20px rgba(0,0,0,0.06)", marginTop: 12 },
  emiRow: { display: "flex", gap: 12, alignItems: "center", marginBottom: 10 },
  emiLabel: { minWidth: 160, color: "#444", fontWeight: 600 },
  emiBig: { fontSize: 20, fontWeight: 900, color: "#0a2540", marginTop: 6 },

  emiResult: { display: "flex", gap: 18, justifyContent: "space-between", marginTop: 10 },
  amortPreview: { marginTop: 12, fontSize: 13, color: "#333" },
  amortRow: { padding: 8, borderRadius: 8, background: "#f7f9fb" },

  // facts
  factsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginTop: 8 },
  factBox: { background: "#fff", padding: 12, borderRadius: 12, boxShadow: "0 4px 14px rgba(0,0,0,0.06)" },
  factLabel: { color: "#666", fontSize: 13 }, factValue: { fontSize: 16, fontWeight: 800 },

  // related
  relatedRow: { display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8, marginTop: 8 },
  relatedCard: { minWidth: 230, background: "white", padding: 12, borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", cursor: "pointer" },
  relatedImg: { width: "100%", height: 140, objectFit: "cover", borderRadius: 8 },
  relatedTitle: { fontSize: 16, fontWeight: 800 }, relatedPrice: { color: "#d32f2f", fontWeight: 800 }, relatedLoc: { color: "#666", fontSize: 13 },

  // right side (sticky)
  agentCard: { background: "#fff", padding: 18, borderRadius: 12, marginBottom: 14, boxShadow: "0 6px 20px rgba(0,0,0,0.12)" },
  agentTitle: { fontSize: 18, fontWeight: 800 }, agentName: { fontSize: 16, marginTop: 6 }, agentEmail: { color: "#666" },

  formCard: { background: "rgba(255,255,255,0.95)", padding: 16, borderRadius: 12, boxShadow: "0 6px 22px rgba(0,0,0,0.08)" },
  formTitle: { fontSize: 18, fontWeight: 800, marginBottom: 10 },
  input: { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", marginBottom: 10 },
  textarea: { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", minHeight: 90, marginBottom: 10 },
  btn: { width: "100%", padding: 12, background: "#0066ff", color: "white", border: "none", fontWeight: 800, borderRadius: 8, cursor: "pointer" },
  msg: { marginTop: 10, textAlign: "center" },
};

/* ================= Lightbox styles ================= */
const lightboxStyles = {
  overlay: {
    position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.92)", zIndex: 9999,
  },
  img: { maxWidth: "92%", maxHeight: "88%", borderRadius: 12 },
  close: { position: "absolute", top: 18, right: 22, fontSize: 32, color: "#fff", background: "transparent", border: "none", cursor: "pointer" },
  navLeft: { position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", fontSize: 54, color: "#fff", background: "transparent", border: "none", cursor: "pointer" },
  navRight: { position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", fontSize: 54, color: "#fff", background: "transparent", border: "none", cursor: "pointer" },
};
