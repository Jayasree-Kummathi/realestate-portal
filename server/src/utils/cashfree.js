const axios = require("axios");

/* ======================================================
   CASHFREE CONFIG HELPERS
====================================================== */

// Normalize environment
function getEnv() {
  const env = (process.env.CASHFREE_ENV || "sandbox").toLowerCase();

  if (env === "prod" || env === "production" || env === "live") {
    return "production";
  }
  return "sandbox";
}

// Resolve base URL based on env
function getBaseUrl() {
  const env = getEnv();
  return env === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

// Headers (shared)
function getHeaders(apiVersion = "2023-08-01") {
  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
    throw new Error("❌ Cashfree keys are missing in environment variables");
  }

  return {
    "Content-Type": "application/json",
    "x-api-version": apiVersion,
    "x-client-id": process.env.CASHFREE_APP_ID,
    "x-client-secret": process.env.CASHFREE_SECRET_KEY,
  };
}

/* ======================================================
   CASHFREE API WRAPPER
====================================================== */
const Cashfree = {
  /* ============================
     CREATE ORDER
  ============================ */
  PGCreateOrder: async (apiVersion, orderData) => {
    const baseURL = getBaseUrl();

    try {
      console.log("🔄 Creating Cashfree order");
      console.log("ENV:", getEnv());
      console.log("Base URL:", baseURL);

      const response = await axios.post(
        `${baseURL}/orders`,
        orderData,
        {
          headers: getHeaders(apiVersion),
          timeout: 30000,
        }
      );

      console.log("✅ Order created:", response.data.order_id);
      console.log("✅ payment_session_id:", response.data.payment_session_id);

      return { data: response.data };
    } catch (error) {
      console.error("❌ Cashfree PGCreateOrder Error");
      console.error("Status:", error.response?.status);
      console.error("Data:", error.response?.data);
      throw error;
    }
  },

  /* ============================
     FETCH ORDER
  ============================ */
  PGFetchOrder: async (apiVersion, orderId) => {
    const baseURL = getBaseUrl();

    try {
      const response = await axios.get(
        `${baseURL}/orders/${orderId}`,
        {
          headers: getHeaders(apiVersion),
          timeout: 15000,
        }
      );

      console.log("✅ Order status:", response.data.order_status);
      return { data: response.data };
    } catch (error) {
      console.error("❌ Cashfree PGFetchOrder Error");
      console.error("Data:", error.response?.data);
      throw error;
    }
  },

  /* ============================
     FETCH PAYMENTS
  ============================ */
  PGOrderPayments: async (apiVersion, orderId) => {
    const baseURL = getBaseUrl();

    try {
      const response = await axios.get(
        `${baseURL}/orders/${orderId}/payments`,
        {
          headers: getHeaders(apiVersion),
          timeout: 15000,
        }
      );

      return { data: response.data };
    } catch (error) {
      console.error("❌ Cashfree PGOrderPayments Error");
      console.error("Data:", error.response?.data);
      throw error;
    }
  },
};

module.exports = Cashfree;
