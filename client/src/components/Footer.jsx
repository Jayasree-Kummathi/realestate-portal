// Footer.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <footer style={styles.footer}>
        <div style={styles.content}>
          {/* Brand */}
          <div>
            <Link to="/" style={styles.logo}>RealEstate 24X7</Link>
            <p style={styles.tagline}>
              Your trusted partner for buying, selling & renting properties across India.
            </p>

            <div style={styles.socialRow}>
  <a href="https://facebook.com" target="_blank" rel="noreferrer" style={styles.socialIcon}>
    <svg viewBox="0 0 24 24" width="20" fill="currentColor">
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-3h2.4V9.5c0-2.4 1.4-3.7 3.6-3.7 1 0 2 .1 2 .1v2.2H15c-1.2 0-1.5.7-1.5 1.4V12H16l-.4 3h-2.1v7A10 10 0 0 0 22 12Z"/>
    </svg>
  </a>

  <a href="https://twitter.com" target="_blank" rel="noreferrer" style={styles.socialIcon}>
    <svg viewBox="0 0 24 24" width="20" fill="currentColor">
      <path d="M22 5.8c-.8.4-1.6.6-2.5.8a4.2 4.2 0 0 0 1.8-2.3 8.3 8.3 0 0 1-2.6 1A4.1 4.1 0 0 0 12 8c0 .3 0 .6.1.8A11.6 11.6 0 0 1 3 4.6a4.1 4.1 0 0 0 1.3 5.5A4 4 0 0 1 2.8 9v.1a4.1 4.1 0 0 0 3.3 4 4.2 4.2 0 0 1-1.8.1 4.1 4.1 0 0 0 3.8 2.9A8.3 8.3 0 0 1 2 18.4 11.7 11.7 0 0 0 8.3 20c7.6 0 11.8-6.3 11.8-11.8v-.5A8.4 8.4 0 0 0 22 5.8Z"/>
    </svg>
  </a>

  <a href="https://instagram.com" target="_blank" rel="noreferrer" style={styles.socialIcon}>
    <svg viewBox="0 0 24 24" width="20" fill="currentColor">
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6-.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/>
    </svg>
  </a>

  <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={styles.socialIcon}>
    <svg viewBox="0 0 24 24" width="20" fill="currentColor">
      <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 8.98h4v12H3Zm7 0h3.8v1.6h.1c.5-.9 1.7-1.8 3.6-1.8 3.9 0 4.6 2.6 4.6 6v6.2h-4v-5.5c0-1.3 0-3-1.8-3s-2 1.4-2 2.9v5.6h-4Z"/>
    </svg>
  </a>

  <a href="https://youtube.com" target="_blank" rel="noreferrer" style={styles.socialIcon}>
    <svg viewBox="0 0 24 24" width="20" fill="currentColor">
      <path d="M23.5 6.2s-.2-1.7-.9-2.5c-.8-.9-1.7-.9-2.1-1C17.6 2.5 12 2.5 12 2.5h0s-5.6 0-8.5.2c-.4.1-1.3.1-2.1 1C.7 4.5.5 6.2.5 6.2S0 8.2 0 10.1v1.8c0 2 .5 3.9.5 3.9s.2 1.7.9 2.5c.8.9 1.9.9 2.4 1 1.7.2 7.2.3 7.2.3s5.6 0 8.5-.3c.4-.1 1.3-.1 2.1-1 .7-.8.9-2.5.9-2.5s.5-2 .5-3.9v-1.8c0-2-.5-3.9-.5-3.9ZM9.5 13.5v-6l6 3-6 3Z"/>
    </svg>
  </a>
</div>

          </div>

          {/* Quick Links */}
          <div>
            <h4 style={styles.heading}>Quick Links</h4>
            {["Home","Properties","Services","Agents","Contact"].map((l,i)=>(
              <Link key={i} to="/" style={styles.link}>{l}</Link>
            ))}
          </div>

          {/* Property Types */}
          <div>
            <h4 style={styles.heading}>Property Types</h4>
            {["Apartment","Villa","Plots","Commercial","Farmhouse"].map((t,i)=>(
              <Link key={i} to="/" style={styles.link}>{t}</Link>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 style={styles.heading}>Contact</h4>
            <p style={styles.text}>📍 Flat No. 401, Sri Rama Towers, 4th Floor, Miyapur Main Road, Opp SBI Bank, Hyderabad – 500049</p>
            <p style={styles.text}>📞 +91 83416 02908</p>
            <p style={styles.text}>✉️ miithyderabad@gmail.com</p>
          </div>
        </div>

        {/* Newsletter */}
        <div style={styles.newsletter}>
          <h3 style={{ color: "#fff" }}>Stay Updated</h3>
          <p style={styles.newsText}>
            Subscribe to get latest property updates.
          </p>
          <div style={styles.newsRow}>
            <input placeholder="Your email" style={styles.input} />
            <button style={styles.btn}>Subscribe</button>
          </div>
        </div>

        {/* Bottom */}
        <div style={styles.bottom}>
          <span>© {new Date().getFullYear()} RealEstate 24X7</span>
          <div>
            <Link style={styles.bottomLink}>Privacy</Link>
            <Link style={styles.bottomLink}>Terms</Link>
          </div>
        </div>
      </footer>

      {/* Back to Top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{
          ...styles.backToTop,
          opacity: showBackToTop ? 1 : 0,
          transform: showBackToTop ? "translateY(0)" : "translateY(20px)"
        }}
      >
        ↑
      </button>
    </>
  );
}

/* ================= INLINE STYLES ================= */

const styles = {
  footer: {
    background: "linear-gradient(180deg,#020617,#020617)",
    color: "#e5e7eb",
    paddingTop: 60,
    marginTop: 80,
  },

  content: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr",
    gap: 40,
    maxWidth: 1300,
    margin: "auto",
    padding: "0 30px",
  },

  logo: {
    fontSize: 26,
    fontWeight: 900,
    color: "#fff",
    textDecoration: "none",
  },

  tagline: {
    color: "#9ca3af",
    margin: "15px 0",
    fontSize: 14,
    lineHeight: 1.6,
  },

  socialRow: {
    display: "flex",
    gap: 12,
  },

  socialIcon: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.1)",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
    transition: "0.3s",
  },

  heading: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 10,
  },

  link: {
    display: "block",
    color: "#9ca3af",
    textDecoration: "none",
    marginBottom: 8,
    fontSize: 14,
  },

  text: {
    color: "#9ca3af",
    fontSize: 14,
    marginBottom: 6,
  },

  newsletter: {
    marginTop: 60,
    padding: 40,
    background: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    textAlign: "center",
    maxWidth: 900,
    marginInline: "auto",
  },

  newsText: {
    color: "#9ca3af",
    fontSize: 14,
    marginBottom: 15,
  },

  newsRow: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap",
  },

  input: {
    padding: "12px 16px",
    borderRadius: 999,
    border: "none",
    width: 220,
  },

  btn: {
    padding: "12px 22px",
    borderRadius: 999,
    border: "none",
    background: "linear-gradient(135deg,#6366f1,#9333ea)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },

  bottom: {
    marginTop: 50,
    padding: 20,
    background: "#020617",
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    fontSize: 13,
  },

  bottomLink: {
    marginLeft: 15,
    color: "#9ca3af",
    textDecoration: "none",
  },

  backToTop: {
    position: "fixed",
    bottom: 25,
    right: 25,
    width: 45,
    height: 45,
    borderRadius: "50%",
    border: "none",
    background: "linear-gradient(135deg,#6366f1,#9333ea)",
    color: "#fff",
    fontSize: 20,
    cursor: "pointer",
    transition: "0.4s",
    zIndex: 999,
  },
};
