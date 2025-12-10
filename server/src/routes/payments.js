const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const Agent = require("../models/Agent");
const ServiceProvider = require("../models/ServiceProvider");

const router = express.Router();

/* =====================================================
   📁 Upload Folders
===================================================== */
const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");
const AGENT_DOCS_DIR = path.join(UPLOADS_ROOT, "agent-docs");
const SERVICE_DOCS_DIR = path.join(UPLOADS_ROOT, "service-docs");
const TEMP_AGENTS_DIR = path.join(UPLOADS_ROOT, "tempAgents");
const TEMP_PROVIDERS_DIR = path.join(UPLOADS_ROOT, "tempProviders");

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

ensureDir(UPLOADS_ROOT);
ensureDir(AGENT_DOCS_DIR);
ensureDir(SERVICE_DOCS_DIR);
ensureDir(TEMP_AGENTS_DIR);
ensureDir(TEMP_PROVIDERS_DIR);

/* =====================================================
   💳 Razorpay Setup
===================================================== */
const rz = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* =====================================================
   🔐 Signature Verification
===================================================== */
function verifySignature(orderId, paymentId, signature) {
  const calc = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + "|" + paymentId)
    .digest("hex");

  return calc === signature;
}

/* =====================================================
   1️⃣ AGENT — Create Subscription Order
===================================================== */
router.post("/agent/create-order", express.json(), async (req, res) => {
  try {
    const pendingAgent = req.body.pendingAgent;

    if (!pendingAgent)
      return res.status(400).json({ error: "Missing agent data" });

    const tempId = crypto.randomBytes(10).toString("hex");

    fs.writeFileSync(
      path.join(TEMP_AGENTS_DIR, `${tempId}.json`),
      JSON.stringify({ tempId, pendingAgent })
    );

    const order = await rz.orders.create({
      amount: 1500 * 100,
      currency: "INR",
      receipt: "agent_" + tempId,
    });

    res.json({
      success: true,
      tempId,
      order,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Agent Order Error:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
});
/* =====================================================
   2️⃣ AGENT — Verify Payment + Save to DB
===================================================== */
router.post("/agent/verify", express.json(), async (req, res) => {
  try {
    const {
      tempId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      voterIdBase64
    } = req.body;

    if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature))
      return res.status(400).json({ error: "Invalid signature" });

    const tempFile = path.join(TEMP_AGENTS_DIR, `${tempId}.json`);
    if (!fs.existsSync(tempFile))
      return res.status(400).json({ error: "Temp data not found" });

    const savedData = JSON.parse(fs.readFileSync(tempFile));
    const a = savedData.pendingAgent;

    /* =====================================================
       ⭐ PREVENT DUPLICATE EMAIL CRASH
    ===================================================== */
    const existingAgent = await Agent.findOne({ email: a.email });

    if (existingAgent) {
      try { fs.unlinkSync(tempFile); } catch {}
      return res.json({
        success: true,
        message: "Account already exists",
        agentId: existingAgent._id,
      });
    }

    /* --------------------------------------------
       SAVE VOTER CARD (BASE64 → PNG file)
    -------------------------------------------- */
    let voterPath = null;

    if (voterIdBase64) {
      const base64 = voterIdBase64.replace(/^data:image\/\w+;base64,/, "");
      const fileName = `voter-${Date.now()}.png`;

      voterPath = `uploads/agent-docs/${fileName}`;
      fs.writeFileSync(
        path.join(AGENT_DOCS_DIR, fileName),
        Buffer.from(base64, "base64")
      );
    }

    /* --------------------------------------------
       CREATE NEW AGENT DOCUMENT
    -------------------------------------------- */
    const newAgent = new Agent({
      agentId: "AGT-" + Math.floor(1000 + Math.random() * 9000),
      name: a.name,
      email: a.email,
      phone: a.phone,
      password: a.password,
      profession: a.profession,

      referralMarketingExecutiveName: a.referralMarketingExecutiveName || null,
      referralMarketingExecutiveId: a.referralMarketingExecutiveId || null,

      documents: {
        voterId: voterPath,
      },

      subscription: {
        active: true,
        paidAt: new Date(),
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    await newAgent.save();
    fs.unlinkSync(tempFile);

    return res.json({ success: true, agentId: newAgent._id });
  } catch (err) {
    console.error("Agent Verify Error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

/* =====================================================
   3️⃣ SERVICE PROVIDER — Create Order
===================================================== */
router.post(
  "/service-provider/create-order",
  require("multer")({
    storage: require("multer").diskStorage({
      destination: (_, __, cb) => cb(null, SERVICE_DOCS_DIR),
      filename: (_, file, cb) =>
        cb(
          null,
          Date.now() +
            "-" +
            Math.floor(Math.random() * 1e6) +
            path.extname(file.originalname)
        ),
    }),
  }).fields([
    { name: "aadhar", maxCount: 1 },
    { name: "voter", maxCount: 1 },
    { name: "pan", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
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

      if (!name || !email || !phone || !password)
        return res.status(400).json({ error: "Missing fields" });

      const tempId = crypto.randomBytes(10).toString("hex");

      fs.writeFileSync(
        path.join(TEMP_PROVIDERS_DIR, `${tempId}.json`),
        JSON.stringify(
          {
            tempId,
            provider: {
              name,
              email,
              phone,
              password,
              serviceCategory,
              selectedServices: selectedServices
                ? JSON.parse(selectedServices)
                : [],

              referralName,
              referralEmail,

              // ⭐ NEW
              referralMarketingExecutiveName,
              referralMarketingExecutiveId,
            },
            files: {
              aadhar: `uploads/service-docs/${req.files.aadhar[0].filename}`,
              voterId: `uploads/service-docs/${req.files.voter[0].filename}`,
              pan: req.files.pan
                ? `uploads/service-docs/${req.files.pan[0].filename}`
                : null,
            },
          },
          null,
          2
        )
      );

      const order = await rz.orders.create({
        amount: 1500 * 100,
        currency: "INR",
        receipt: "sp_" + tempId,
      });

      return res.json({
        success: true,
        tempId,
        order,
        key_id: process.env.RAZORPAY_KEY_ID,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Provider order failed" });
    }
  }
);

/* =====================================================
   4️⃣ SERVICE PROVIDER — Verify Payment
===================================================== */
router.post("/service-provider/verify", express.json(), async (req, res) => {
  try {
    const { tempId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (
      !verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      )
    )
      return res.status(400).json({ error: "Invalid signature" });

    const file = path.join(TEMP_PROVIDERS_DIR, `${tempId}.json`);
    if (!fs.existsSync(file))
      return res.status(400).json({ error: "Temp registration not found" });

    const tempData = JSON.parse(fs.readFileSync(file));
    const p = tempData.provider;

    // ⭐ Prevent duplicate email crash
    const existing = await ServiceProvider.findOne({ email: p.email });

    if (existing) {
      try {
        fs.unlinkSync(file);
      } catch {}
      return res.json({
        success: true,
        message: "Account already exists",
        providerId: existing._id,
      });
    }

    const provider = new ServiceProvider({
      ...p,
      serviceTypes: p.selectedServices,
      documents: tempData.files,

      referral: {
        name: p.referralName,
        email: p.referralEmail,
      },

      // ⭐ SAVE ME REFERRAL
      referralMarketingExecutiveName: p.referralMarketingExecutiveName || null,
      referralMarketingExecutiveId: p.referralMarketingExecutiveId || null,

      status: "active",
      subscription: {
        active: true,
        paidAt: new Date(),
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    await provider.save();
    fs.unlinkSync(file);

    return res.json({ success: true, providerId: provider._id });
  } catch (err) {
    console.error("Verify provider failed", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

module.exports = router;
