// client/src/pages/EditPropertyAdvanced.jsx
import React, { useState, useEffect } from "react";
import api from "../api/api";
import { useNavigate, useParams } from "react-router-dom";

export default function EditPropertyAdvanced() {
  const { id } = useParams();
  const nav = useNavigate();

  const stored = localStorage.getItem("editProperty");
  const initial = stored ? JSON.parse(stored) : null;

  const [property, setProperty] = useState(initial);
  const [loading, setLoading] = useState(!initial);
  const [msg, setMsg] = useState("");

  const [imagesToUpload, setImagesToUpload] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [removeImageIndexes, setRemoveImageIndexes] = useState(new Set());
  const [videoFile, setVideoFile] = useState(null);

  const BASE_URL = "http://localhost:4000";

  /* ---------------- LOAD PROPERTY ---------------- */
  useEffect(() => {
    async function init() {
      try {
        if (!initial && id) {
          const { data } = await api.get(`/properties/${id}`);
          setProperty(data);
          setExistingImages(data.images || []);
        } else if (initial) {
          setExistingImages(initial.images || []);
        }
      } catch (err) {
        console.error("Load error:", err);
        setMsg("Failed to load property.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id]);

  if (loading) return <div style={styles.container}><p>Loading…</p></div>;
  if (!property) return <div style={styles.container}><p>No property selected for edit.</p></div>;

  /* ---------------- FIELD UPDATES ---------------- */
  const handleChange = (e) => {
    setProperty({
      ...property,
      [e.target.name]: e.target.value,
    });
  };

  const onImagesSelected = (e) => {
    const files = Array.from(e.target.files);
    setImagesToUpload((prev) => prev.concat(files));
    setPreviewImages((prev) => prev.concat(files.map((f) => URL.createObjectURL(f))));
  };

  const removeNewImage = (index) => {
    setImagesToUpload((prev) => prev.filter((_, i) => i !== index));
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleRemoveExistingImage = (index) => {
    const updated = new Set(removeImageIndexes);
    if (updated.has(index)) updated.delete(index);
    else updated.add(index);
    setRemoveImageIndexes(updated);
  };

  /* ---------------- VIDEO ---------------- */
  const handleVideoChoose = (e) => {
    setVideoFile(e.target.files[0]);
  };

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const fd = new FormData();

      fd.append("title", property.title || "");
      fd.append("description", property.description || "");
      fd.append("price", property.price || "");
      fd.append("areaName", property.areaName || "");
      fd.append("address", property.address || "");
      fd.append("nearbyHighway", property.nearbyHighway || "");
      fd.append("listingType", property.listingType || "Sell");


      if (removeImageIndexes.size > 0) {
        fd.append("removeImages", JSON.stringify(Array.from(removeImageIndexes)));
      }

      imagesToUpload.forEach((f) => fd.append("images", f));

      if (videoFile) fd.append("video", videoFile);

      const res = await api.put(`/properties/${property._id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = res.data.property || res.data;

      localStorage.setItem("editProperty", JSON.stringify(updated));
      setMsg("✅ Property updated!");

      setTimeout(() => nav("/view-properties"), 900);

    } catch (err) {
      console.error(err);
      setMsg("❌ Update failed: " + (err.response?.data?.error || err.message));
    }
  };

  /* ---------------- AUTH CHECK ---------------- */
  const canEdit = (() => {
    const me = JSON.parse(localStorage.getItem("user") || "{}");
    if (me.isAdmin) return true;

    return (
      property.agent?._id === me._id ||
      property.owner?._id === me._id
    );
  })();

  return (
    <div style={styles.container}>
      <h2>Edit Property</h2>

      {!canEdit && (
        <p style={{ color: "red" }}>You are not allowed to edit this property.</p>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.row}>
          <label style={styles.label}>
            Title
            <input
              name="title"
              value={property.title || ""}
              onChange={handleChange}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Price (₹)
            <input
              name="price"
              type="number"
              value={property.price || ""}
              onChange={handleChange}
              style={styles.input}
            />
          </label>
        </div>

        <div style={styles.row}>
  <label style={styles.label}>
    Listing Type
    <select
      name="listingType"
      value={property.listingType || "Sell"}
      onChange={handleChange}
      style={styles.input}
    >
      <option value="Sell">For Sale</option>
      <option value="Rent">For Rent</option>
      <option value="Lease">For Lease</option>
      <option value="PG">PG / Hostel</option>
      <option value="Farm Lease">Farm Lease</option>
      <option value="Others">Others</option>
    </select>
  </label>
</div>


        <label style={styles.label}>
          Description
          <textarea
            name="description"
            value={property.description || ""}
            onChange={handleChange}
            style={styles.textarea}
          />
        </label>

        <div style={styles.row}>
          <label style={styles.label}>
            Area Name
            <input
              name="areaName"
              value={property.areaName || ""}
              onChange={handleChange}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Nearby Highway
            <input
              name="nearbyHighway"
              value={property.nearbyHighway || ""}
              onChange={handleChange}
              style={styles.input}
            />
          </label>
        </div>

        <label style={styles.label}>
          Address
          <input
            name="address"
            value={property.address || ""}
            onChange={handleChange}
            style={styles.input}
          />
        </label>

        {/* Existing Images */}
        <h4>Existing Images</h4>
        <div style={styles.thumbRow}>
          {existingImages.map((img, index) => {
            const url = img.startsWith("/uploads") ? BASE_URL + img : img;
            const marked = removeImageIndexes.has(index);
            return (
              <div key={index} style={styles.thumb}>
                <img src={url} style={styles.thumbImg} />
                <button
                  type="button"
                  onClick={() => toggleRemoveExistingImage(index)}
                  style={marked ? styles.unremoveBtn : styles.removeBtn}
                >
                  {marked ? "Undo" : "Remove"}
                </button>
              </div>
            );
          })}
        </div>

        {/* New Images */}
        <h4>Add Images</h4>
        <input type="file" multiple accept="image/*" onChange={onImagesSelected} />

        <div style={styles.thumbRow}>
          {previewImages.map((url, index) => (
            <div key={index} style={styles.thumb}>
              <img src={url} style={styles.thumbImg} />
              <button type="button" onClick={() => removeNewImage(index)} style={styles.removeBtn}>
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Video */}
        <h4>Video</h4>
        <p>
          Existing:{" "}
          {property.videoUrl ? (
            <a href={BASE_URL + property.videoUrl} target="_blank">
              View Video
            </a>
          ) : (
            "None"
          )}
        </p>
        <input type="file" accept="video/*" onChange={handleVideoChoose} />

        {/* Buttons */}
        <div style={{ marginTop: 20 }}>
          <button type="button" onClick={() => nav(-1)} style={styles.cancelBtn}>
            Cancel
          </button>
          <button type="submit" style={styles.saveBtn}>
            Save
          </button>
        </div>

        {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
      </form>
    </div>
  );
}

/* ------------ STYLES ------------ */
const styles = {
  container: { padding: 20, maxWidth: 900, margin: "0 auto" },
  form: { display: "block" },
  row: { display: "flex", gap: 12 },
  label: { display: "block", flex: 1, marginBottom: 12 },
  input: { width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 },
  textarea: { width: "100%", minHeight: 100, padding: 8, border: "1px solid #ccc", borderRadius: 6 },
  thumbRow: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 },
  thumb: { width: 130, border: "1px solid #eee", borderRadius: 6, padding: 6, textAlign: "center" },
  thumbImg: { width: "100%", height: 90, objectFit: "cover", borderRadius: 6 },
  removeBtn: { padding: "5px 8px", background: "#e74c3c", color: "#fff", borderRadius: 6, border: "none" },
  unremoveBtn: { padding: "5px 8px", background: "#888", color: "#fff", borderRadius: 6, border: "none" },
  saveBtn: { padding: "8px 14px", background: "#007bff", color: "#fff", border: "none", borderRadius: 6, marginLeft: 8 },
  cancelBtn: { padding: "8px 14px", background: "#ccc", border: "none", borderRadius: 6 },
};
