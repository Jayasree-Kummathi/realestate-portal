import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ServiceProviderAPI } from "../api/apiService";

export default function EditService() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState({
    title: "",
    description: "",
    price: "",
    images: [],
  });

  const [newImages, setNewImages] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await ServiceProviderAPI.getServiceById(id);
      setService(res.data);
    }
    load();
  }, [id]);

  function handleNewImageChange(e) {
    setNewImages([...newImages, ...Array.from(e.target.files)]);
  }

  function deleteOldImage(index) {
    const updated = [...service.images];
    updated.splice(index, 1);
    setService({ ...service, images: updated });
  }

  function deleteNewImage(index) {
    const updated = [...newImages];
    updated.splice(index, 1);
    setNewImages(updated);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append("title", service.title);
    formData.append("description", service.description);
    formData.append("price", service.price);

    service.images.forEach((img) => {
      formData.append("existingImages", img);
    });

    newImages.forEach((file) => {
      formData.append("images", file);
    });

    await ServiceProviderAPI.updateService(id, formData);
    navigate("/service-my-services");
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Edit Service</h2>

        <form onSubmit={handleSubmit} style={styles.form}>

          {/* Title */}
          <label style={styles.label}>Service Title</label>
          <input
            type="text"
            value={service.title}
            onChange={(e) =>
              setService({ ...service, title: e.target.value })
            }
            style={styles.input}
          />

          {/* Description */}
          <label style={styles.label}>Description</label>
          <textarea
            value={service.description}
            onChange={(e) =>
              setService({ ...service, description: e.target.value })
            }
            style={styles.textarea}
          />

          {/* Price */}
          <label style={styles.label}>Price (₹)</label>
          <input
            type="number"
            value={service.price}
            onChange={(e) =>
              setService({ ...service, price: e.target.value })
            }
            style={styles.input}
          />

          {/* Existing Images */}
          <h3 style={styles.sectionTitle}>Existing Images</h3>
          <div style={styles.imageGrid}>
            {service.images?.map((img, index) => (
              <div key={index} style={styles.imageBox}>
                <img
                  src={`http://localhost:4000${img}`}
                  alt="service"
                  style={styles.image}
                />
                <button
                  type="button"
                  onClick={() => deleteOldImage(index)}
                  style={styles.deleteBtn}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* New Images */}
          <h3 style={styles.sectionTitle}>Add New Images</h3>
          <input type="file" multiple onChange={handleNewImageChange} />

          <div style={styles.imageGrid}>
            {newImages.map((file, index) => (
              <div key={index} style={styles.imageBox}>
                <img
                  src={URL.createObjectURL(file)}
                  alt="new"
                  style={styles.image}
                />
                <button
                  type="button"
                  onClick={() => deleteNewImage(index)}
                  style={styles.deleteBtnNew}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button type="submit" style={styles.submitBtn}>
            Update Service
          </button>
        </form>
      </div>
    </div>
  );
}

/* --------------------------
      MODERN STYLES
--------------------------- */
const styles = {
  page: {
    background: "#f5f7fa",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    paddingTop: 40,
    paddingBottom: 60,
  },

  card: {
    width: "100%",
    maxWidth: 600,
    background: "#fff",
    padding: 30,
    borderRadius: 12,
    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
  },

  heading: {
    textAlign: "center",
    marginBottom: 25,
    fontSize: 26,
    fontWeight: "700",
    color: "#0a66c2",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  label: {
    fontWeight: 600,
    marginBottom: 3,
  },

  input: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #d0d7de",
    outline: "none",
    fontSize: 15,
  },

  textarea: {
    padding: 12,
    minHeight: 100,
    borderRadius: 6,
    border: "1px solid #d0d7de",
    outline: "none",
    fontSize: 15,
  },

  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    fontWeight: 700,
    color: "#333",
  },

  imageGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },

  imageBox: {
    position: "relative",
    width: 120,
    height: 120,
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid #eee",
  },

  deleteBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    background: "#ff3333",
    color: "#fff",
    border: "none",
    width: 26,
    height: 26,
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 14,
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  },

  deleteBtnNew: {
    position: "absolute",
    top: -8,
    right: -8,
    background: "#000",
    color: "#fff",
    border: "none",
    width: 26,
    height: 26,
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 14,
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  },

  submitBtn: {
    marginTop: 25,
    padding: "12px 0",
    fontSize: 16,
    fontWeight: 600,
    color: "#fff",
    background: "#0a66c2",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "0.2s",
  },
};
