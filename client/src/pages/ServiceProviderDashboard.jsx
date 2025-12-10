import React, { useEffect, useState } from "react";
import { ServiceProviderAPI } from "../api/apiService";
// import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function ServiceProviderDashboard() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

        // Using your backend: GET /service-provider/my-services
        const res = await ServiceProviderAPI.myServices();

        setServices(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const onEdit = (s) => {
    localStorage.setItem("editService", JSON.stringify(s));
    nav("/service/edit");
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    try {
      await ServiceProviderAPI.deleteService(id);
      setServices((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Your Services</h2>
      <button onClick={() => nav("/service/new")}>Post New Service</button>
      <ul>
        {services.map((s) => (
          <li key={s._id}>
            <b>{s.title}</b> — ₹{s.price}{" "}
            <button onClick={() => onEdit(s)}>Edit</button>
            <button onClick={() => onDelete(s._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
