const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const jwt = require('jsonwebtoken'); // Add this line

const Cashfree = require("../utils/cashfree");
const Agent = require("../models/Agent");
const ServiceProvider = require("../models/ServiceProvider");
const { sendWelcomeEmail } = require("../utils/emailTemplates");


const router = express.Router();

/* =====================================================
   📁 Upload Folders Setup
===================================================== */
const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");
const AGENT_DOCS_DIR = path.join(UPLOADS_ROOT, "agent-docs");
const SERVICE_DOCS_DIR = path.join(UPLOADS_ROOT, "service-docs");
const TEMP_AGENTS_DIR = path.join(UPLOADS_ROOT, "tempAgents");
const TEMP_PROVIDERS_DIR = path.join(UPLOADS_ROOT, "tempProviders");

// Ensure directories exist
[UPLOADS_ROOT, AGENT_DOCS_DIR, SERVICE_DOCS_DIR, TEMP_AGENTS_DIR, TEMP_PROVIDERS_DIR]
  .forEach(dir => !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true }));

/* =====================================================
   📝 Multer Configuration for File Uploads
===================================================== */
const uploadStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, SERVICE_DOCS_DIR),
  filename: (_, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/* =====================================================
   🛠️ URL Helper Functions
===================================================== */
function buildReturnUrl(orderId, tempId, userType = "agent") {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const path = userType === "agent" ? "agent-payment-success" : "provider-payment-success";
  
  // IMPORTANT: Don't use template placeholder {order_id}, use actual orderId
  return `${clientUrl}/${path}?order_id=${orderId}&tempId=${tempId}`;
}

function buildNotifyUrl() {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
  return `${backendUrl}/api/payments/cashfree-webhook`;
}

function ensureHttpsForProduction(url) {
  const isProduction = process.env.CASHFREE_ENV === "PROD";
  if (isProduction && url && url.startsWith("http://")) {
    // For production, we need HTTPS
    // If using localhost in production, this will fail - use ngrok or switch to SANDBOX
    return url.replace("http://", "https://");
  }
  return url;
}

/* =====================================================
   1️⃣ AGENT — CREATE CASHFREE ORDER (FIXED)
===================================================== */
router.post("/agent/create-order", express.json(), async (req, res) => {
  try {
    console.log("🔵 Agent create-order request received");
    
    const { pendingAgent } = req.body;
    if (!pendingAgent) {
      return res.status(400).json({ error: "Missing agent data" });
    }

    const tempId = crypto.randomBytes(10).toString("hex");
    console.log("Generated tempId:", tempId);

    // Save temporary data
    const tempData = {
      tempId, 
      pendingAgent,
      paymentGateway: "cashfree",
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(TEMP_AGENTS_DIR, `${tempId}.json`),
      JSON.stringify(tempData, null, 2)
    );

    // Cashfree order creation
    const orderId = `AGT_${Date.now()}_${tempId.substring(0, 8)}`;
    console.log("Generated orderId:", orderId);
    
    // Build URLs
    let returnUrl = buildReturnUrl(orderId, tempId, "agent");
    let notifyUrl = buildNotifyUrl();
    
    // For production, ensure HTTPS
    if (process.env.CASHFREE_ENV === "PROD") {
      returnUrl = ensureHttpsForProduction(returnUrl);
      notifyUrl = ensureHttpsForProduction(notifyUrl);
      
      // Check if we're trying to use localhost in production
      if (returnUrl.includes("localhost") || returnUrl.includes("127.0.0.1")) {
        console.warn("⚠️ WARNING: Using localhost in production mode. This will likely fail!");
        console.warn("   Consider:");
        console.warn("   1. Switching to CASHFREE_ENV=SANDBOX");
        console.warn("   2. Using ngrok for HTTPS URLs");
        console.warn("   3. Using actual domain names with HTTPS");
      }
    }

    const orderData = {
      order_id: orderId,
      order_amount: parseInt(process.env.SUBSCRIPTION_AMOUNT_INR || 1500),
      order_currency: "INR",
      customer_details: {
        customer_id: tempId,
        customer_email: pendingAgent.email,
        customer_phone: pendingAgent.phone,
        customer_name: pendingAgent.name,
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
      },
      order_note: "Agent Registration Payment",
    };

    console.log("Order data being sent to Cashfree:", {
      order_id: orderData.order_id,
      amount: orderData.order_amount,
      return_url: orderData.order_meta.return_url,
      environment: process.env.CASHFREE_ENV
    });

    // Create Cashfree order
    const response = await Cashfree.PGCreateOrder("2023-08-01", orderData);
    
    console.log("✅ Cashfree order created:", response.data.order_id);

    return res.json({
      success: true,
      paymentGateway: "cashfree",
      tempId,
      order: response.data,
      payment_session_id: response.data.payment_session_id,
    });

  } catch (err) {
    console.error("❌ Agent Order Creation Error:", err.message);
    
    // Provide helpful error messages
    let userMessage = "Order creation failed";
    if (err.response?.data?.message?.includes("return_url")) {
      userMessage = "Payment gateway requires HTTPS URLs for production. Please switch to SANDBOX mode for local testing.";
    } else if (err.message.includes("network") || err.message.includes("timeout")) {
      userMessage = "Network error. Please check your internet connection.";
    }
    
    res.status(500).json({ 
      success: false,
      error: userMessage,
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});

/* =====================================================
   2️⃣ AGENT — VERIFY PAYMENT
===================================================== */
/* =====================================================
   2️⃣ AGENT — VERIFY PAYMENT
===================================================== */
router.post("/agent/verify", express.json(), async (req, res) => {
  try {
    console.log("🔵 Agent verify request received");

    const { tempId, cashfree_order_id, voterIdBase64 } = req.body;

    if (!tempId || !cashfree_order_id) {
      return res.status(400).json({
        success: false,
        error: "Missing tempId or Cashfree order ID",
      });
    }

    const tempFile = path.join(TEMP_AGENTS_DIR, `${tempId}.json`);
    if (!fs.existsSync(tempFile)) {
      return res.status(400).json({
        success: false,
        error: "Session expired. Please restart registration.",
      });
    }

    const savedData = JSON.parse(fs.readFileSync(tempFile));
    const { pendingAgent: a } = savedData;

    /* =====================================================
       ✅ STEP 1: VERIFY ACTUAL PAYMENT (NOT ORDER STATUS)
    ===================================================== */
    let successfulPayment;

    try {
      const paymentsRes = await Cashfree.PGOrderPayments(
        "2023-08-01",
        cashfree_order_id
      );

      successfulPayment = paymentsRes.data.find(
        (p) => p.payment_status === "SUCCESS"
      );

      if (!successfulPayment) {
        return res.status(400).json({
          success: false,
          error: "Payment not completed. Agent not created.",
        });
      }
    } catch (err) {
      console.error("❌ Cashfree payment verification failed:", err.message);
      return res.status(400).json({
        success: false,
        error: "Unable to verify payment. Please try again.",
      });
    }

    /* =====================================================
       ✅ STEP 2: PREVENT DUPLICATE AGENT
    ===================================================== */
    const existingAgent = await Agent.findOne({ email: a.email });
    if (existingAgent) {
      try { fs.unlinkSync(tempFile); } catch {}
      return res.json({
        success: true,
        existing: true,
        message: "Account already exists. Please login.",
        agentId: existingAgent._id,
      });
    }

    /* =====================================================
       ✅ STEP 3: SAVE VOTER ID (OPTIONAL)
    ===================================================== */
    let voterPath = null;

    if (voterIdBase64?.startsWith("data:image")) {
      const base64 = voterIdBase64.replace(/^data:image\/\w+;base64,/, "");
      const fileName = `voter-${Date.now()}-${tempId.slice(0, 8)}.png`;
      voterPath = `uploads/agent-docs/${fileName}`;
      fs.writeFileSync(
        path.join(AGENT_DOCS_DIR, fileName),
        Buffer.from(base64, "base64")
      );
    }

    /* =====================================================
       ✅ STEP 4: CREATE SUBSCRIPTION (LIKE RAZORPAY)
    ===================================================== */
    const subscription = {
      active: true,
      paidAt: new Date(successfulPayment.payment_time),
      paymentGateway: "cashfree",

      cashfreeOrderId: cashfree_order_id,
      cashfreePaymentId: successfulPayment.cf_payment_id,

      amount: successfulPayment.payment_amount,
      currency: successfulPayment.payment_currency,
      paymentStatus: successfulPayment.payment_status,
    };

    /* =====================================================
       ✅ STEP 5: CREATE AGENT
    ===================================================== */
    const newAgent = new Agent({
      agentId: `AGT-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`,
      name: a.name,
      email: a.email,
      phone: a.phone,
      password: a.password,
      profession: a.profession,

      referralMarketingExecutiveName: a.referralMarketingExecutiveName || null,
      referralMarketingExecutiveId: a.referralMarketingExecutiveId || null,

      documents: { voterId: voterPath },
      subscription,
      status: "active",
      createdAt: new Date(),
      lastLogin: new Date(),
    });

    await newAgent.save();

    /* =====================================================
       ✅ STEP 6: SEND WELCOME EMAIL TO AGENT
    ===================================================== */
    let emailSent = false;
    let emailError = null;
    
    try {
      console.log("📧 Attempting to send welcome email to agent:", newAgent.email);
      
      const emailResult = await sendWelcomeEmail({
        to: newAgent.email,
        name: newAgent.name,
        role: "agent", // Changed from "service-provider" to "agent"
      });
      
      emailSent = true;
      console.log("✅ Welcome email sent to agent:", newAgent.email);
      
      if (emailResult) {
        console.log("📧 Email function returned:", emailResult);
      }
    } catch (emailErr) {
      emailError = emailErr.message;
      console.error("❌ Agent welcome email FAILED:", newAgent.email);
      console.error("Email error:", {
        message: emailErr.message,
        stack: emailErr.stack,
      });
      
      console.log("⚠️ Continuing agent registration despite email failure...");
    }

    /* =====================================================
       ✅ STEP 7: GENERATE LOGIN TOKEN FOR AUTO-LOGIN
    ===================================================== */
    console.log("🔑 Generating JWT token for agent...");
    
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    
    const loginToken = jwt.sign(
      {
        id: newAgent._id,
        email: newAgent.email,
        role: "agent", // Changed from "service-provider" to "agent"
        createdAt: new Date().toISOString()
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    
    console.log("✅ Agent JWT token generated");

    /* =====================================================
       ✅ STEP 8: CLEAN TEMP FILE
    ===================================================== */
    try { 
      fs.unlinkSync(tempFile); 
      console.log("🧹 Cleared agent temp file");
    } catch (cleanupErr) {
      console.error("⚠️ Failed to delete agent temp file:", cleanupErr.message);
    }

    /* =====================================================
       ✅ STEP 9: SEND RESPONSE
    ===================================================== */
    return res.json({
      success: true,
      message: "Registration successful!",
      agentId: newAgent._id,
      agentCode: newAgent.agentId,
      email: newAgent.email,
      name: newAgent.name,
      loginToken: loginToken, // Added login token
      emailSent, // Added email status
      emailError: emailError || undefined, // Added error info if any
    });

  } catch (err) {
    console.error("❌ Agent Verification Error:", err.message);
    console.error("Full error stack:", err.stack);
    
    return res.status(500).json({
      success: false,
      error: "Registration failed. Please contact support.",
      internalError: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/* =====================================================
   3️⃣ SERVICE PROVIDER — CREATE ORDER (FIXED)
===================================================== */
router.post(
  "/service-provider/create-order",
  upload.fields([
    { name: "aadhar", maxCount: 1 },
    { name: "voter", maxCount: 1 },
    { name: "pan", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log("🔵 Service provider create-order request received");
      
      const {
        name,
        email,
        phone,
        password,
        serviceCategory,
        selectedServices,
        referralName,
        referralEmail,
        referralMarketingExecutiveName,
        referralMarketingExecutiveId,
      } = req.body;

      if (!name || !email || !phone || !password) {
        return res.status(400).json({ 
          success: false,
          error: "Missing required fields: name, email, phone, password" 
        });
      }

      const tempId = crypto.randomBytes(10).toString("hex");
      console.log("Generated tempId:", tempId);

      // Prepare provider data
      const providerData = {
        name,
        email,
        phone,
        password,
        serviceCategory,
        selectedServices: selectedServices ? JSON.parse(selectedServices) : [],
        referralName,
        referralEmail,
        referralMarketingExecutiveName,
        referralMarketingExecutiveId,
      };

      // Save temporary data
      const tempData = {
        tempId,
        provider: providerData,
        files: {
          aadhar: `uploads/service-docs/${req.files.aadhar[0].filename}`,
          voterId: `uploads/service-docs/${req.files.voter[0].filename}`,
          pan: req.files.pan ? `uploads/service-docs/${req.files.pan[0].filename}` : null,
        },
        paymentGateway: "cashfree",
        createdAt: new Date().toISOString()
      };
      
      fs.writeFileSync(
        path.join(TEMP_PROVIDERS_DIR, `${tempId}.json`),
        JSON.stringify(tempData, null, 2)
      );

      // Cashfree order
      const orderId = `SP_${Date.now()}_${tempId.substring(0, 8)}`;
      console.log("Generated orderId:", orderId);
      
      // Build URLs
      let returnUrl = buildReturnUrl(orderId, tempId, "provider");
      let notifyUrl = buildNotifyUrl();
      
      // For production, ensure HTTPS
      if (process.env.CASHFREE_ENV === "PROD") {
        returnUrl = ensureHttpsForProduction(returnUrl);
        notifyUrl = ensureHttpsForProduction(notifyUrl);
      }

      const orderData = {
        order_id: orderId,
        order_amount: parseInt(process.env.SUBSCRIPTION_AMOUNT_INR || 1500),
        order_currency: "INR",
        customer_details: {
          customer_id: tempId,
          customer_email: email,
          customer_phone: phone,
          customer_name: name,
        },
        order_meta: {
          return_url: returnUrl,
          notify_url: notifyUrl,
        },
        order_note: "Service Provider Registration Payment",
      };

      console.log("Creating Cashfree order for provider:", {
        order_id: orderData.order_id,
        customer_email: orderData.customer_details.customer_email
      });

      const response = await Cashfree.PGCreateOrder("2023-08-01", orderData);

      console.log("✅ Cashfree order created:", response.data.order_id);

      return res.json({
        success: true,
        paymentGateway: "cashfree",
        tempId,
        order: response.data,
        payment_session_id: response.data.payment_session_id,
      });
    } catch (err) {
      console.error("❌ Service Provider Order Error:", err.message);
      
      let userMessage = "Order creation failed";
      if (err.response?.data?.message?.includes("return_url")) {
        userMessage = "Payment gateway requires HTTPS URLs for production. Please switch to SANDBOX mode for local testing.";
      }
      
      res.status(500).json({ 
        success: false,
        error: userMessage,
        details: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }
  }
);

/* =====================================================
   4️⃣ SERVICE PROVIDER — VERIFY PAYMENT
===================================================== */
router.post("/service-provider/verify", express.json(), async (req, res) => {
  let tempFile = null;
  let emailSentSuccessfully = false;
  
  console.log("🔵 Service provider verify request received");
  console.log("Request body:", { tempId: req.body.tempId, cashfree_order_id: req.body.cashfree_order_id });

  try {
    const { tempId, cashfree_order_id } = req.body;

    if (!tempId || !cashfree_order_id) {
      console.error("❌ Missing parameters:", { tempId, cashfree_order_id });
      return res.status(400).json({
        success: false,
        error: "Missing tempId or Cashfree order ID",
      });
    }

    tempFile = path.join(TEMP_PROVIDERS_DIR, `${tempId}.json`);
    console.log("📁 Temp file path:", tempFile);
    
    if (!fs.existsSync(tempFile)) {
      console.error("❌ Temp file does not exist:", tempFile);
      return res.status(400).json({
        success: false,
        error: "Session expired. Please restart registration.",
      });
    }

    const tempData = JSON.parse(fs.readFileSync(tempFile));
    const { provider: p, files } = tempData;
    
    console.log("📝 Provider data from temp file:", { 
      email: p.email, 
      name: p.name,
      hasFiles: !!files 
    });

    /* =====================================================
       ✅ STEP 1: VERIFY ACTUAL PAYMENT
    ===================================================== */
    let successfulPayment;
    console.log("🔄 Verifying Cashfree payment for order:", cashfree_order_id);

    try {
      const paymentsRes = await Cashfree.PGOrderPayments(
        "2023-08-01",
        cashfree_order_id
      );

      successfulPayment = paymentsRes.data.find(
        (pay) => pay.payment_status === "SUCCESS"
      );

      if (!successfulPayment) {
        console.error("❌ No successful payment found for order:", cashfree_order_id);
        console.log("All payments:", paymentsRes.data);
        return res.status(400).json({
          success: false,
          error: "Payment not completed. Registration blocked.",
        });
      }
      
      console.log("✅ Payment verified:", {
        payment_id: successfulPayment.cf_payment_id,
        amount: successfulPayment.payment_amount,
        status: successfulPayment.payment_status,
        time: successfulPayment.payment_time
      });
    } catch (err) {
      console.error("❌ Cashfree payment verification failed:", err.message);
      console.error(err.stack);
      return res.status(400).json({
        success: false,
        error: "Unable to verify payment. Please try again.",
      });
    }

    /* =====================================================
       ✅ STEP 2: PREVENT DUPLICATE PROVIDER
    ===================================================== */
    console.log("🔍 Checking for existing provider with email:", p.email);
    const existingProvider = await ServiceProvider.findOne({ email: p.email });
    if (existingProvider) {
      console.log("⚠️ Provider already exists:", existingProvider._id);
      try { 
        fs.unlinkSync(tempFile); 
        console.log("🧹 Cleared temp file for existing provider");
      } catch (fileErr) {
        console.error("⚠️ Failed to delete temp file:", fileErr.message);
      }
      return res.json({
        success: true,
        existing: true,
        message: "Account already exists. Please login.",
        providerId: existingProvider._id,
        email: existingProvider.email,
        name: existingProvider.name,
      });
    }

    /* =====================================================
       ✅ STEP 3: CREATE SUBSCRIPTION (PROPER)
    ===================================================== */
    const subscription = {
      active: true,
      paidAt: new Date(successfulPayment.payment_time),
      paymentGateway: "cashfree",
      cashfreeOrderId: cashfree_order_id,
      cashfreePaymentId: successfulPayment.cf_payment_id,
      amount: successfulPayment.payment_amount,
      currency: successfulPayment.payment_currency,
      paymentStatus: successfulPayment.payment_status,
    };
    
    console.log("📅 Subscription created:", subscription);

    /* =====================================================
       ✅ STEP 4: CREATE SERVICE PROVIDER
    ===================================================== */
    const newProvider = new ServiceProvider({
      name: p.name,
      email: p.email,
      phone: p.phone,
      password: p.password,
      serviceCategory: p.serviceCategory,
      serviceTypes: p.selectedServices || [],
      referral: {
        name: p.referralName,
        email: p.referralEmail,
      },
      referralMarketingExecutiveName: p.referralMarketingExecutiveName || null,
      referralMarketingExecutiveId: p.referralMarketingExecutiveId || null,
      documents: files,
      status: "active",
      subscription,
      createdAt: new Date(),
    });

    console.log("💾 Saving new provider to database...");
    await newProvider.save();
    console.log("✅ Provider saved with ID:", newProvider._id);

    /* =====================================================
       ✅ STEP 5: SEND WELCOME EMAIL (WITH ENHANCED LOGGING)
    ===================================================== */
    console.log("📧 Attempting to send welcome email to:", newProvider.email);
    
    try {
      // Log the email parameters being sent
      console.log("Email parameters:", {
        to: newProvider.email,
        name: newProvider.name,
        role: "service-provider"
      });
      
      // Call the email function and await its result
      const emailResult = await sendWelcomeEmail({
        to: newProvider.email,
        name: newProvider.name,
        role: "service-provider",
      });
      
      emailSentSuccessfully = true;
      console.log("✅ Welcome email sent to:", newProvider.email);
      
      // If the email function returns something, log it
      if (emailResult) {
        console.log("📧 Email function returned:", emailResult);
      }
    } catch (emailErr) {
      // Log the FULL error, not just the message
      console.error("❌ Email sending FAILED for:", newProvider.email);
      console.error("Email error details:", {
        message: emailErr.message,
        stack: emailErr.stack,
        code: emailErr.code,
        response: emailErr.response
      });
      
      // Check if it's a specific type of error
      if (emailErr.response) {
        console.error("Email API response:", {
          status: emailErr.response.status,
          data: emailErr.response.data,
          headers: emailErr.response.headers
        });
      }
      
      // Don't fail the registration if email fails
      console.log("⚠️ Continuing registration despite email failure...");
    }

    /* =====================================================
       ✅ STEP 6: GENERATE LOGIN TOKEN FOR AUTO-LOGIN
    ===================================================== */
    console.log("🔑 Generating JWT token...");
    
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    
    const loginToken = jwt.sign(
      {
        id: newProvider._id,
        email: newProvider.email,
        role: "service-provider",
        createdAt: new Date().toISOString()
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" } // Extended for better user experience
    );
    
    console.log("✅ JWT token generated");

    /* =====================================================
       ✅ STEP 7: PREPARE FINAL RESPONSE
    ===================================================== */
    const responseData = {
      success: true,
      providerId: newProvider._id,
      message: "Registration successful!",
      email: newProvider.email,
      name: newProvider.name,
      loginToken: loginToken,
      redirectUrl: "/service-provider-dashboard",
      emailSent: emailSentSuccessfully, // Include email status in response
      timestamp: new Date().toISOString()
    };
    
    console.log("📤 Sending response:", {
      providerId: responseData.providerId,
      email: responseData.email,
      emailSent: responseData.emailSent,
      hasToken: !!responseData.loginToken
    });

    return res.json(responseData);

  } catch (err) {
    console.error("❌ Service Provider Verification Error:", err.message);
    console.error("Full error stack:", err.stack);
    
    // Log additional context for debugging
    console.error("Error context:", {
      tempFileExists: tempFile ? fs.existsSync(tempFile) : 'tempFile not set',
      email: req.body?.email || 'unknown'
    });
    
    return res.status(500).json({
      success: false,
      error: "Registration failed. Please contact support.",
      // Only include internal details in development
      internalError: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    /* =====================================================
       ✅ STEP 8: CLEAN TEMP FILE (Always runs, success or error)
    ===================================================== */
    if (tempFile && fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
        console.log("🧹 Cleared temp file:", tempFile);
      } catch (cleanupErr) {
        console.error("⚠️ Failed to delete temp file:", cleanupErr.message);
      }
    } else if (tempFile) {
      console.log("ℹ️ Temp file already removed or didn't exist:", tempFile);
    }
    
    console.log("🏁 Verification process completed");
    console.log("=".repeat(50));
  }
});
/* =====================================================
   🔄 CASHFREE WEBHOOK HANDLER
===================================================== */
router.post(
  "/cashfree-webhook",
  express.json({ type: "*/*" }),
  async (req, res) => {
    try {
      console.log("🔔 Cashfree webhook received");

      const event = req.body;
      console.log("Webhook payload:", JSON.stringify(event, null, 2));

      // 1️⃣ Validate event type
      const eventType = event.type;
      if (!eventType) {
        return res.status(200).json({ received: true });
      }

      // 2️⃣ Extract order + payment info
      const orderId = event?.data?.order?.order_id;
      const orderStatus = event?.data?.order?.order_status;
      const paymentStatus = event?.data?.payment?.payment_status;

      console.log("Webhook parsed:", {
        eventType,
        orderId,
        orderStatus,
        paymentStatus,
      });

      // 3️⃣ Process only SUCCESS / PAID events
      if (
        orderId &&
        (orderStatus === "PAID" || paymentStatus === "SUCCESS")
      ) {
        console.log("✅ Payment successful via webhook for:", orderId);

        // OPTIONAL: double-verify with Cashfree API
        const orderRes = await Cashfree.PGFetchOrder(
          "2023-08-01",
          orderId
        );

        if (orderRes.data.order_status !== "PAID") {
          console.warn("⚠️ Order not PAID on fetch, skipping");
          return res.status(200).json({ received: true });
        }

        // 🔑 FIND TEMP AGENT FILE
        const tempFiles = fs.readdirSync(TEMP_AGENTS_DIR);
        const tempFileName = tempFiles.find(f =>
          f.includes(orderId.split("_").pop())
        );

        if (!tempFileName) {
          console.warn("⚠️ Temp agent file not found for order:", orderId);
          return res.status(200).json({ received: true });
        }

        const tempPath = path.join(TEMP_AGENTS_DIR, tempFileName);
        const { pendingAgent } = JSON.parse(fs.readFileSync(tempPath));

        // Prevent duplicate creation
        const existing = await Agent.findOne({ email: pendingAgent.email });
        if (existing) {
          console.log("ℹ️ Agent already exists, skipping create");
          fs.unlinkSync(tempPath);
          return res.status(200).json({ received: true });
        }

        // 🧾 CREATE AGENT
        const newAgent = await Agent.create({
          ...pendingAgent,
          agentId: `AGT-${Date.now().toString().slice(-6)}`,
          subscription: {
            active: true,
            paidAt: new Date(),
            paymentGateway: "cashfree",
            cashfreeOrderId: orderId,
          },
          status: "active",
        });

        fs.unlinkSync(tempPath);

        console.log("🎉 Agent created via webhook:", newAgent._id);
      }

      // ALWAYS return 200
      res.status(200).json({ received: true });
    } catch (err) {
      console.error("❌ Webhook processing error:", err.message);
      res.status(200).json({ received: true }); // never fail webhook
    }
  }
);


/* =====================================================
   🔍 GET PAYMENT STATUS
===================================================== */
router.get("/status/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    
    console.log(`🔵 Getting payment status for ${type}: ${id}`);
    
    if (type === "agent") {
      const agent = await Agent.findById(id);
      if (!agent) return res.status(404).json({ 
        success: false,
        error: "Agent not found" 
      });
      return res.json({ 
        success: true,
        status: agent.subscription.active ? "active" : "inactive",
        paymentGateway: agent.subscription.paymentGateway,
        cashfreeOrderId: agent.subscription.cashfreeOrderId,
        paidAt: agent.subscription.paidAt 
      });
    } else if (type === "provider") {
      const provider = await ServiceProvider.findById(id);
      if (!provider) return res.status(404).json({ 
        success: false,
        error: "Provider not found" 
      });
      return res.json({ 
        success: true,
        status: provider.subscription.active ? "active" : "inactive",
        paymentGateway: provider.subscription.paymentGateway,
        cashfreeOrderId: provider.subscription.cashfreeOrderId,
        paidAt: provider.subscription.paidAt 
      });
    }
    
    res.status(400).json({ 
      success: false,
      error: "Invalid type. Use 'agent' or 'provider'" 
    });
  } catch (err) {
    console.error("❌ Status Check Error:", err.message);
    res.status(500).json({ 
      success: false,
      error: "Status check failed" 
    });
  }
});

/* =====================================================
   📋 GET PAYMENT LINK (Alternative for manual payments)
===================================================== */
router.post("/create-payment-link", express.json(), async (req, res) => {
  try {
    console.log("🔵 Create payment link request received");
    
    const { 
      customer_name, 
      customer_email, 
      customer_phone,
      amount = 1500,
      purpose = "Registration Fee"
    } = req.body;

    if (!customer_email || !customer_phone) {
      return res.status(400).json({ 
        success: false,
        error: "Customer email and phone are required" 
      });
    }

    const linkId = `LINK_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Build return URL
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    let returnUrl = `${clientUrl}/payment-success`;
    
    // For production, ensure HTTPS
    if (process.env.CASHFREE_ENV === "PROD") {
      returnUrl = ensureHttpsForProduction(returnUrl);
    }
    
    // Create payment link using Cashfree
    const response = await Cashfree.PGCreateLink("2023-08-01", {
      link_id: linkId,
      link_amount: amount,
      link_currency: "INR",
      link_purpose: purpose,
      customer_details: {
        customer_name: customer_name || "Customer",
        customer_email,
        customer_phone,
      },
      link_notify: {
        send_sms: true,
        send_email: true,
      },
      link_meta: {
        return_url: returnUrl,
      },
      link_expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });

    console.log("✅ Payment link created:", linkId);

    return res.json({
      success: true,
      payment_link: response.data.link_url,
      link_id: linkId,
      expires_at: response.data.link_expiry_time,
    });
  } catch (err) {
    console.error("❌ Payment Link Error:", err.message);
    res.status(500).json({ 
      success: false,
      error: "Failed to create payment link" 
    });
  }
});

/* =====================================================
   🔄 CLEANUP TEMP FILES (Cron job endpoint)
===================================================== */
router.post("/cleanup-temp-files", async (req, res) => {
  try {
    console.log("🔵 Cleaning up temp files");
    
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    let agentCleaned = 0;
    let providerCleaned = 0;
    
    // Cleanup agent temp files
    if (fs.existsSync(TEMP_AGENTS_DIR)) {
      const agentFiles = fs.readdirSync(TEMP_AGENTS_DIR);
      agentFiles.forEach(file => {
        const filePath = path.join(TEMP_AGENTS_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
            agentCleaned++;
          }
        } catch (err) {
          console.error(`⚠️ Error cleaning agent file ${file}:`, err.message);
        }
      });
    }
    
    // Cleanup provider temp files
    if (fs.existsSync(TEMP_PROVIDERS_DIR)) {
      const providerFiles = fs.readdirSync(TEMP_PROVIDERS_DIR);
      providerFiles.forEach(file => {
        const filePath = path.join(TEMP_PROVIDERS_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
            providerCleaned++;
          }
        } catch (err) {
          console.error(`⚠️ Error cleaning provider file ${file}:`, err.message);
        }
      });
    }
    
    console.log(`✅ Cleanup complete: ${agentCleaned} agent files, ${providerCleaned} provider files`);
    
    res.json({
      success: true,
      message: "Temp files cleaned up",
      agent_files_cleaned: agentCleaned,
      provider_files_cleaned: providerCleaned,
      total_cleaned: agentCleaned + providerCleaned
    });
  } catch (err) {
    console.error("❌ Cleanup Error:", err.message);
    res.status(500).json({ 
      success: false,
      error: "Cleanup failed" 
    });
  }
});

/* =====================================================
   🧪 TEST ENDPOINT
===================================================== */
router.get("/test-config", (req, res) => {
  res.json({
    success: true,
    data: {
      cashfreeEnv: process.env.CASHFREE_ENV || "Not set",
      backendUrl: process.env.BACKEND_URL || "Not set",
      clientUrl: process.env.CLIENT_URL || "Not set",
      subscriptionAmount: process.env.SUBSCRIPTION_AMOUNT_INR || 1500,
      cashfreeAppId: process.env.CASHFREE_APP_ID ? "Set" : "Not set",
      cashfreeSecretKey: process.env.CASHFREE_SECRET_KEY ? "Set" : "Not set",
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || "development"
    }
  });
});

module.exports = router;