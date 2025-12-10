import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Load user info from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  const navStyle = {
    background: "#fff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    padding: "10px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "sticky",
    top: 0,
    zIndex: 999,
  };

  const linkStyle = {
    textDecoration: "none",
    color: "#333",
    fontWeight: 500,
    margin: "0 10px",
  };

  const btnStyle = {
    background: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    padding: "6px 12px",
    cursor: "pointer",
  };

  return (
    <nav style={navStyle}>
      <div style={{ fontWeight: "bold", fontSize: "20px", color: "#007bff" }}>
        🏠 RealEstate 24X7
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>

        {/* ===========================
            PUBLIC NAVIGATION
        ============================ */}
        {!user && (
          <>
            <Link to="/" style={linkStyle}>Home</Link>
            <Link to="/services" style={linkStyle}>Services</Link>

            {/* NEW SERVICE PROVIDER LOGIN */}
            <Link to="/service-provider-login" style={linkStyle}>
              Service Provider Login
            </Link>

            <Link to="/agent-login" style={linkStyle}>Agent Login</Link>
            <Link to="/admin-login" style={linkStyle}>Admin Login</Link>
          </>
        )}

        {/* ===========================
            AGENT NAVIGATION
        ============================ */}
        {user && user.role === "agent" && (
          <>
            <Link to="/" style={linkStyle}>Home</Link>
            <Link to="/property-form" style={linkStyle}>Post Property</Link>
            <Link to="/agent-dashboard" style={linkStyle}>My Properties</Link>
            <Link to="/agent-enquiries" style={linkStyle}>Enquiries</Link>

            {/* Agent can create Service Providers */}
            <Link to="/service-provider-register" style={linkStyle}>
              Create Service Provider
            </Link>

            <button onClick={handleLogout} style={btnStyle}>Logout</button>
          </>
        )}

        {/* ===========================
            SERVICE PROVIDER NAVIGATION
        ============================ */}
       {user && user.role === "service" && (
  <>
    <Link to="/service-provider-dashboard" style={linkStyle}>
      Dashboard
    </Link>

    <Link to="/service-upload" style={linkStyle}>
      Upload Service
    </Link>

    <Link to="/service-my-services" style={linkStyle}>
      My Services
    </Link>

    <button
      onClick={handleLogout}
      style={{ ...btnStyle, background: "#e67e22" }}
    >
      Logout
    </button>
  </>
)}


        {/* ===========================
            ADMIN NAVIGATION
        ============================ */}
        {user && user.isAdmin && (
          <>
            <Link to="/" style={linkStyle}>Home</Link>
            <Link to="/admin-dashboard" style={linkStyle}>Admin Dashboard</Link>
            <Link to="/admin-manage-agents" style={linkStyle}>Manage Agents</Link>
            <Link to="/admin-manage-services" style={linkStyle}>
              Manage Service Providers
            </Link>
            <Link to="/admin-enquiries" style={linkStyle}>
              All Enquiries
            </Link>

            <button
              onClick={handleLogout}
              style={{ ...btnStyle, background: "#e74c3c" }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
