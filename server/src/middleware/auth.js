const jwt = require("jsonwebtoken");
const Agent = require("../models/Agent");
const ServiceProvider = require("../models/ServiceProvider");
const MarketingExecutive = require("../models/MarketingExecutive");

async function auth(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    const publicRoutes = [
      "/agents/login",
      "/agents/register",
      "/agents/forgot-password",
      "/agents/reset-password",

      "/agents/renewal/verify-email",
      "/agents/renewal/create-order",
      "/agents/renewal/verify-payment",

      "/service-provider/login",
      "/service-provider/register",
      "/service-provider/forgot-password",
      "/service-provider/reset-password",

      "/service-provider/renewal/verify-email",
      "/service-provider/renewal/create-order",
      "/service-provider/renewal/verify-payment",

      "/marketing-executive/login",
      "/admin/login", // Add admin login to public routes if you have one
    ];

    const isPublic = publicRoutes.some(
      (route) => req.originalUrl.startsWith(`/api${route}`)
    );

    if (isPublic) {
      console.log("🔓 Public route:", req.originalUrl);
      return next();
    }

    if (!token) {
      console.log("❌ No token for:", req.originalUrl);
      return res.status(401).json({ error: "No token provided" });
    }

    // ✅ VERIFY TOKEN
    console.log("🔐 Verifying token for:", req.originalUrl);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Decoded token role:", decoded.role);

    let user = null;

    // 🔥 FIX 1: Handle "marketingExecutive" role (your login uses this)
    if (decoded.role === "marketingExecutive") {
      console.log("👔 Processing marketing executive");
      user = await MarketingExecutive.findById(decoded.id);
      
      if (!user) {
        console.log("❌ Marketing executive not found in DB");
        return res.status(401).json({ error: "User not found" });
      }
      
      req.user = {
        id: decoded.id,
        role: "marketingExecutive",  // Keep consistent
        isMarketing: true,
        isAgent: false,
        isService: false,
        isAdmin: true,
      };
      console.log("✅ Marketing executive authenticated:", req.user.id);
    }
    // 🔥 FIX 2: Also check for "marketing" for backward compatibility
    else if (decoded.role === "marketing") {
      console.log("👔 Processing marketing (legacy)");
      user = await MarketingExecutive.findById(decoded.id);
      req.user = {
        id: decoded.id,
        role: "marketing",
        isMarketing: true,
        isAgent: false,
        isService: false,
        isAdmin: true,
      };
    }
    else if (decoded.role === "agent") {
      user = await Agent.findById(decoded.id).select("subscription");
      req.user = {
        id: decoded.id,
        role: "agent",
        isAgent: true,
        isService: false,
        isAdmin: false,
        subscription: user?.subscription,
      };
    }
    else if (decoded.role === "service-provider" || decoded.role === "service") {
      user = await ServiceProvider.findById(decoded.id).select("subscription");
      req.user = {
        id: decoded.id,
        role: "service",
        originalRole: decoded.role,
        isAgent: false,
        isService: true,
        isAdmin: false,
        subscription: user?.subscription,
      };
    }
    // ✅ ADD THIS: Handle admin role
    else if (decoded.role === "admin") {
      console.log("👑 Processing admin user");
      
      // If you have an Admin model, you can fetch it here:
      // user = await Admin.findById(decoded.id);
      // if (!user) {
      //   return res.status(401).json({ error: "Admin not found" });
      // }
      
      // For now, just validate the token has admin role
      req.user = {
        id: decoded.id || 'admin-user',
        role: "admin",
        isAdmin: true,
        isAgent: false,
        isService: false,
        isMarketing: false,
        email: decoded.email,
        name: decoded.name || "Administrator"
      };
      console.log("✅ Admin authenticated:", req.user.id);
    }
    else {
      console.log("❌ Invalid token role:", decoded.role);
      return res.status(401).json({ error: "Invalid token role" });
    }

    console.log("✅ Authenticated:", req.user.role, req.user.id);
    return next();

  } catch (err) {
    console.error("❌ AUTH ERROR:", err.message);
    if (err.name === "JsonWebTokenError") {
      console.error("❌ JWT Error - Check JWT_SECRET:", process.env.JWT_SECRET ? "Exists" : "Missing");
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { auth };