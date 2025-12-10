const express = require("express");
const jwt = require("jsonwebtoken");
const path = require("path");
const multer = require("multer");
const { auth } = require("../middleware/auth");
const Agent = require("../models/Agent");
const Property = require("../models/Property");
const Enquiry = require("../models/Enquiry");
const ServiceProvider = require("../models/ServiceProvider");
const crypto = require("crypto");
const sendMail = require("../utils/sendMail");


const router = express.Router();

/* ------------------ MULTER ------------------ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/voterIds"),
  filename: (req, file, cb) =>
    cb(
      null,
      Date.now() +
        "-" +
        Math.floor(Math.random() * 1e9) +
        path.extname(file.originalname)
    ),
});
const upload = multer({ storage });

function generateAgentId() {
  return "AGT-" + Math.floor(1000 + Math.random() * 9000);
}

/* ===========================================================
   🟢 GET ALL AGENTS (Admin only)
   =========================================================== */
router.get("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied" });

    const agents = await Agent.find()
      .select("agentId name email phone commissionPercent createdAt");

    res.json(agents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching agents" });
  }
});

/* ===========================================================
   🟢 REGISTER AGENT (UPDATED)
   =========================================================== */
router.post("/register", upload.single("voterIdFile"), async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      aadhaarNumber,
      panNumber,
      profession,
      bankDetails,
      commissionPercent,

      referralExecutiveName,
      referralExecutiveId, // <-- ADDED
    } = req.body;

    if (await Agent.findOne({ email }))
      return res.status(400).json({ error: "Agent already exists" });

    const voterIdFile = req.file
      ? `/uploads/voterIds/${req.file.filename}`
      : null;

    const newAgent = new Agent({
      agentId: generateAgentId(),
      name,
      email,
      phone,
      password,
      aadhaarNumber,
      panNumber,
      profession,
      voterIdFile,
      bankDetails,
      commissionPercent,

      referralExecutiveName,
      referralExecutiveId, // <-- STORE MEID
    });

    await newAgent.save();

    res.json({
      message: "Agent registered successfully",
      agent: {
        _id: newAgent._id,
        agentId: newAgent.agentId,
        name: newAgent.name,
        email: newAgent.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration error" });
  }
});

/* ===========================================================
   🟢 LOGIN AGENT
   =========================================================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const agent = await Agent.findOne({ email });
    if (!agent) return res.status(400).json({ error: "Invalid credentials" });

    const match = await agent.comparePassword(password);
    if (!match)
      return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: agent._id, role: "agent" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      agent: {
        _id: agent._id,
        agentId: agent.agentId,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        commissionPercent: agent.commissionPercent,
        subscription: agent.subscription,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Login error" });
  }
});
/* ===========================================================
   ✅ FORGOT PASSWORD
   =========================================================== */
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ error: "Email is required" });

    const agent = await Agent.findOne({ email });
    if (!agent)
      return res.status(404).json({ error: "Email not registered" });

    // ✅ Generate reset token
    const token = crypto.randomBytes(32).toString("hex");

    agent.resetToken = token;
    agent.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    await agent.save();

    // ✅ Create reset link
    const resetLink =
      `${process.env.CLIENT_URL}/agent-reset-password/${token}`;

    // ✅ SEND EMAIL
    await sendMail({
      to: agent.email,
      subject: "Agent Password Reset",
      html: `
        <h3>Password Reset</h3>
        <p>Click below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    res.json({
      success: true,
      message: "Reset link sent to your email",
    });

  } catch (err) {
    next(err); // ✅ handled by global errorHandler
  }
});

/* ===========================================================
   ✅ RESET PASSWORD
   =========================================================== */
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password)
      return res.status(400).json({ error: "Password is required" });

    const agent = await Agent.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!agent)
      return res.status(400).json({ error: "Invalid or expired token" });

    agent.password = password; // ✅ auto-hashes via schema
    agent.resetToken = undefined;
    agent.resetTokenExpiry = undefined;
    await agent.save();

    res.json({
      success: true,
      message: "Password reset successful",
    });

  } catch (err) {
    console.error("AGENT RESET ERROR:", err);
    res.status(500).json({ error: "Reset password failed" });
  }
});



/* ===========================================================
   🟢 GET PROPERTIES OF AGENT
   =========================================================== */
router.get("/:id/properties", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const props = await Property.find({
      $or: [
        { agent: req.params.id },
        { owner: req.params.id }
      ]
    })
      .populate("agent", "_id name email")
      .populate("owner", "_id name email")
      .sort({ createdAt: -1 });

    res.json(props);
  } catch (err) {
    console.error("Agent properties error:", err);
    res.status(500).json({ error: "Error loading properties" });
  }
});

/* ===========================================================
   🟢 GET REFERRED SERVICE PROVIDERS
   =========================================================== */
router.get("/referred-service-providers", auth, async (req, res) => {
  try {
    if (req.user.role !== "agent") {
      return res.status(403).json({ error: "Agent access only" });
    }

    const list = await ServiceProvider.find({
      referralAgent: req.user.id
    })
      .select("name email phone serviceCategory status createdAt");

    res.json(list);
  } catch (err) {
    console.error("Referral fetch error:", err);
    res.status(500).json({ error: "Failed to fetch referral list" });
  }
});

/* ===========================================================
   🟢 GET ENQUIRIES OF AGENT
   =========================================================== */
router.get("/:id/enquiries", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const enqs = await Enquiry.find({ agent: req.params.id })
      .populate("property", "title price areaName")
      .sort({ createdAt: -1 });

    res.json(enqs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error loading enquiries" });
  }
});

/* ===========================================================
   🟢 GET SINGLE AGENT
   =========================================================== */
router.get("/:id", auth, async (req, res) => {
  try {
    const uid = req.user._id || req.user.id;

    if (req.user.role !== "admin" && uid !== req.params.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const agent = await Agent.findById(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: "Error fetching agent" });
  }
});
/* ===========================================================
   🟢 GET AGENTS REFERRED BY MARKETING EXECUTIVE
   =========================================================== */
router.get("/referred-agents", auth, async (req, res) => {
  try {
    if (req.user.role !== "marketingExecutive") {
      return res.status(403).json({ error: "Access denied" });
    }

    // ⭐ This is the correct ME identifier from token
    const marketingId = req.user.meid; // Example: "ME-49157"

    const agents = await Agent.find({
      referralMarketingExecutiveId: marketingId
    }).select("name email phone agentId profession createdAt");

    return res.json({ success: true, agents });
  } catch (err) {
    console.error("Fetch referred agents error:", err);
    res.status(500).json({ error: "Failed to load referred agents" });
  }
});

// UPDATE agent (admin only)
router.delete("/agents/:id", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Admin only" });

    await Agent.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Agent deleted" });
  } catch (err) {
    console.error("ADMIN DELETE ERROR:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// UPDATE AGENT (Admin only)
router.put("/agents/:id", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Admin only" });

    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(agent);
  } catch (err) {
    console.error("ADMIN UPDATE ERROR:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

module.exports = router;
