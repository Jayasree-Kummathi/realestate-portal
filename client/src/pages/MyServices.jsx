import React, { useEffect, useState } from "react";
import { ServiceProviderAPI } from "../api/apiService";
import { useNavigate } from "react-router-dom";

function MyServices() {
  const [services, setServices] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const navigate = useNavigate();

  // Load Services
  useEffect(() => {
    async function load() {
      try {
        const res = await ServiceProviderAPI.myServices();
        setServices(res.data);
      } catch (err) {
        console.error("❌ Failed to load services:", err);
      }
    }
    load();
  }, []);

  // Delete Service
  async function handleDelete(id) {
    try {
      await ServiceProviderAPI.deleteService(id);
      setServices(services.filter((s) => s._id !== id));
      setDeletingId(null);
    } catch (err) {
      console.error("❌ Delete failed:", err);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>My Uploaded Services</h2>

      {services.length === 0 && <p>No services uploaded yet.</p>}

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
            <h3>{s.title}</h3>
            <p>
              <b>₹{s.price}</b>
            </p>

            <p style={{ fontSize: "14px", color: "#555" }}>
              {s.description}
            </p>

            {/* ===========================
                SERVICE IMAGE
            ============================ */}
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

            {/* ===========================
                BUTTONS
            ============================ */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "15px",
              }}
            >
              {/* Edit Button */}
              <button
                onClick={() => navigate(`/service/edit/${s._id}`)}
                style={{
                  padding: "6px 12px",
                  background: "#0a66c2",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>

              {/* Delete Button */}
              <button
                onClick={() => setDeletingId(s._id)}
                style={{
                  padding: "6px 12px",
                  background: "red",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ===========================
          DELETE CONFIRMATION MODAL
      ============================ */}
      {deletingId && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: 25,
              borderRadius: 10,
              width: "300px",
              textAlign: "center",
            }}
          >
            <h3>Delete Service?</h3>
            <p>This action cannot be undone.</p>

            <div
              style={{
                display: "flex",
                justifyContent: "space-around",
                marginTop: "15px",
              }}
            >
              <button
                onClick={() => setDeletingId(null)}
                style={{
                  padding: "7px 14px",
                  background: "#888",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={() => handleDelete(deletingId)}
                style={{
                  padding: "7px 14px",
                  background: "red",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyServices;
