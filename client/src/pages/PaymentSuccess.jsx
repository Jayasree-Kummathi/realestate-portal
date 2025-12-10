// client/src/pages/PaymentSuccess.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function PaymentSuccess() {
  const [message, setMessage] = useState("Finalizing registration...");

  useEffect(() => {
    localStorage.removeItem("pendingAgent");
    setMessage("🎉 Payment successful — your agent account is activated. Please login.");
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>✅ Payment Successful</h2>
      <p>{message}</p>
      <p><Link to="/agent-login">Go to Agent Login</Link></p>
    </div>
  );
}
