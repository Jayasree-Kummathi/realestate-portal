const jwt = require("jsonwebtoken");
const Agent = require("../models/Agent");
const ServiceProvider = require("../models/ServiceProvider");
const MarketingExecutive = require("../models/MarketingExecutive");

async function auth(req, res, next) {
  try {
    let token = null;

    // Read Bearer token
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    /* ----------------------------------------
       🚫 PUBLIC ROUTES (NO TOKEN REQUIRED)
    ---------------------------------------- */
    const publicRoutes = [
      "/api/agents/login",
      "/api/agents/register",
      "/api/service-provider/login",
      "/api/service-provider/register",
      "/api/service-provider/create-order",
      "/api/payments/service-provider/create-order",
      "/api/payments/service-provider/verify",
      "/api/payments/agent-subscription",
      "/api/payments/agent/verify",
      "/api/marketing-executive/login"
    ];

    if (publicRoutes.includes(req.path)) return next();

    /* ----------------------------------------
       ❌ NO TOKEN
    ---------------------------------------- */
    if (!token) return res.status(401).json({ error: "No token provided" });

    /* ----------------------------------------
       🔐 VERIFY TOKEN
    ---------------------------------------- */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /* ----------------------------------------
       👑 ADMIN  (Works with adminToken)
    ---------------------------------------- */
    if (decoded.role === "admin") {
      req.user = {
        id: "admin",
        role: "admin",
        name: "Portal Admin",
        email: process.env.ADMIN_EMAIL,
        isAdmin: true,
        isAgent: false,
        isService: false,
        isMarketing: false,
        subscription: { active: true },
      };
      return next();
    }

    /* ----------------------------------------
       🟣 SERVICE PROVIDER
    ---------------------------------------- */
    if (decoded.role === "service") {
      const sp = await ServiceProvider.findById(decoded.id).select("-password");
      if (!sp)
        return res.status(401).json({ error: "Service provider not found" });

      req.user = {
        id: sp._id.toString(),
        role: "service",
        name: sp.name,
        email: sp.email,
        isAdmin: false,
        isAgent: false,
        isService: true,
        isMarketing: false,
        subscription: sp.subscription || { active: false },
      };
      return next();
    }

    /* ----------------------------------------
       🟢 AGENT
    ---------------------------------------- */
    if (decoded.role === "agent") {
      const agent = await Agent.findById(decoded.id).select("-password");
      if (!agent)
        return res.status(401).json({ error: "Agent not found" });

      req.user = {
        id: agent._id.toString(),
        role: "agent",
        name: agent.name,
        email: agent.email,
        isAdmin: false,
        isAgent: true,
        isService: false,
        isMarketing: false,
        subscription: agent.subscription || { active: false },
      };
      return next();
    }

    /* ----------------------------------------
       🟡 MARKETING EXECUTIVE
    ---------------------------------------- */
    if (decoded.role === "marketingExecutive") {
      const exec = await MarketingExecutive.findById(decoded.id).select("-password");
      if (!exec)
        return res.status(401).json({ error: "Marketing executive not found" });

      req.user = {
        id: exec._id.toString(),
        role: "marketingExecutive",
        name: exec.name,
        email: exec.email,
        meid: exec.meid,
        isAdmin: false,
        isAgent: false,
        isService: false,
        isMarketing: true,
      };
      return next();
    }

    /* ----------------------------------------
       ❌ INVALID ROLE
    ---------------------------------------- */
    return res.status(401).json({ error: "Invalid role" });

  } catch (err) {
    console.error("AUTH ERROR:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { auth };
