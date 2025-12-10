// client/src/pages/ServiceProviderDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";

export default function ServiceProviderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  async function load() {
    try {
      setLoading(true);

      // 1️⃣ Load Provider Details (logged-in provider)
      const providerRes = await api.get(`/service-provider/me`);
      setProvider(providerRes.data);

      // 2️⃣ Load Provider Services (correct route)
      const serviceRes = await api.get(`/service-provider/my-services`);
      setServices(serviceRes.data.services || serviceRes.data || []);
      
    } catch (err) {
      console.error("Failed to load provider details:", err);
    } finally {
      setLoading(false);
    }
  }

  load();
}, []);


  if (loading)
    return <h3 style={{ textAlign: "center", marginTop: 30 }}>Loading...</h3>;

  if (!provider)
    return <h3 style={{ textAlign: "center", marginTop: 30 }}>Provider not found</h3>;

  return (
    <div style={{ padding: "30px" }}>
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          marginBottom: "15px",
          padding: "6px 12px",
          borderRadius: "5px",
          border: "1px solid #aaa",
          cursor: "pointer",
        }}
      >
        ← Back
      </button>

      {/* Profile Card */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          background: "#f1f5f9",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ marginBottom: 5 }}>{provider.name}</h2>
          <p>Email: {provider.email}</p>
          <p>Phone: {provider.phone}</p>

          <p>
            Status:{" "}
            <b
              style={{
                color: provider.status === "active" ? "green" : "red",
              }}
            >
              {provider.status}
            </b>
          </p>

          <p>
            Category: <b>{provider.serviceCategory}</b>
          </p>

          <p>
            Services:{" "}
            <b>{provider.serviceTypes?.join(", ") || "None"}</b>
          </p>

          {/* Referral Details */}
          {provider.referralAgent && (
            <p>
              Referred By:{" "}
              <b>
                {provider.referralAgent.name} ({provider.referralAgent.email})
              </b>
            </p>
          )}
        </div>

        <div style={{ textAlign: "right" }}>
          <h3 style={{ marginBottom: 0 }}>{services.length}</h3>
          <p>Services Uploaded</p>
        </div>
      </div>

      {/* Documents Section */}
      <h3>Documents</h3>
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "25px",
          flexWrap: "wrap",
        }}
      >
        <DocCard title="Aadhar" file={provider.documents?.aadhar} />
        <DocCard title="Voter ID" file={provider.documents?.voterId} />
        {provider.documents?.pan && (
          <DocCard title="PAN" file={provider.documents.pan} />
        )}
      </div>

      <hr />

      {/* Services */}
      <h3>Uploaded Services</h3>

      {services.length === 0 ? (
        <p>No services uploaded yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          {services.map((s) => (
            <div
              key={s._id}
              style={{
                background: "#fff",
                padding: "15px",
                borderRadius: "10px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              }}
            >
              <h4>{s.title}</h4>
              <p>
                <b>₹{s.price}</b>
              </p>
              <p style={{ fontSize: "14px", color: "#555" }}>{s.description}</p>

              {s.images?.length > 0 && (
                <img
                  src={`http://localhost:4000/${s.images[0].replace(/^\//, "")}`}

                  alt="service"
                  style={{
                    width: "100%",
                    height: "160px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    marginTop: "10px",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------- */
/* Reusable Document Card      */
/* --------------------------- */
function DocCard({ title, file }) {
  if (!file) return null;

  return (
    <div
      style={{
        background: "#8b1515ff",
        padding: "12px 15px",
        borderRadius: "8px",
        width: "220px",
        border: "1px solid #ddd",
      }}
    >
      <b>{title}</b>
      <img
        src={`http://localhost:4000/${file}`}
        alt={title}
        style={{
          width: "100%",
          height: "220px",
          objectFit: "cover",
          marginTop: "10px",
          borderRadius: "6px",
        }}
      />
    </div>
  );
}
