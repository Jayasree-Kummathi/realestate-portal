import React, { useEffect, useState } from "react";
import api from "../../api/api";

export default function AdminCompanyList() {
  const [list, setList] = useState([]);

  useEffect(() => {
    api.get("/company-banners").then((res) => setList(res.data));
  }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete this company?")) return;
    await api.delete(`/company-banners/${id}`);
    setList(list.filter((x) => x._id !== id));
  };

  return (
    <div className="admin-card">
      <h2>🏢 Company Banners</h2>

      {list.map((c) => (
        <div key={c._id} className="admin-row">
          <img src={c.image} width="110" alt="" />
          <div>
            <b>{c.companyName}</b>
            <p>{c.serviceCategory}</p>
          </div>
          <button onClick={() => remove(c._id)}>🗑 Delete</button>
        </div>
      ))}
    </div>
  );
}
