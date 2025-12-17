// server/src/routes/serviceProviders.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const jwt = require("jsonwebtoken");

const ServiceProvider = require("../models/ServiceProvider");
const Service = require("../models/Service");
const ServiceEnquiry = require("../models/ServiceEnquiry");
const { auth } = require("../middleware/auth");

const router = express.Router();
const { sendWelcomeEmail } = require("../utils/emailTemplates");
const { sendServiceEnquiryEmail } = require("../utils/emailTemplates");





/* =============================================================================
   📁 Ensure folders exist
============================================================================= */
const DOCS_DIR = "uploads/service-docs";
const IMG_DIR = "uploads/service-images";
const TEMP_DIR = "uploads/tempProviders";

[DOCS_DIR, IMG_DIR, TEMP_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* =============================================================================
   📤 Multer for documents
============================================================================= */
const docsStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, DOCS_DIR),
  filename: (_, file, cb) => {
    cb(
      null,
      Date.now() +
        "-" +
        crypto.randomBytes(6).toString("hex") +
        path.extname(file.originalname)
    );
  },
});
const uploadDocs = multer({ storage: docsStorage });

/* =============================================================================
   📤 Multer for service images
============================================================================= */
const imgStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, IMG_DIR),
  filename: (_, file, cb) => {
    cb(
      null,
      Date.now() +
        "-" +
        crypto.randomBytes(6).toString("hex") +
        path.extname(file.originalname)
    );
  },
});
const uploadImages = multer({ storage: imgStorage });

/* =============================================================================
   🧹 Helper — Delete old images
============================================================================= */
function safeDelete(relPath) {
  try {
    if (!relPath) return;
    const abs = path.join(process.cwd(), relPath.replace(/^\//, ""));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {}
}

/* =============================================================================
   ⭐ 1) GET ALL SERVICES (PUBLIC)
============================================================================= */
router.get("/", async (req, res) => {
  try {
    const services = await Service.find()
      .populate("provider", "name email phone serviceCategory");

    res.json(services);
  } catch (err) {
    console.error("SERVICES LIST ERROR:", err);
    res.status(500).json({ error: "Failed to load services" });
  }
});

/* =============================================================================
   ⭐ 2) ALL PROVIDERS
============================================================================= */
router.get("/all-providers", async (req, res) => {
  try {
    const list = await ServiceProvider.find()
      .select("name email phone serviceCategory createdAt");

    res.json(list);
  } catch (err) {
    console.error("ALL PROVIDERS ERROR:", err);
    res.status(500).json({ error: "Failed to load providers" });
  }
});

/* =============================================================================
   ⭐ 3) CREATE ORDER (Docs Upload)
============================================================================= */
router.post(
  "/payments/create-order",
  uploadDocs.fields([
    { name: "aadhar", maxCount: 1 },
    { name: "voter", maxCount: 1 },
    { name: "pan", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
     const {
  name, email, phone, password,
  serviceCategory,
  selectedServices,
  referralAgentId,

  referralMarketingExecutiveName,
  referralMarketingExecutiveId
} = req.body;


      if (!req.files?.aadhar || !req.files?.voter)
        return res
          .status(400)
          .json({ error: "Aadhar and Voter ID are required" });

      const tempId = crypto.randomBytes(12).toString("hex");

      const data = {
        tempId,
       provider: {
  name,
  email,
  phone,
  password,
  serviceCategory,
  selectedServices: selectedServices ? JSON.parse(selectedServices) : [],
  referralAgentId: referralAgentId || null,

  // ⭐ NEW FIELDS
  referralMarketingExecutiveName,
  referralMarketingExecutiveId,
        },
        files: {
          aadhar: `/${DOCS_DIR}/${req.files.aadhar[0].filename}`,
          voter: `/${DOCS_DIR}/${req.files.voter[0].filename}`,
          pan: req.files.pan
            ? `/${DOCS_DIR}/${req.files.pan[0].filename}`
            : null,
        },
      };

      fs.writeFileSync(
        path.join(TEMP_DIR, `${tempId}.json`),
        JSON.stringify(data, null, 2)
      );

      res.json({ success: true, tempId });

    } catch (err) {
      console.error("ORDER CREATE ERROR:", err);
      res.status(500).json({ error: "Order creation failed" });
    }
  }
);

/* =============================================================================
   ⭐ 4) VERIFY PAYMENT -> CREATE ACCOUNT
============================================================================= */
router.post("/payments/verify", async (req, res) => {
  try {
    const { tempId } = req.body;

    const tempFile = path.join(TEMP_DIR, `${tempId}.json`);
    if (!fs.existsSync(tempFile))
      return res.status(400).json({ error: "Temp data missing" });

    const temp = JSON.parse(fs.readFileSync(tempFile));

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(temp.provider.password, 10);

    // 🧑 Create provider
    const provider = new ServiceProvider({
      name: temp.provider.name,
      email: temp.provider.email,
      phone: temp.provider.phone,
      password: hashedPassword,
      serviceCategory: temp.provider.serviceCategory,
      serviceTypes: temp.provider.selectedServices,
      referralAgent: temp.provider.referralAgentId,
      referralMarketingExecutiveName:
        temp.provider.referralMarketingExecutiveName || null,
      referralMarketingExecutiveId:
        temp.provider.referralMarketingExecutiveId || null,
      documents: temp.files,
      status: "active",
      subscription: {
        active: true,
        paidAt: new Date(),
      },
    });

    // 💾 Save provider
    await provider.save();
    console.log("✅ Provider saved with ID:", provider._id);

    // 📧 SEND WELCOME EMAIL
    let emailSent = false;
    let emailError = null;
    
    try {
      console.log("📧 Sending welcome email to:", provider.email);
      
      // Call the sendWelcomeEmail function
      const emailResult = await sendWelcomeEmail({
        to: provider.email,
        name: provider.name,
        role: "service-provider",
      });
      
      console.log("✅ Email sending result:", emailResult);
      emailSent = true;
      console.log("✅ Welcome email sent successfully to:", provider.email);
      
    } catch (mailErr) {
      emailError = mailErr.message;
      console.error("❌ Welcome email failed:");
      console.error("Error Message:", mailErr.message);
      console.error("Error Stack:", mailErr.stack);
      
      // Don't fail the whole process if email fails
      console.log("⚠️ Continuing registration despite email failure");
    }

    // 🧹 Cleanup temp file
    try {
      fs.unlinkSync(tempFile);
      console.log("✅ Temp file cleaned up:", tempFile);
    } catch (cleanupErr) {
      console.error("⚠️ Temp file cleanup failed:", cleanupErr.message);
    }

    // 📤 Response
    res.json({
      success: true,
      providerId: provider._id,
      email: provider.email,
      emailSent,
      emailError: emailError || undefined,
      message: emailSent 
        ? "Registration successful! Welcome email sent."
        : "Registration successful! Welcome email failed but account created."
    });

  } catch (err) {
    console.error("❌ VERIFY ERROR:");
    console.error("Error Message:", err.message);
    console.error("Error Stack:", err.stack);
    res.status(500).json({ 
      error: "Verification failed",
      details: err.message 
    });
  }
});

/* =============================================================================
   ⭐ 5) LOGIN
============================================================================= */
router.post("/login", async (req, res) => {
  try {
    const provider = await ServiceProvider.findOne({ email: req.body.email });
    if (!provider)
      return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(req.body.password, provider.password);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: provider._id, role: "service" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, provider });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* =============================================================================
   ⭐ 6) MY PROFILE
============================================================================= */
router.get("/me", auth, async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.user.id).select(
      "-password"
    );
    res.json(provider);
  } catch (err) {
    res.status(500).json({ error: "Failed to load profile" });
  }
});

/* =============================================================================
   ⭐ 7) CREATE SERVICE  (UPDATED WITH CITY)
============================================================================= */
router.post("/service", auth, uploadImages.array("images", 10), async (req, res) => {
  try {
    if (req.user.role !== "service")
      return res.status(403).json({ error: "Unauthorized" });

    const images = req.files.map((f) => `/${IMG_DIR}/${f.filename}`);

    const service = new Service({
      provider: req.user.id,
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      images,

      // ⭐ NEW CITY FIELD
      city: req.body.city,
      
      location: {
        address: req.body.address,
        lat: req.body.lat,
        lng: req.body.lng,
      }
    });

    await service.save();

    res.json({ success: true, service });

  } catch (err) {
    console.error("SERVICE CREATE ERROR:", err);
    res.status(500).json({ error: "Service upload failed" });
  }
});

/* =============================================================================
   ⭐ 8) UPDATE SERVICE (UPDATED WITH CITY)
============================================================================= */
router.put("/service/:id", auth, uploadImages.array("images", 10), async (req, res) => {
  try {
    if (req.user.role !== "service")
      return res.status(403).json({ error: "Unauthorized" });

    const service = await Service.findById(req.params.id);
    if (!service)
      return res.status(404).json({ error: "Service Not Found" });

    // 🟩 KEEP OLD CITY IF NOT SENT (fixing your validation error)
    service.city = req.body.city || service.city;

    // Update basic fields
    service.title = req.body.title || service.title;
    service.description = req.body.description || service.description;
    service.price = req.body.price || service.price;

    // Update address
    if (req.body.address) service.location.address = req.body.address;
    if (req.body.lat) service.location.lat = req.body.lat;
    if (req.body.lng) service.location.lng = req.body.lng;

    // 🟩 Handle new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((f) => `/${IMG_DIR}/${f.filename}`);
      service.images.push(...newImages);
    }

    await service.save();

    res.json({ success: true, service });

  } catch (err) {
    console.error("SERVICE UPDATE ERROR:", err);
    res.status(500).json({ error: "Service update failed" });
  }
});


/* =============================================================================
   ⭐ 9) DELETE SERVICE
============================================================================= */
router.delete("/service/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "service")
      return res.status(403).json({ error: "Unauthorized" });

    const s = await Service.findById(req.params.id);
    if (!s) return res.status(404).json({ error: "Service not found" });

    s.images.forEach(safeDelete);
    await s.deleteOne();

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

/* =============================================================================
   ⭐ 10) MY SERVICES
============================================================================= */
router.get("/my-services", auth, async (req, res) => {
  try {
    const list = await Service.find({ provider: req.user.id });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to load" });
  }
});

/* =============================================================================
   ⭐ 11) ADMIN — LIST PROVIDERS
============================================================================= */
router.get("/admin/list", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Admin only" });

    const list = await ServiceProvider.find().select("-password");

    res.json(list);

  } catch (err) {
    console.error("ADMIN LIST PROVIDERS ERROR:", err);
    res.status(500).json({ error: "Failed to load providers" });
  }
});


/* =============================================================================
   ⭐ 12) SERVICE ENQUIRIES
============================================================================= */
router.post("/service/enquiry", async (req, res) => {
  try {
    const { serviceId, name, phone, message } = req.body;

    const s = await Service.findById(serviceId).populate("provider");
    if (!s) return res.status(404).json({ error: "Service not found" });

    const enquiry = new ServiceEnquiry({
      service: s._id,
      provider: s.provider._id,
      name,
      phone,
      message,
    });

    await enquiry.save();

    // ✅ SEND EMAIL TO SERVICE PROVIDER (OR ADMIN)
await sendServiceEnquiryEmail({
  to: s.provider.email,
  title: s.title,
  name,
  phone,
  message,
});



    res.json({ success: true });

  } catch (err) {
    console.error("SERVICE ENQUIRY ERROR:", err);
    res.status(500).json({ error: "Failed to submit enquiry" });
  }
});

/* =============================================================================
   ⭐ 13) PROVIDER'S ENQUIRIES
============================================================================= */
router.get("/my-service-enquiries", auth, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "service") {
      // Service Provider → Only their enquiries
      filter.provider = req.user.id;
    }
    else if (req.user.role === "admin") {
      // Admin → ALL enquiries
      filter = {};
    }
    else {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const list = await ServiceEnquiry.find(filter)
      .populate("service", "title price images")
      .sort({ createdAt: -1 });

    res.json(list);

  } catch (err) {
    console.error("MY SERVICE ENQUIRIES ERROR:", err);
    res.status(500).json({ error: "Failed to load enquiries" });
  }
});


/* =============================================================================
   ⭐ 14) GET PROVIDER BY ID
============================================================================= */
router.get("/:id", async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id).select(
      "-password"
    );

    if (!provider)
      return res.status(404).json({ error: "Provider not found" });

    res.json(provider);
  } catch (err) {
    res.status(500).json({ error: "Error fetching provider" });
  }
});
/* =============================================================================
   ⭐ GET ALL SERVICES FOR A PROVIDER (PUBLIC ROUTE)
============================================================================= */
router.get("/:id/services", async (req, res) => {
  try {
    const providerId = req.params.id;

    const services = await Service.find({ provider: providerId })
      .select("title price description images city createdAt");

    res.json(services);

  } catch (err) {
    console.error("GET PROVIDER SERVICES ERROR:", err);
    res.status(500).json({ error: "Failed to load services" });
  }
});

/* =============================================================================
   ⭐ 12) ADMIN — UPDATE PROVIDER
============================================================================= */
router.put("/admin/:id", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Admins only" });

    const updated = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Provider not found" });

    res.json({ message: "Provider updated", provider: updated });
  } catch {
    res.status(500).json({ error: "Update failed" });
  }
});

/* =============================================================================
   ⭐ 13) ADMIN — DELETE PROVIDER
============================================================================= */
router.delete("/admin/:id", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin)
      return res.status(403).json({ error: "Admins only" });

    const deleted = await ServiceProvider.findByIdAndDelete(req.params.id);

    if (!deleted) return res.status(404).json({ error: "Provider not found" });

    res.json({ message: "Provider deleted" });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});


router.get("/service/:id", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate("provider");
    if (!service)
      return res.status(404).json({ message: "Service Not Found" });

    res.json(service);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});


router.get("/dashboard", auth, async (req, res) => {
  try {
    // Must be service provider
    if (req.user.role !== "service")
      return res.status(403).json({ message: "Unauthorized" });

    // Load provider
    const provider = await ServiceProvider.findById(req.user.id);
    if (!provider)
      return res.status(404).json({ message: "Provider not found" });

    // Load provider services
    const services = await Service.find({ provider: req.user.id }).sort({
      createdAt: -1,
    });

    // Enquiries model is required!!
    const Enquiry =
      require("../models/Enquiry"); // MUST ADD THIS IN YOUR FILE

    // Load enquiries for provider services
    const enquiries = await Enquiry.find({
      service: { $in: services.map((s) => s._id) },
    }).sort({ createdAt: -1 });

    res.json({
      provider,
      services,
      enquiries,
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.status(500).json({ message: "Dashboard error" });
  }
});


router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await ServiceProvider.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "Email not found" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;
  user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

     const resetLink =
      `${process.env.CLIENT_URL}/service-reset-password/${token}`;

    await sendMail({
      to: email,
      subject: "Reset Service Provider Password",
      html: `
        <p>Click below to reset password:</p>
        <a href="${resetLink}">${resetLink}</a>
      `,
    });

    return res.json({ success: true });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: "Failed to send reset link" });
  }
});

router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body; // ✅ THIS WAS MISSING

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const user = await ServiceProvider.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    user.password = password; // ✅ let pre-save hook hash it
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Reset failed" });
  }
});


module.exports = router;
